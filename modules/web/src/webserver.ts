import type { cbserver, RequestContext } from "../types"
import { MiddlewareManager } from "./middleware/middler"
import { Router } from "./router"
import { type Server } from "bun"

export class CainWebServer {
    private middlewareManager = new MiddlewareManager();
    private router: Router = new Router();
    private server: Server

    constructor(options: cbserver) {
        console.clear()
        if (options.middleware) {
            options.middleware.forEach((middleware) => this.middlewareManager.use(middleware))
        }

        if (options.routers) {
            Object.entries(options.routers).forEach(([path, handler]) => this.router.addRoute(path, handler))
        }
        this.setupProcessHandlers()
    }

    public async handleRequest(req: Request, server: Server): Promise<Response> {
        let reqPerf
        performance.mark("reqPerfStart")
        const reqURL = new URL(req.url)
        const context: RequestContext = {
            request: req,
            requestHeaders: req.headers.toJSON(),
            requestMethod: req.method as "GET" | "POST" | "PUT" | "DELETE" | "PATCH",
            requestBody: req.text(),
            requestQuery: reqURL.searchParams,
            requestUrl: reqURL,
            requestPath: reqURL.pathname,
            requestProcessTime: reqPerf,
            server,
        }
        const middy = await this.middlewareManager.run(context)
        if (middy instanceof Response) return middy
        performance.mark("reqPerfEnd")
        reqPerf = performance.measure("reqPerf", "reqPerfStart", "reqPerfEnd")
        return await this.router.handleRequest(context)
    }

    public async exit(_msg?: string) {
        await this.server.stop(true)
        console.warn(`
            Server was forced to stop!
            ${_msg}
        `)
    }

    public async start(options?: cbserver) {
        this.server = Bun.serve({
            ...options,
            fetch: this.handleRequest.bind(this),
        })
        console.info(`Server started on ${this.server.url}`)
    }

    private setupProcessHandlers(): void {
        process.on("SIGINT", () => this.stop("SIGINT"))
        process.on("SIGTERM", () => this.exit("SIGTERM"))
        process.on("SIGKILL", () => this.exit("SIGKILL"))
        process.on("uncaughtException", (err) => this.exit(`Uncaught Exception: ${err}`))
    }

    public async stop(_msg?: string) {
        console.warn("\nStopping Server. Will wait for all requests to finish...")
        this.server.unref()
        while (this.server.pendingRequests > 0) {
            await new Promise(resolve => setTimeout(resolve, 100))
            console.info(`Waiting for ${this.server.pendingRequests} requests to finish...`)
        }
        console.info("\nAll requests finished, exiting process...")
        process.exit(0)
    }
}