import { BunPlugin } from "bun"
import { existsSync } from "node:fs"
interface PluginOptions {
    root: string
}

export const compileInsertsPlugin = (options: PluginOptions): BunPlugin => ({
    name: "Compile Component Plugin",
    setup(build) {
        build.onResolve({ filter: /\.html$/ }, (args) => {
            console.info(`Resolving component: ${args.path}`)
            const componentPath = Bun.resolveSync(
                `modules/client/components/${args.path}`,
                options.root
            )
            return { path: componentPath, namespace: "html-component" }
        })

        build.onLoad({ filter: /\.html$/, namespace: "html-component" }, async (args) => {
            try {
                console.info(`Loading component: ${args.path}`)
                const componentPath = args.path
                const componentFile = Bun.file(componentPath)

                if (await componentFile.exists()) {
                    const componentContent = await componentFile.text()
                    return { contents: componentContent, loader: "text" }
                }

                console.warn(`Component not found: ${componentPath}`)
                return { contents: "", loader: "text" }
            } catch (err) {
                throw err
            }
        })

        build.onLoad({ filter: /index\.html$/ }, async (args) => {
            try {
                console.info(`Loading index: ${args.path}`)
                const indexPath = args.path
                const indexFile = Bun.file(indexPath)

                await indexFile.exists().then((r) => {
                    console.info(`File Exists: ${r}`)
                }).catch((e) => {
                    console.warn(`File Does Not Exist: ${e}`)
                    return { contents: "", loader: "file" }
                })

                let indexContent = await indexFile.text()
                console.info(`Index content loaded: ${indexContent}`)

                const componentRegex = /<c-insert\s+src="([\w\/.-]+)"\s*\/>/g
                for (const match of indexContent.matchAll(componentRegex)) {
                    console.info(`Found component insert: ${match[0]}`)

                    const componentPath = match[1]
                    const indexDir = indexPath.split("/").slice(0, -1).join("/")
                    const fullComponentPath = Bun.resolveSync(
                        componentPath,
                        indexDir
                    )

                    console.info(`Full Component Path: ${fullComponentPath}`)

                    const componentFile = Bun.file(fullComponentPath, { "endings": "native", "type": "html" })
                    await componentFile.exists().then(async (_r) => {
                        indexContent = indexContent.replace(match[0], await componentFile.text())
                    }).catch((_e) => {
                        console.warn(`Component Does Not Exist: ${_e}`)
                    })
                }
                return { contents: indexContent, loader: "html" }
            } catch (err) {
                throw err
            }
        })
    },
})
