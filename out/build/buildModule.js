"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const node_path_1 = require("node:path");
const args = Bun.argv.slice(2);
const cliArgs = {
    module: process.cwd(),
    flags: new Set(),
    values: [],
    options: new Map()
};
for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    if (arg.startsWith("--")) {
        const flag = arg.slice(2);
        if (i + 1 < args.length && !args[i + 1].startsWith("--")) {
            cliArgs.options.set(flag, args[i + 1]);
            i++;
        }
        else {
            cliArgs.flags.add(flag);
        }
    }
    else {
        cliArgs.values.push(arg);
    }
}
const buildFeatures = {
    cjs: cliArgs.flags.has("build-cjs")
};
console.log({
    workingDirectory: process.cwd(),
    buildScript: import.meta.path,
    packageJson: (0, node_path_1.join)(process.cwd(), 'package.json'),
    outputDir: (0, node_path_1.join)(process.cwd(), 'dist')
});
const buildConfig = {
    entrypoints: [require(`${cliArgs.module}/package.json`)["main"]],
    outdir: node_path_1.join,
    format: "esm",
    target: "bun",
    sourcemap: "inline",
    throw: true,
    env: "inline",
    minify: true
};
await Bun.build(buildConfig);
