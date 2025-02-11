export type ApiMessage = "succeded" | "failed" | "not-implemented"

export type ApiReturnMessage = {
    status: ApiMessage
    message: string
    results?: {
        [key: string]: any
    }
    errors?: {
        [key: string]: any
    }
}
