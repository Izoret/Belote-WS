import {Room} from './types/types.js'

/**
 * Centralized application state.
 * The 'rooms' Map stores all active game rooms.
 */
export const rooms = new Map<string, Room>()
