import fontLoader from "./modules/web/src/middleware/fontLoader.ts"
import requestLogger from "./modules/web/src/middleware/requestLogger.ts"
import { assetLoader } from "@cainb/web"
import { CainWebServer, type cbserver, type RequestContext } from "@cainb/web"
import type { Server } from "bun"
const opts: cbserver = {
    development: false,
    hostname: "127.0.0.1",
    port: 4604,
    idleTimeout: 1000,
    routers: {

    },
    tls: {
        key: await Bun.file(String(Bun.env.SSL_KEY_PATH)).text(),
        cert: await Bun.file(String(Bun.env.SSL_CERT_PATH)).text()
    },
    fetch: async (req: Request, server: Server) => {
        if (req.url === "/") {
            return new Response(Bun.file(`${import.meta.dirname}/modules/client/src/html/index.html`).stream(), {
                headers: {
                    "Content-Type": "text/html"
                }
            })
        }
        return new Response("Not Found", { status: 404 })
    },
    middleware: [
        requestLogger,
        fontLoader,
        assetLoader()
    ],
    error: (_err) => {
        return new Response(`Internal Server Error: ${_err}`, { status: 500 })
    }
}

await new CainWebServer(opts).start()
