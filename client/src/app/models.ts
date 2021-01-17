import { Injector } from "@angular/core"

export const MSG_PLAYER_INIT = 'player-init'
export const MSG_BG_INIT = 'bg-init'
export const MSG_PLAYER_REMOVE = 'player-remove'

export const MSG_MOVE_PLAYER = 'move-player'

export const MSG_REQ_MOVEMENT = 'player-move'
export const MSG_REQ_DESTROY = 'item-destroy'
export const MSQ_REQ_COLLECT = 'item-collect'
export const MSG_UPDATE_STATS = 'update-stats'

export const SCENE_MAIN = 'main'

export const IMG_PLAYER = 'player'
export const IMG_ENV = 'env'

export interface BaseMessage {
    type: string,
    msg: any
}

export class Globals {
	static injector: Injector
}