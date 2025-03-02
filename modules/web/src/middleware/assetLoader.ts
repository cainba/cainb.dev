import type { Middleware, RequestContext } from "../../types"
export const assetLoader = (): Middleware => {
    return async (_ctx: RequestContext) => {
        const reqStartsWith = _ctx.requestPath.split("/").slice(1, 2).join("")
        const reqAssetName = _ctx.requestPath.split("/").pop()
        const basePath = `${process.cwd()}/modules/client/src`
        const reqAssetPath = `${basePath}/${reqStartsWith}/${reqAssetName}`
        console.log(`Requested asset path: ${reqAssetPath}`)
        if (reqStartsWith === "css") {
            const cssFile = Bun.file(reqAssetPath)
            if (await cssFile.exists()) {
                return new Response(cssFile.stream(), {
                    headers: { "content-type": "text/css" },
                })
            } else {
                console.warn(`CSS file not found: ${reqAssetPath}`)
                return new Response("Not Found", { status: 404 })
            }
        }
        if (reqStartsWith === "js") {
            const jsFile = Bun.file(reqAssetPath)
            if (await jsFile.exists()) {
                return new Response(jsFile.stream(), {
                    headers: { "content-type": "text/javascript" },
                })
            } else {
                console.warn(`JS file not found: ${reqAssetPath}`)
                return new Response("Not Found", { status: 404 })
            }
        }
        if (reqStartsWith === "img") {
            const imgFile = Bun.file(reqAssetPath)
            if (await imgFile.exists()) {
                return new Response(imgFile.stream(), {
                    headers: { "content-type": "image/png" },
                })
            } else {
                console.warn(`Image file not found: ${reqAssetPath}`)
                return new Response("Not Found", { status: 404 })
            }
        }
        return new Response("Unsupported asset type", { status: 400 })
    }
}
