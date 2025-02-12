import {
    exportKey,
    importKey,
    generateKey
} from "./keyOperations"
import type { KeyStat } from "../types/keystore"
import { encrypt, decrypt } from "./keyOperations"
import { formatPEM } from "@cb/modules/ssl"
import { chmod, mkdir, rm } from "node:fs"
export class KeyStore {
    private masterKey: CryptoKey
    private keyMap: Map<string, KeyStat> = new Map()
    local = {
        keysDir: "",
        applicationDir: ""
    }

    /**
     * @method init
     * @description Initialize the keystore
     */
    async init() {
        console.log("Initializing KeyStore...")
        console.log("Keys directory:", this.local.keysDir)
        if (!await Bun.file(this.local.keysDir).exists()) {
            console.log("Creating keys directory...")
            mkdir(this.local.keysDir, () => { })
            chmod(this.local.keysDir, 0o700, () => { })
        }

        const keyPath = `${this.local.keysDir}/master.key`
        if (!await Bun.file(keyPath).exists()) {
            console.log("Generating new master key...")
            this.masterKey = await generateKey()
            const exportedKey = await exportKey(this.masterKey)
            await Bun.write(keyPath, exportedKey)
            chmod(keyPath, 0o400, () => { })
        } else {
            console.log("Loading existing master key...")
            const keyData = new Uint8Array(await Bun.file(keyPath).arrayBuffer())
            this.masterKey = await importKey(keyData)
        }

        console.log("KeyStore initialized successfully")
    }

    async storeSSLKey(name: string, keyData: string): Promise<void> {
        const keyPath = `${this.local.keysDir}/${name}.pem`
        console.log("Storing SSL key:", keyPath)

        if (await Bun.file(keyPath).exists()) {
            throw new Error(`Key ${name} already exists`)
        }

        const formattedKey = formatPEM("PRIVATE KEY", keyData)
        await Bun.write(keyPath, formattedKey)
        chmod(keyPath, 0o400, () => { })
        console.log("Key stored successfully")
    }

    async getSSLKey(name: string): Promise<string> {
        const keyPath = `${this.local.keysDir}/${name}.pem`
        console.log("Reading SSL key:", keyPath)

        if (!await Bun.file(keyPath).exists()) {
            throw new Error(`Key ${name} not found`)
        }

        const keyData = await Bun.file(keyPath).text()
        if (!keyData.includes("-----BEGIN")) {
            return formatPEM("PRIVATE KEY", keyData)
        }
        return keyData
    }
    /**
     * @method saveKey
     * @description Save a key to storage with proper encryption
     */
    async saveKey(key: CryptoKey, name: string) {
        const keyPath = `${this.local.keysDir}/${name}.key`

        if (await Bun.file(keyPath).exists()) {
            throw new Error(`Key ${name} already exists`)
        }

        const exportedKey = await exportKey(key)
        const encrypted = await encrypt(
            new TextDecoder().decode(exportedKey),
            this.masterKey
        )

        await Bun.write(keyPath, encrypted)
        chmod(keyPath, 0o400, () => { })

        this.keyMap.set(name, {
            name,
            key: exportedKey,
            createdAt: new Date().toISOString(),
            lastRotated: new Date().toISOString(),
            keyIterations: 0
        })
    }

    /**
     * @method getKey
     * @description Get a decrypted key by name
     */
    async getKey(name: string): Promise<CryptoKey> {
        const keyPath = `${this.local.keysDir}/${name}.key`
        const keyFile = Bun.file(keyPath)

        if (!await keyFile.exists()) {
            throw new Error(`Key ${name} not found`)
        }

        const encrypted = new Uint8Array(await keyFile.arrayBuffer())
        const decrypted = await decrypt(encrypted, this.masterKey)

        return importKey(new TextEncoder().encode(decrypted))
    }

    /**
    * @method listKeys
    * @description List all available keys
    */
    listKeys(): Array<Omit<KeyStat, "key">> {
        return Array.from(this.keyMap.values()).map(({ key, ...rest }) => rest)
    }

    /**
     * @method deleteKey
     * @description Delete a key
     */
    async deleteKey(name: string): Promise<boolean> {
        const keyPath = `${this.local.keysDir}/${name}.key`
        if (!await Bun.file(keyPath).exists()) {
            return false
        }

        await Bun.write(keyPath, "")
        rm(keyPath, () => { })
        this.keyMap.delete(name)
        return true
    }
}