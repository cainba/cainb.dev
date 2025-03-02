import type { RequestContext } from "../types"

/**
 * @cainba
 * @type {RouteHandler}
 * @description Route handler type, used to define the type of a route handler function.
 * @see {@link RequestContext} for more info on the context object.
 * @see {@link Response} for more info on the response object.
 */
export type RouteHandler = (context: RequestContext) => Response | Promise<Response>
