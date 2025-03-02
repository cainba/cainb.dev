import { RequestContext } from "../../types"
export default async (_ctx: RequestContext) => {
    if (_ctx.requestPath.startsWith("/fonts")) {
        const fontPath = await Bun.resolve(`/fonts/${_ctx.requestPath.split("/").pop()}`, `${import.meta.dir}/../`)
        const fontFile = Bun.file(fontPath)
        await fontFile.exists().then((_e) => {
            return new Response(fontFile.stream(), {
                headers: {
                    "content-type": "font/woff2"
                }
            })
        }).catch((e) => {
            console.log(e)
            return new Response("Not Found", {
                status: 404
            })
        })
    }
}
