import {
    exportKey,
    importKey
} from "./keyOperations"
import type { KeyStat } from "../types/keystore"
export class KeyStore {
    private masterKey: CryptoKey /* master key to encrypt/decrypt other keys */
    private keyStore: Map<string, KeyStat> /* store of keys */
    local = {
        keysDir: "", /* directory to store keys */
        applicationDir: "" /* has limited use */
    }
    async init() {
        try {
            await Bun.file(this.local.keysDir).exists()
            const mKeyFile = Bun.file(this.local.keysDir + this.masterKey.name)

        } catch (err) {

        }
    }

    async saveKey(key: CryptoKey, name: string) {
        const keyFile = Bun.file(this.local.keysDir + name)
        if (await keyFile.exists()) {
            throw new Error("Key already exists")
        }
        const exportedKey = await exportKey(key)
        await keyFile.write(exportedKey)
    }

    async setKey(key: CryptoKey, name: string): Promise<KeyStat> {
        const keyDate = new Date().toLocaleDateString()
        const kS: KeyStat = {
            key: await exportKey(key),
            keyIterations: 0,
            name: name,
            createdAt: keyDate,
            lastRotated: keyDate
        }
        return kS
    }

    async getKey(name: string): Promise<CryptoKey> {
        const keyFile = Bun.file(this.local.keysDir + name)
        if (!await keyFile.exists()) {
            throw new Error("Key does not exist")
        }
        const { value, done } = await keyFile.stream().getReader().read()
        if (done || !value) {
            throw new Error("Failed to read key data")
        }
        return importKey(value)
    }
}