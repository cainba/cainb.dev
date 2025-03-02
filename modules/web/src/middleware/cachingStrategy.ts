import type { RequestContext } from "../../types"
import WebCache from "../cache/cache"
const wCache = new WebCache<unknown>(1000 * 60 * 60)

export default async (_ctx: RequestContext) => {
    const cacheKey = `_ctx-${_ctx.requestPath}-${_ctx.requestMethod}-${_ctx.requestQuery}`
    const cResponse = wCache.get(cacheKey)
    if (cResponse) {
        return cResponse
    }
}