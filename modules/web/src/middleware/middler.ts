import type { Middleware, RequestContext } from "../../types"

export class MiddlewareManager {
    private middlewares: Middleware[] = [];

    use(middleware: Middleware) {
        this.middlewares.push(middleware)
    }

    async run(ctx: RequestContext): Promise<Response | void> {
        for (const middleware of this.middlewares) {
            const result = await middleware(ctx)
            if (result instanceof Response) return result
        }
    }
}