interface CacheEntry<T> {
    value: T
    timeStamp: number
}

export default class WebCache<T> {
    private cache: Map<string, CacheEntry<T>> = new Map()
    private ttl: number

    constructor(ttl: number = 1000 * 60 * 60) {
        this.ttl = ttl
    }

    get(key: string): T | undefined {
        const entry = this.cache.get(key)
        if (entry && Date.now() - entry.timeStamp < this.ttl) {
            return entry.value
        }
        return undefined
    }

    set(key: string, value: T): void {
        this.cache.set(key, { value, timeStamp: Date.now() })
    }

    clear(): void {
        this.cache.clear()
    }

    delete(key: string): void {
        this.cache.delete(key)
    }
}