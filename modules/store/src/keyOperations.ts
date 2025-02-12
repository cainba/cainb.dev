/**
 * @author @cainba
 * @module @cb/store
 * @file keyOperations.ts
 * @description Defines methods used for key operations
 */

/**
 * @method generateKey
 * @description Generates a new AES-GCM key
 * @param {number} keyLength - The length of the key in bits
 * @return {Promise<CryptoKey>} The generated key
 */
export async function generateKey({ keyLength }: { keyLength?: number } = {}): Promise<CryptoKey> {
    return crypto.subtle.generateKey(
        { name: "AES-GCM", length: 256 },
        true,
        ["encrypt", "decrypt"]
    )
}

/**
 * @method exportKey
 * @description Exports a CryptoKey to a Uint8Array, used for storage
 * @param key - The key to export
 * @returns The exported key as a Uint8Array
 */
export async function exportKey(key: CryptoKey): Promise<Uint8Array> {
    const eXK = await crypto.subtle.exportKey("raw", key)
    return new Uint8Array(eXK)
}

/**
 * @method importKey
 * @description Imports a Uint8Array to a CryptoKey, used for storage
 * @param keyData - The key data to import
 * @returns The imported key
 */
export async function importKey(keyData: Uint8Array): Promise<CryptoKey> {
    return crypto.subtle.importKey(
        "raw",
        keyData,
        { name: "AES-GCM" },
        true,
        ["encrypt", "decrypt"]
    )
}

/**
 * @method encrypt
 * @param data - The data to encrypt
 * @param key  - The key to encrypt the data with
 * @returns The encrypted result of the data
 */
export async function encrypt(data: string, key: CryptoKey): Promise<Uint8Array> {
    const iv = crypto.getRandomValues(new Uint8Array(12))
    const encoder = new TextEncoder()
    const encoded = encoder.encode(data)

    const encrypted = await crypto.subtle.encrypt(
        { name: "AES-GCM", iv },
        key,
        encoded
    )

    const result = new Uint8Array(iv.length + encrypted.byteLength)
    result.set(iv)
    result.set(new Uint8Array(encrypted), iv.length)
    return result
}

/**
 * @method decrypt
 * @param data - The data to decrypt
 * @param key  - The key to decrypt the data with
 * @returns The decrypted result of the data
 */
export async function decrypt(data: Uint8Array, key: CryptoKey): Promise<string> {
    const iv = data.slice(0, 12)
    const encrypted = data.slice(12)

    const decrypted = await crypto.subtle.decrypt(
        { name: "AES-GCM", iv },
        key,
        encrypted
    )

    const decoder = new TextDecoder()
    return decoder.decode(decrypted)
}