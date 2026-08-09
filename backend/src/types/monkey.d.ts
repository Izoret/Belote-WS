declare global {
    interface Map<K, V> {
        empty(): boolean
    }
}

Map.prototype.empty = function <K, V>(this: Map<K, V>): boolean {
    return this.size === 0
}

import 'ws'

declare module 'ws' {
    interface WebSocket {
        id: string,
        roomCode?: string
    }
}

