import type { TemplateLiteral } from "typescript"

export type LogType = "debug" | "info" | "warning" | "err" | "other"
export type logCallback = (message: LogMessage) => void | any

export interface LogMessage {
    level: LogType
    message: string | TemplateLiteral
    origin: string
    timestamp: Date
    data?: any | (() => any)
}
