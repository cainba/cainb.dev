import type { RequestContext } from "../../types"
import { logging } from "@web/src/config/console.json" with {type: "json"}

interface ColorScheme {
    method: (text: string) => string
    path: (text: string) => string
    url: (text: string) => string
    headers: (text: string) => string
    time: (text: string) => string
}

const colors: ColorScheme = {
    method: (text) => `${Bun.color(logging.colorScheme.method, "ansi-16m")}${text}`,
    path: (text) => `${Bun.color(logging.colorScheme.path, "ansi-16m")}${text}`,
    url: (text) => `${Bun.color(logging.colorScheme.url, "ansi-16m")}${text}`,
    headers: (text) => `${Bun.color(logging.colorScheme.headers, "ansi-16m")}${text}`,
    time: (text) => `${Bun.color(logging.colorScheme.time, "ansi-16m")}${text}`
}

export default async (_ctx: RequestContext) => {
    console.info(`${colors.method(_ctx.requestMethod)} ${colors.path(_ctx.requestPath)}
${colors.url(_ctx.requestPath)}:/?${_ctx.requestQuery}
${colors.time(`${_ctx.requestProcessTime?.toJSON()}ms`)}
`)
    return
}
``