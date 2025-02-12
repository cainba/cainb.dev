/**
 * @author @cainba
 * @module @cb/apps/ssl
 * @file index.ts
 * @description SSL Manager
 */

import { $ } from "bun"
import { KeyStore, } from "@cb/store/index"
import type { CF, SSLPair } from "../types"

export function formatCSR(csr: string): CF.NewlineEncoded {

    return csr.trim().replace(/\r\n/g, "\n") as CF.NewlineEncoded
}
/**
 * @function generateSSLPair
 * @description Generates a new SSL key pair and CSR using OpenSSL
 */
async function generateSSLPair(
    commonName: string,
    hostNames: string[],
    tempDir: string = "/tmp"
): Promise<SSLPair & { keyPath: string, csrPath: string, csr: CF.NewlineEncoded }> {
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

        return {
            key,
            keyPath,
            csrPath,
            csr: csr as CF.NewlineEncoded,
            name: "",
            cert: "",
            expiresAt: new Date(0),
            createdAt: new Date()
        }
    } finally {
        await $`rm -f ${configPath} ${csrPath}`
    }
}

/**
 * @function validateSSLPair
 * @description Validates an SSL key pair using OpenSSL
 */
async function validateSSLPair(pair: SSLPair & { keyPath: string }): Promise<boolean> {
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
    }): Promise<{ cert: CF.Response.CertCreate, keyName: string }> {
        const finalHostnames = hostNames ?? this.hostNames

        if (!finalHostnames.length) {
            throw new Error("No hostnames provided")
        }

        const sslPair = await generateSSLPair(commonName, finalHostnames)

        if (!await validateSSLPair(sslPair)) {
            throw new Error("Generated SSL pair validation failed")
        }

        const keyName = `ssl_${commonName}_${Date.now()}`
        await this.keyStore.storeSSLKey(keyName, sslPair.key)
        console.log("Stored SSL key with name:", keyName)


        const cert = await this.createCertificate({
            csr: sslPair.csr,
            hostNames: finalHostnames,
            requestType,
            requestedValidity
        })

        return { cert, keyName }
    }

    isValidValidityPeriod(period: number): boolean {
        const validPeriods = [15, 30, 45, 60, 75, 90]
        return validPeriods.includes(period)
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
        console.log("Creating certificate with Cloudflare...")


        const formattedCSR = formatCSR(csr)


        if (requestType.toLowerCase() !== "origin-rsa") {
            console.warn("Switching to origin-RSA as it's the only supported type")
            requestType = "origin-rsa"
        }

        if (!this.isValidValidityPeriod(requestedValidity)) {
            console.warn("Invalid validity period, defaulting to 90 days")
            requestedValidity = 90
        }

        const r: CF.Request.CertCreate = {
            headers: {
                "Content-Type": "application/json",
                ...this.auth
            },
            body: {
                csr: formattedCSR,
                hostnames: hostNames ?? this.hostNames,
                request_type: requestType,
                requested_validity: requestedValidity
            }
        }

        console.log("Request details:", {
            hostNames: r.body.hostnames,
            requestType: r.body.request_type,
            requestedValidity: r.body.requested_validity,
            csrLength: formattedCSR.length
        })

        const res = await fetch(this.cf_certUrl, {
            method: "POST",
            headers: r.headers,
            body: JSON.stringify(r.body)
        })

        if (!res.ok) {
            const errorBody = await res.text()
            console.error("Cloudflare API error:", {
                status: res.status,
                statusText: res.statusText,
                body: errorBody
            })
            throw new Error(`Error creating certificate: ${res.statusText}\nDetails: ${errorBody}`)
        }

        return res.json()
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

    /**
   * @method listCertificates
   * @description List all certificates for a given zone
   */
    async listCertificates(zoneId: string): Promise<CF.Response.CertList> {
        console.log("Listing certificates for zone:", zoneId)

        const response = await fetch(`${this.cf_certUrl}?zone_id=${zoneId}`, {
            method: "GET",
            headers: {
                "Content-Type": "application/json",
                ...this.auth
            }
        })

        if (!response.ok) {
            const errorBody = await response.text()
            console.error("Failed to list certificates:", {
                status: response.status,
                statusText: response.statusText,
                body: errorBody
            })
            throw new Error(`Failed to list certificates: ${response.statusText}\nDetails: ${errorBody}`)
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
                const currentCert = await this.getCertificate(certificateId)
                const sslPair = await generateSSLPair(
                    currentCert.result.hostNames[0],
                    currentCert.result.hostNames
                )
                const keyName = `ssl_${currentCert.result.hostNames[0]}_${Date.now()}`
                await this.keyStore.storeSSLKey(keyName, sslPair.key)
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