import 'ws'

declare module 'ws' {
    interface WebSocket {
        id: string,
        roomCode?: string
    }
}
