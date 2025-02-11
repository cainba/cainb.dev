/**
 * @author @cainba
 * @module @cb/apps/ssl
 * @file index.ts
 * @description SSL Manager
 */

import { $ } from "bun"
import { KeyStore, generateKey } from "@cb/store"

/**
 * @namespace CF
 * @description Cloudflare API types
 */
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
                csr: string
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
                csr: string
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
                csr: string
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
                csr: NewlineEncoded
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

/**
 * @interface SSLPair
 * @description Represents an SSL key pair
 */
export interface SSLPair {
    key: string
    keyPath: string
    csrPath: string
}

/**
 * @function assertNewLineEncoded
 * @description Asserts that a string contains newlines
 */
function assertNewLineEncoded(nls: string): asserts nls is CF.NewlineEncoded {
    if (!nls.includes("\n")) {
        throw new Error(`String ${nls} must contain new line characters`)
    }
}

/**
 * @function generateSSLPair
 * @description Generates a new SSL key pair and CSR using OpenSSL
 */
async function generateSSLPair(
    commonName: string,
    hostNames: string[],
    tempDir: string = "/tmp"
): Promise<SSLPair & { csr: CF.NewlineEncoded }> {
    const timestamp = Date.now()
    const keyPath = `${tempDir}/server_${timestamp}.key`
    const csrPath = `${tempDir}/server_${timestamp}.csr`
    const configPath = `${tempDir}/openssl_${timestamp}.cnf`

    const config = `
[req]
default_bits = 2048
prompt = no
default_md = sha256
req_extensions = req_ext
distinguished_name = dn

[dn]
CN = ${commonName}
O = Self-Signed
OU = IT
L = Local
ST = State
C = US

[req_ext]
subjectAltName = @alt_names

[alt_names]
${hostNames.map((name, i) => `DNS.${i + 1} = ${name}`).join("\n")}
`
    await Bun.write(configPath, config)

    try {
        await $`openssl genrsa -out ${keyPath} 2048`
        await $`openssl req -new -key ${keyPath} -out ${csrPath} -config ${configPath}`

        const [key, csr] = await Promise.all([
            Bun.file(keyPath).text(),
            Bun.file(csrPath).text()
        ])

        assertNewLineEncoded(csr)

        return {
            key,
            keyPath,
            csrPath,
            csr: csr as CF.NewlineEncoded
        }
    } finally {
        await $`rm -f ${configPath} ${csrPath}`
    }
}

/**
 * @function validateSSLPair
 * @description Validates an SSL key pair using OpenSSL
 */
async function validateSSLPair(pair: SSLPair): Promise<boolean> {
    try {
        const keyCheck = await $`openssl rsa -in ${pair.keyPath} -check -noout`
        return keyCheck.exitCode === 0
    } catch {
        return false
    }
}

/**
 * @class SSLManager
 * @description Manages SSL certificates through Cloudflare Origin CA API
 */
export class SSLManager {
    private keyStore: KeyStore
    private cf_certUrl: string = "https://api.cloudflare.com/client/v4/certificates"
    hostNames: string[] = []

    constructor(
        private auth: CF.Auth.APIKey | CF.Auth.OriginCAKey,
        keyStore: KeyStore
    ) {
        this.keyStore = keyStore
    }

    /**
     * @method generateAndStoreCertificate
     * @description Generates a new SSL pair and creates a certificate
     */
    async generateAndStoreCertificate({
        commonName,
        hostNames,
        requestType,
        requestedValidity
    }: {
        commonName: string
        hostNames?: string[]
        requestType: CF.RequestType
        requestedValidity: CF.RequestValidity
    }): Promise<CF.Response.CertCreate> {
        const finalHostnames = hostNames ?? this.hostNames

        if (!finalHostnames.length) {
            throw new Error("No hostnames provided")
        }

        const sslPair = await generateSSLPair(commonName, finalHostnames)

        if (!await validateSSLPair(sslPair)) {
            throw new Error("Generated SSL pair validation failed")
        }

        const keyName = `ssl_${commonName}_${Date.now()}`
        await this.keyStore.saveKey(
            await crypto.subtle.importKey(
                "raw",
                new TextEncoder().encode(sslPair.key),
                "AES-GCM",
                true,
                ["encrypt", "decrypt"]
            ),
            keyName
        )

        return this.createCertificate({
            csr: sslPair.csr,
            hostNames: finalHostnames,
            requestType,
            requestedValidity
        })
    }

    async createCertificate({
        csr,
        hostNames,
        requestType,
        requestedValidity
    }: {
        csr: CF.NewlineEncoded
        hostNames?: string[]
        requestType: CF.RequestType
        requestedValidity: CF.RequestValidity
    }): Promise<CF.Response.CertCreate> {
        const r: CF.Request.CertCreate = {
            headers: {
                "Content-Type": "application/json",
                ...this.auth
            },
            body: {
                csr,
                hostNames: hostNames ?? this.hostNames,
                requestType,
                requestedValidity
            }
        }
        const res = await fetch(this.cf_certUrl, {
            method: "POST",
            headers: r.headers,
            body: JSON.stringify(r.body)
        })
        if (res.ok) {
            const data = await res.json() as CF.Response.CertCreate
            return data
        }
        else
            throw new Error(`Error creating certificate: ${res.statusText}`)
    }

    async listCertificates(zoneId: string): Promise<CF.Response.CertList> {
        const request: CF.Request.CertList = {
            params: { zone_id: zoneId },
            headers: {
                "Content-Type": "application/json",
                ...this.auth
            }
        }

        const response = await fetch(`${this.cf_certUrl}?zone_id=${zoneId}`, {
            method: "GET",
            headers: request.headers
        })

        if (!response.ok) {
            throw new Error(`Failed to list certificates: ${response.statusText}`)
        }

        return response.json()
    }

    async getCertificate(certificateId: string): Promise<CF.Response.CertGet> {
        const request: CF.Request.CertGet = {
            params: { certificate_id: certificateId },
            headers: {
                "Content-Type": "application/json",
                ...this.auth
            }
        }

        const response = await fetch(`${this.cf_certUrl}/${certificateId}`, {
            method: "GET",
            headers: request.headers
        })

        if (!response.ok) {
            throw new Error(`Failed to get certificate: ${response.statusText}`)
        }

        return response.json()
    }

    async revokeCertificate(certificateId: string): Promise<CF.Response.CertRevoke> {
        const request: CF.Request.CertRevoke = {
            params: { certificate_id: certificateId },
            headers: {
                "Content-Type": "application/json",
                ...this.auth
            }
        }

        const response = await fetch(`${this.cf_certUrl}/${certificateId}`, {
            method: "DELETE",
            headers: request.headers
        })

        if (!response.ok) {
            throw new Error(`Failed to revoke certificate: ${response.statusText}`)
        }

        return response.json()
    }

    async scheduleKeyRotation(
        certificateId: string,
        intervalDays: number,
        callback?: (error?: Error) => void
    ): Promise<void> {
        const rotationInterval = intervalDays * 24 * 60 * 60 * 1000

        const rotate = async () => {
            try {
                const cert = await this.getCertificate(certificateId)
                const newKey = await generateKey()
                await this.keyStore.saveKey(newKey, `${cert.result.id}_${Date.now()}`)

                const currentCert = await this.getCertificate(certificateId)

                const sslPair = await generateSSLPair(
                    currentCert.result.hostNames[0],
                    currentCert.result.hostNames
                )

                await this.createCertificate({
                    csr: sslPair.csr,
                    hostNames: currentCert.result.hostNames,
                    requestType: currentCert.result.request_type,
                    requestedValidity: currentCert.result.requested_validity
                })
                await this.revokeCertificate(certificateId)

                callback?.()
            } catch (error) {
                callback?.(error as Error)
            }
        }

        setInterval(rotate, rotationInterval)
    }
}