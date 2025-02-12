/**
 * @author @cainba
 * @module @cb/apps/server
 * @description Configurable web server with routing and SSL support
 */

import { Server } from "bun"
import { SSLManager, CF } from "@cb/ssl"
import { KeyStore } from "@cb/store"
import type { RouterConfig, ServerConfig, RouteHandler } from "../types"
/**
 * @class Router
 * @description Handles route registration and matching
 */
class Router {
    private routes: Map<string, RouteHandler> = new Map()
    private paramRoutes: Array<{
        regex: RegExp
        handler: RouteHandler
        paramNames: string[]
    }> = []

    /**
     * @method add
     * @description Register a new route
     */
    add(config: RouterConfig) {
        const { path, handler, method = "GET" } = config
        const routeKey = `${method}:${path}`

        if (path.includes(":")) {
            const paramNames: string[] = []
            const regexPath = path.replace(/:([^/]+)/g, (_, name) => {
                paramNames.push(name)
                return "([^/]+)"
            })
            this.paramRoutes.push({
                regex: new RegExp(`^${regexPath}$`),
                handler,
                paramNames
            })
        } else {
            this.routes.set(routeKey, handler)
        }
    }

    /**
     * @method match
     * @description Find matching route for request
     */
    match(req: Request): { handler: RouteHandler, params: Record<string, string> } | null {
        const url = new URL(req.url)
        const routeKey = `${req.method}:${url.pathname}`

        const handler = this.routes.get(routeKey)
        if (handler) {
            return { handler, params: {} }
        }

        for (const { regex, handler, paramNames } of this.paramRoutes) {
            const match = url.pathname.match(regex)
            if (match) {
                const params: Record<string, string> = {}
                paramNames.forEach((name, i) => {
                    params[name] = match[i + 1]
                })
                return { handler, params }
            }
        }

        return null
    }
}

/**
 * @class WebServer
 * @description Class implementation of the webserver, runs the whole show.
 */
export class WebServer {
    private router: Router = new Router()
    private server: Server | null = null
    private sslManager: SSLManager
    private keyStore: KeyStore
    private config: ServerConfig
    constructor(config: ServerConfig = {}) {
        this.config = {
            port: 3000,
            hostname: "0.0.0.0",
            development: process.env.NODE_ENV !== "production",
            cors: false,
            staticDir: "./public",
            ...config
        }

        this.keyStore = new KeyStore()
        this.keyStore.local = {
            keysDir: `${process.env.HOME}/.keys/web`,
            applicationDir: process.cwd()
        }

        if (config.ssl?.enabled) {
            this.sslManager = new SSLManager(
                config.ssl.cloudflare,
                this.keyStore
            )
        }
    }

    /**
     * @method initialize
     * @description Initialize all required services
     */
    async initialize(): Promise<void> {
        await this.initKeyStore()

        if (this.config.ssl?.enabled) {
            await this.initSSL()
        }
    }

    /**
     * @method initKeyStore
     * @description Initialize the key store
     */
    private async initKeyStore(): Promise<void> {
        try {
            await this.keyStore.init()
        } catch (error) {
            throw new Error(`Failed to initialize key store: ${error.message}`)
        }
    }

    /**
     * @method initSSL
     * @description Initialize SSL if enabled
     */
    private async initSSL(): Promise<void> {
        if (!this.sslManager) {
            throw new Error("SSL manager not initialized")
        }

    }
    /**
     * @method start
     * @description Start the server with initialization
     */
    async start(): Promise<Server> {
        await this.initialize()
        this.server = Bun.serve(this.getServeOptions())
        console.log(`Server running at ${this.server.url}`)
        return this.server
    }
    /**
     * @method handleRequest
     * @description Main request handler for all incoming HTTP requests
     * @private
     */
    private async handleRequest(req: Request, server: Server): Promise<Response> {
        try {
            if (this.config.cors && req.method === "OPTIONS") {
                return new Response(null, {
                    headers: {
                        "Access-Control-Allow-Origin": "*",
                        "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
                        "Access-Control-Allow-Headers": "Content-Type, Authorization",
                        "Access-Control-Max-Age": "86400"
                    }
                })
            }

            const match = this.router.match(req)
            if (match) {
                const { handler, params } = match
                let response = await handler(req, params, server)

                if (this.config.cors) {
                    response = this.addCorsHeaders(response)
                }

                return response
            }

            const staticResponse = await this.handleStaticFile(req)
            if (staticResponse) {
                return this.config.cors ? this.addCorsHeaders(staticResponse) : staticResponse
            }

            return new Response("Not Found", { status: 404 })
        } catch (error) {
            console.error("Request error:", error)
            return new Response(
                `Internal Server Error: ${this.config.development ? error.message : ""}`,
                { status: 500 }
            )
        }
    }

    /**
     * @method handleStaticFile
     * @description Serve static
     * @private
     */
    private async handleStaticFile(req: Request): Promise<Response | null> {
        const url = new URL(req.url)
        const filepath = `${this.config.staticDir}${url.pathname}`

        try {
            const file = Bun.file(filepath)
            const exists = await file.exists()

            if (!exists) {
                return null
            }

            const headers = new Headers({
                "X-Content-Type-Options": "nosniff",
                "X-Frame-Options": "SAMEORIGIN",
                "Referrer-Policy": "strict-origin-when-cross-origin"
            })

            return new Response(file, { headers })
        } catch {
            return null
        }
    }

    /**
     * @method addCorsHeaders
     * @description Add CORS headers
     * @private
     */
    private addCorsHeaders(response: Response): Response {
        const headers = new Headers(response.headers)
        headers.set("Access-Control-Allow-Origin", "*")
        headers.set("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS")
        headers.set("Access-Control-Allow-Headers", "Content-Type, Authorization")

        return new Response(response.body, {
            status: response.status,
            statusText: response.statusText,
            headers
        })
    }

    /**
 * @method getServeOptions
 * @description Return serve options
 * @private
 */
    private getServeOptions(): Parameters<typeof Bun.serve>[0] {
        const baseOptions = {
            fetch: (req: Request, server: Server) => this.handleRequest(req, server),
            error: (error: Error) => new Response(`Server Error: ${error.message}`, { status: 500 }),
            development: this.config.development,
            hostname: this.config.hostname,
            port: this.config.port,
            websocket: this.config.websocket
        }

        if (this.config.ssl?.enabled && this.config.tls) {
            return {
                ...baseOptions,
                tls: this.config.tls
            }
        }

        if (this.config.unix) {
            return {
                ...baseOptions,
                unix: this.config.unix
            }
        }

        return baseOptions
    }

    /**
    * @method reload
    * @description Reloads server configuration
    */
    reload(): void {
        if (this.server) {
            this.server.reload(this.getServeOptions())
        }
    }

    async configureSsl(options: {
        commonName: string
        hostNames: string[]
        validity: number
    }) {
        if (!this.sslManager) {
            throw new Error("SSL not enabled in config")
        }

        console.log("Generating SSL configuration...")

        const { cert, keyName } = await this.sslManager.generateAndStoreCertificate({
            commonName: options.commonName,
            hostNames: options.hostNames,
            requestType: "origin-rsa",
            requestedValidity: options.validity as CF.RequestValidity
        })

        const key = await this.keyStore.getSSLKey(keyName)
        const formattedKey = key.includes("-----BEGIN") ? key : `-----BEGIN PRIVATE KEY-----\n${key}\n-----END PRIVATE KEY-----`
        const formattedCert = cert.result.certificate?.includes("-----BEGIN") ?
            cert.result.certificate :
            `-----BEGIN CERTIFICATE-----\n${cert.result.certificate}\n-----END CERTIFICATE-----`

        console.log("SSL Configuration generated:", {
            hasKey: !!formattedKey,
            hasCert: !!formattedCert,
            keyLength: formattedKey.length,
            certLength: formattedCert?.length
        })

        this.config.tls = {
            key: formattedKey,
            cert: formattedCert
        }

        return cert
    }
    /**
 * @method scheduleKeyRotation
 * @description Schedule automatic key rotation
 */
    async scheduleKeyRotation(intervalDays = 30) {
        if (!this.sslManager) {
            return
        }

        const certs = await this.sslManager.listCertificates(
            this.config.ssl?.zoneId as string
        )

        for (const cert of certs.result) {
            await this.sslManager.scheduleKeyRotation(
                cert.id,
                intervalDays,
                async (error) => {
                    if (error) {
                        console.error("Key rotation failed:", error)
                        return
                    }

                    this.reload()
                }
            )
        }
    }
}