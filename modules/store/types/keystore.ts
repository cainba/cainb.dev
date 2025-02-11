export type KeyStat = {
    name: string
    key: Uint8Array<ArrayBufferLike>
    createdAt: string
    lastRotated: string
    keyIterations: number
}