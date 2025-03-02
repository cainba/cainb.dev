import type { ServeOptions } from "bun"
import type { Middleware, RouteHandler } from "../types"
import type { TlsOptions } from "tls"

export type cbserver = ServeOptions & {
    tls: TlsOptions
    middleware?: Middleware[]
    routers?: Record<string, RouteHandler>
    static?: Record<string, Response | string> // Optional: for serving static files
}