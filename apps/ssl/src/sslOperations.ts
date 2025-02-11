/**
 * @author @cainba
 * @module @cb/apps/ssl
 * @file sslOperations.ts
 * @description Defines methods for operations with SSL certificates and keys
 * @requires @cb/store
 */
import { keyStore, generateKey } from "@cb/store"

export class sslOperations {
    private keyStore: keyStore
    private certs: Map<string, string>
    private keys: Map<string, CryptoKey>
    constructor({ keyStore }: { keyStore: keyStore }) {
        this.keyStore = keyStore
        this.certs = new Map()
        this.keys = new Map()
    }

    /**
     * @method addCert
     * @description Adds a certificate to the store
     * @param name - The name of the certificate
     * @param cert - The certificate data
     */

    async addCert(name: string, cert: string) {
        this.certs.set(name, cert)
    }

    /**
     * @method addKey
     * @description Adds a key to the store
     * @param name - The name of the key
     * @param key - The key data
     */
    async addKey(name: string, key: CryptoKey) {
        this.keys.set(name, key)
    }

    /**
     * @method getCert
     * @description Gets a certificate from the store
     * @param name - The name of the certificate
     * @returns The certificate data
     */

}