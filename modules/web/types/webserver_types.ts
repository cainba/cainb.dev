import type { ServeOptions } from "bun"
import type { Middleware, RouteHandler } from "../types"

export type cbserver = ServeOptions & {
    middleware?: Middleware[]
    routers?: Record<string, RouteHandler>
    static?: Record<string, Response | string> // Optional: for serving static files
}