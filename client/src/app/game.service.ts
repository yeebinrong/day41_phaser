import { Injectable } from '@angular/core';
import { Game } from 'phaser';
import { Subject } from 'rxjs/internal/Subject';
import { v4 as uuidv4 } from 'uuid';
import { MainScene } from './components/game/scenes/main.scene';
import { BaseMessage, MSG_REQ_DESTROY, MSG_REQ_MOVEMENT, MSQ_REQ_COLLECT } from './models';

@Injectable()
export class GameService {
  private ws: WebSocket = null
  game: Game
  created = false
  event = new Subject<BaseMessage>()
  id: string
  constructor() {}

  createGame() {
		if (this.created)
			return
    console.info("created")
		this.game = new Game({
      // width: 64 * 10, height: 64 * 10,
      width: 272, height: 208,
			parent: 'game',
      type: Phaser.AUTO,
      zoom: 2.5,
      scene: [ MainScene ],
      physics: {
        default: 'arcade',
        arcade: {
          debug:true
        }
      }
		})
	}


  onInitSocket(code) {
    console.info("creating connection")
    this.id = uuidv4().toString().substring(0, 8);
    this.ws = new WebSocket(`ws://localhost:3000/room/${code+ "+" + this.id}`)

    this.ws.onmessage = (payload:MessageEvent) => {
      const msg = JSON.parse(payload.data) as BaseMessage
      // console.info(msg)
      this.event.next(msg)
    }

    this.ws.onclose = () => {
      console.info("Close due to server")
      if (this.ws != null) {
        this.ws.close()
        this.ws = null
      }
    }
  }

  movePlayer(key, player) {
    const msg = {
      type: MSG_REQ_MOVEMENT,
      // player: this.player,
      id: this.id,
      key: key,
      x: player.me.x,
      y: player.me.y,
      gridx: player.me.gridPos.x,
      gridy: player.me.gridPos.y
    }
    this.ws.send(JSON.stringify(msg))
  }

  destroyItem(x, y) {
    const msg = {
      type: MSG_REQ_DESTROY,
      x,
      y
    }
    this.ws.send(JSON.stringify(msg))
  }

  collectItem(x, y, id, name) {
    const msg = {
      type: MSQ_REQ_COLLECT,
      x,
      y,
      id,
      name
    }
    this.ws.send(JSON.stringify(msg))
  }

  getId() {
    return this.id
  }
}
