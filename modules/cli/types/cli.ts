/**
 * @author @cainba
 * @module @types/cli
 * @description provides shared type defintions for the cli
 *
 */

export type CliCommand = {
    description: string
    default?: boolean
    expectsArgs?: boolean
    options?: Array<{
        name: string
        description: string
        type?: "flag" | "value"
    }>
}

export type CliBuildConfig = {
    module: string
    flags: Set<CliCommand>
    values: string[]
    options: Map<string, string>
}