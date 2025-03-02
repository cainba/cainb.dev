import { build } from "bun"
import { compileInsertsPlugin } from "@cainb/client"

const entry = Bun.resolveSync("modules/client/src/html/index.html", process.cwd())
try {
    const cbo = await build({
        minify: true,
        target: "browser",
        env: "inline",
        throw: true,
        root: "modules/client",
        outdir: "dist/client",
        entrypoints: [entry],
        drop: ["debug", "console", "log"],
        sourcemap: "linked",
        naming: {
            asset: "[name]-[hash][ext]",
            entry: "[name].[ext]",
            chunk: "[hash].[ext]"
        },
        splitting: true,
        format: "esm",
        define: { "process.env.NODE_ENV": '"production"' },
        plugins: [compileInsertsPlugin({ root: process.cwd() })],
    })

    if (cbo.success) {
        console.log(`
        Build success:
        ${cbo.outputs.map(e => e.name).join("\n")}
    `)
    } else {
        console.error(`
        Build failed with errors:
        ${cbo.logs.map(e => e.message).join("\n")}
    `)
    }
} catch (err) {
    console.error(err)
}