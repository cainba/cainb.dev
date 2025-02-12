export namespace CF {
    export type NewlineEncoded = string & { readonly __newlineEncoded: unique symbol }
    export type RequestValidity = 7 | 30 | 90 | 365 | 730 | 1095 | 5475
    export type RequestType = "origin-rsa" | "origin-ecc" | "keyless-certificate"

    export namespace Auth {
        export type APIKey = { "X-Auth-Email": string, "X-Auth-Key": string }
        export type OriginCAKey = { "X-Auth-User-Service-Key": string }
    }

    export namespace Response {
        export interface CertCreate {
            success: boolean
            result: {
                csr: string | "" | undefined
                hostNames: string[]
                request_type: RequestType
                requested_validity: RequestValidity
                id: string
            }
            errors: Array<[
                {
                    code: number
                    message: string
                }]>,
            messages: Array<[
                {
                    code: number
                    message: string
                }]>
        }

        export interface CertList {
            success: boolean
            errors: Array<[
                {
                    code: number
                    message: string
                }]>
            messages: Array<[
                {
                    code: number
                    message: string
                }]>
            result: Array<{
                csr: string | "" | undefined
                hostNames: string[]
                request_type: RequestType
                requested_validity: RequestValidity
                id: string
            }>
            results_info: {
                count: number
                page: number
                per_page: number
                total_count: number
            }
        }

        export interface CertGet {
            success: boolean
            result: {
                csr: string | "" | undefined
                hostNames: string[]
                request_type: RequestType
                requested_validity: RequestValidity
                id: string
            }
            errors: Array<[
                {
                    code: number
                    message: string
                }]>
        }

        export interface CertRevoke {
            id: string
            revoked_at: string
        }

    }

    export namespace Request {
        export interface CertCreate {
            headers: {
                "Content-Type": "application/json",
            } & (Auth.APIKey | Auth.OriginCAKey)
            body: {
                csr: NewlineEncoded | "" | undefined
                hostNames: string[]
                requestType: RequestType
                requestedValidity: RequestValidity
            }
        }

        export interface CertList {
            params: {
                "zone_id": string
            }
            headers: {
                "Content-Type": "application/json",
            } & (Auth.APIKey | Auth.OriginCAKey)
        }

        export interface CertGet {
            params: {
                "certificate_id": string
            }
            headers: {
                "Content-Type": "application/json",
            } & (Auth.APIKey | Auth.OriginCAKey)
        }

        export interface CertRevoke {
            params: {
                "certificate_id": string
            }
            headers: {
                "Content-Type": "application/json",
            } & (Auth.APIKey | Auth.OriginCAKey)
        }

    }
}

function assertNewLineEncoded(nls: string): asserts nls is CF.NewlineEncoded {
    if (!nls.includes("\n")) throw new Error("String `${nls} must contain new line characters")
}