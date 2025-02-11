import { cli } from "./buildConfig.json" with { type: "json"}
import { type BuildOutput, type BuildConfig, build } from "bun"
import { join } from "node:path"

const args = Bun.argv.slice(2)
const moduleRoot = process.cwd()
const pkg = require(join(moduleRoot, "package.json"))
console.log({
    argv: Bun.argv,
    execPath: process.execPath,
    mainModule: Bun.main,
    importMetaUrl: import.meta.url,
    moduleRoot,
})

const cliArgs = {
    module: moduleRoot,
    flags: new Set<string>(),
    values: [] as string[],
    options: new Map<string, string>()
}

for (let i = 0; i < args.length; i++) {
    const arg = args[i]
    if (arg.startsWith("--")) {
        const flag = arg.slice(2)
        if (i + 1 < args.length && !args[i + 1].startsWith("--")) {
            cliArgs.options.set(flag, args[i + 1])
            i++
        } else {
            cliArgs.flags.add(flag)
        }
    } else {
        cliArgs.values.push(arg)
    }
}

const buildFeatures = {
    cjs: cliArgs.flags.has("build-cjs"),
    sourcemaps: cliArgs.flags.has("build-sourcemaps") ? "external" as const : "none" as const
}

const buildConfig: BuildConfig = {
    entrypoints: [join(moduleRoot, pkg.main)],
    outdir: join(moduleRoot, 'dist'),
    target: "bun",
    format: buildFeatures.cjs ? "cjs" : "esm",
    sourcemap: buildFeatures.sourcemaps,
    throw: true,
    env: "inline",
    minify: true
}

console.log('Build configuration:', {
    entrypoint: buildConfig.entrypoints[0],
    outdir: buildConfig.outdir,
    packageLocation: join(moduleRoot, 'package.json')
})

await Bun.build(buildConfig)
