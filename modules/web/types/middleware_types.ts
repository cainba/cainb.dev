import type { Server } from "bun"

/**
 * @cainba
 * @type Middleware
 * @description Middleware type, used to define the type of a middleware function.
 * @see {@link RequestContext} for more info on the context object.
 * @see {@link Response} for more info on the response object.
 */
export type Middleware = (ctx: RequestContext) => Promise<Response | void> | Response | void

/**
 *  @cainba
 *  @description Middleware Request Context, provides access properties in middleware scope
 *  @type {RequestContext}
 *  @property {Request} request - The request object
 *  @property {Server} server - The server object
 *  @property {URL} requestUrl - The request URL
 *  @property {string} requestMethod - The request method
 *  @property {string | null} requestBody - The request body
 *  @property {Headers} requestHeaders - The request headers
 *  @property {URLSearchParams} requestQuery - The request query
 *  @property {string} requestPath - The request path
 *
 */
export type RequestContext = {
    request: Request
    server: Server
    requestUrl: URL
    requestMethod: "GET" | "POST" | "PUT" | "DELETE" | "PATCH"
    requestBody: Promise<string> | string | null
    requestHeaders: Record<string, string>
    requestQuery: RequestContext["requestUrl"]["searchParams"]
    requestPath: string
    requestProcessTime?: PerformanceMeasure
}