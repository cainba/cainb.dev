import { Server, TLSOptions, WebSocketHandler } from "bun"
import type { CF } from "../../../modules/ssl/types/cloudflare"

/**
 * @type RouteHandler
 * @description Function signature for route handlers
 */
export type RouteHandler = (
    req: Request,
    params: Record<string, string>,
    server: Server
) => Response | Promise<Response>

/**
 * @type RouterConfig
 * @description Configuration for router paths
 */
export type RouterConfig = {
    path: string
    handler: RouteHandler
    method?: string
}

/**
 * @type BaseServerConfig
 * @description Base configuration shared by all server types
 */
export type BaseServerConfig = {
    port?: number
    hostname?: string
    development?: boolean
    idleTimeout?: number
    websocket?: WebSocketHandler
    /**
     * Whether to automatically handle CORS
     * @default false
     */
    cors?: boolean
    /**
     * Static file directory
     * @default "./public"
     */
    staticDir?: string
    /**
     * SSL configuration
     */
    ssl?: {
        enabled: boolean
        cloudflare: CF.Auth.APIKey | CF.Auth.OriginCAKey
        zoneId?: string
    }
}

/**
 * @type ServerConfig
 * @description Union of possible server configurations (specific to tls and unix options)
 */
export type ServerConfig = BaseServerConfig & ({
    tls?: never
    unix?: never
} | {
    tls: TLSOptions
    unix?: never
} | {
    tls?: never
    unix: string
} | {
    tls: TLSOptions
    unix: string
})

/**
 * @type SSLOptions
 * @description Options for SSL configuration
 */
export type SSLOptions = {
    commonName: string
    hostNames: string[]
    validity: number
}