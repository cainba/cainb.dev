import type { RouteHandler, RequestContext } from "../../types"

export class Router {
    private routes: Map<string, RouteHandler> = new Map()

    addRoute(path: string, handler: RouteHandler) {
        this.routes.set(path, handler)
    }

    async handleRequest(context: RequestContext): Promise<Response> {
        const handler = this.routes.get(context.requestUrl.pathname)
        if (handler) {
            return await handler(context)
        }
        return new Response("Not Found", { status: 404 })
    }
}