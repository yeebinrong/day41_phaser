import { Scene } from "phaser";
import { Subscription } from "rxjs";
import { GameService } from "src/app/game.service";
import { Globals, IMG_ENV, IMG_PLAYER, MSG_BG_INIT, MSG_MOVE_PLAYER, MSG_PLAYER_INIT, MSG_PLAYER_REMOVE, MSG_REQ_DESTROY, MSG_UPDATE_STATS, SCENE_MAIN } from "src/app/models";
import { ScreenMapper } from "../scene-mapper";

export class MainScene extends Scene {
    screenMap: ScreenMapper
    game$: Subscription
    gameSvc: GameService
    id:string = ''
    players = {}
    bg = []

    constructor () {
        super(SCENE_MAIN)
        this.gameSvc = Globals.injector.get(GameService)
        this.id = this.gameSvc.getId()
        this.game$ = this.gameSvc.event.subscribe(
            (payload) => {
                switch (payload.type) {
                    case MSG_PLAYER_INIT:
                        console.info("PHASE1",payload.msg)
                        if (this.id == payload.msg.id) {
                            console.info("PHASE2")
                            this.players[this.id] = payload.msg
                        } else {
                            this.players[payload.msg.id] = payload.msg
                            if (!!this.screenMap) {
                                console.info("PHASE X")
                                const player = new Player(this, this.players[payload.msg.id].stats.x, this.players[payload.msg.id].stats.y, this.screenMap, payload.msg)
                                this.players[payload.msg.id].player = player
                                this.screenMap.placeObjectAt(this.players[payload.msg.id].stats.x, this.players[payload.msg.id].stats.y, player.me)
                            }
                        }
                        break;
                    case MSG_BG_INIT:
                        this.bg = payload.msg
                        break;
                    case MSG_MOVE_PLAYER:
                        this.players[payload.msg.id].player.me.x = payload.msg.x
                        this.players[payload.msg.id].player.me.y = payload.msg.y
                        switch (payload.msg.key) {
                            case "up_down":
                                this.players[payload.msg.id].player.isUp = true
                                this.players[payload.msg.id].player.me.anims.play('up')
                            break;
                            case "up_up":
                                this.players[payload.msg.id].player.isUp = false
                                this.players[payload.msg.id].player.me.body.velocity.y = 0
                            break;
                            case "down_down": 
                            this.players[payload.msg.id].player.isDown = true
                            this.players[payload.msg.id].player.me.anims.play('down')
                            break;
                            case "down_up":
                                this.players[payload.msg.id].player.isDown = false
                                this.players[payload.msg.id].player.me.body.velocity.y = 0
                            break; 
                            case "left_down":
                                this.players[payload.msg.id].player.isLeft = true
                                this.players[payload.msg.id].player.me.anims.play('side')
                            break;
                            case "left_up":
                                this.players[payload.msg.id].player.isLeft = false
                                this.players[payload.msg.id].player.me.body.velocity.x = 0
                            break;
                            case "right_down":
                                this.players[payload.msg.id].player.isRight = true
                                this.players[payload.msg.id].player.me.anims.play('side')
                            break;
                            case "right_up":
                                this.players[payload.msg.id].player.isRight = false
                                this.players[payload.msg.id].player.me.body.velocity.x = 0
                            break;
                            case "space":
                                this.players[payload.msg.id].player.dropBomb()
                            break;
                        }
                        break;
                    case MSG_PLAYER_REMOVE:
                        if (!!this.players[payload.msg.id]) {
                            this.players[payload.msg.id].player.me.destroy()
                            delete this.players[payload.msg.id]
                        }
                        break;
                    case MSG_REQ_DESTROY:
                        console.info(payload.msg)
                        const item = this.screenMap.getAt(payload.msg.x, payload.msg.y, null)
                        if (payload.msg.spawn != "null") {
                            let pickupClass;
                            if (payload.msg.spawn == 'PickupFire') {
                                pickupClass = PickupFire
                            } else if (payload.msg.spawn == 'PickupBomb') {
                                pickupClass = PickupBomb
                            }
                            const pickup = new (pickupClass)(this, item.place.x, item.place.y, this.screenMap, this.gameSvc);
                            this.screenMap.add(pickup)
                        }
                        this.screenMap.remove(item)
                        item.destroy()
                        break;
                    case MSG_UPDATE_STATS:
                        console.info(payload)
                        const collected = this.screenMap.getAt(payload.msg.x, payload.msg.y, this.players[payload.msg.id].player.me)
                        this.screenMap.remove(collected)
                        collected.destroy()
                        this.players[payload.msg.id].player.totalBombs = payload.msg.stats.totalBombs
                        this.players[payload.msg.id].player.speed = payload.msg.stats.speed
                        this.players[payload.msg.id].player.bombSize = payload.msg.stats.bombSize
                        break;
                    default:
                        break;
                }
            }
        )
    }

    preload () {
        console.info("PHASE PRELOAD")
        this.load.spritesheet(IMG_PLAYER, 'assets/images/myspritesheet_player.png',
            { frameWidth: 16, frameHeight: 24, endFrame: 40 })
        this.load.spritesheet(IMG_ENV, 'assets/images/myspritesheet_bomb.png',
            { frameWidth: 16, frameHeight: 16, endFrame: 40 })
    }

    create () {
        console.info("PHASE CREATE")
        this.screenMap = new ScreenMapper({
			columns: 17, rows: 13, scene: this
        })

        // Draw grids on
        // this.screenMap.drawGrids()

        for (let i of this.bg) {
            switch (i.type) {
                case "Wall":
                    const wall = new Wall(this, i.x, i.y, this.screenMap)
                    // this.item
                    this.screenMap.add(wall.me)
                    break;
                case "Bricks":
                    const bricks = new Bricks(this, i.x, i.y, this.screenMap, this.gameSvc)
                    bricks.me.drop = i.spawn
                    this.screenMap.add(bricks.me)
            }
        }

        for (let i in this.players) {
            const player = new Player(this, this.players[i].stats.x, this.players[i].stats.y, this.screenMap, this.players[i])
            this.players[i].player = player
            this.screenMap.placeObjectAt(this.players[i].stats.x, this.players[i].stats.y, player.me)
        }

        const upKey = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.W)
        const downKey = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.S)
        const leftKey = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.A)
        const rightKey = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.D)
        const spaceBar = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.SPACE)

        if (!!this.players[this.id]) {
            upKey.on('down', (event) => {
                console.info("MOVE UP")
                if(this.players[this.id].player.alive) {
                    this.gameSvc.movePlayer('up_down', this.players[this.id].player)
                }
            })
            upKey.on('up', (event) => {
                if(this.players[this.id].player.alive) {
                    this.gameSvc.movePlayer('up_up', this.players[this.id].player)
                }
            })
            downKey.on('down', (event) => {
                if(this.players[this.id].player.alive) {
                    this.gameSvc.movePlayer('down_down', this.players[this.id].player)
                }
            })
            downKey.on('up', (event) => {
                if(this.players[this.id].player.alive) {
                    this.gameSvc.movePlayer('down_up', this.players[this.id].player)
                }
            })
            leftKey.on('down', (event) => {
                if(this.players[this.id].player.alive) {
                    this.gameSvc.movePlayer('left_down', this.players[this.id].player)
                }
            })
            leftKey.on('up', (event) => {
                if(this.players[this.id].player.alive) {
                    this.gameSvc.movePlayer('left_up', this.players[this.id].player)
                }
            })
            rightKey.on('down', (event) => {
                if(this.players[this.id].player.alive) {
                    this.gameSvc.movePlayer('right_down', this.players[this.id].player)
                }
            })
            rightKey.on('up', (event) => {
                if(this.players[this.id].player.alive) {
                    this.gameSvc.movePlayer('right_up', this.players[this.id].player)
                }
            })
            spaceBar.on('down', (event) => {
                if(this.players[this.id].player.alive) {
                    this.gameSvc.movePlayer('space', this.players[this.id].player)
                }
            })
        }
    }

    update () {
        if (!!this.players[this.id]) {
            for (let i in this.players) {
                if (this.players[i].player) {
                    this.physics.collide(this.players[i].player.me, this.screenMap.items, null, null, this)
                    this.physics.overlap(this.players[i].player.me, this.screenMap.fires, () => this.checkplayer(this.players[i].player), null, this)
                    this.players[i].player.update()
                }
            }
        }
    }

    checkplayer(player) {
        const fire = this.screenMap.getFireAt(player.gridPos.x, player.gridPos.y, player.me);
        if (fire) {
            if (!fire.collect) {
                player.alive = false
                player.kill()
            }
        }
    }
}

class Entity extends Phaser.Physics.Arcade.Sprite {
    screenMap;
    gridPos;
    anchor;
    me
    blastThrough;
    constructor(game, x, y, grid, frame = 0) {
        super(game, x, y, grid, frame);
        // this.anchor = .5;
        this.screenMap = grid;
        
        if (!this.gridPos) {
            this.gridPos = new Phaser.Geom.Point(this.x, this.y);
        }
    }
    
    destroy() {
        this.screenMap.remove(this)
        super.destroy();
    }

    collect(player) {

    }
  }

class Player extends Entity {
    game;
    speed;
    totalBombs;
    currentBombs;
    bombSize;
    lastGridPos;
    blastThrough;
    alive = true;
    isUp = false;
    isDown = false;
    isLeft = false;
    isRight = false;
    id;

    constructor(game, x, y, grid, msg) {
        super(game, x, y, grid);
        this.game = game
        this.me = game.physics.add.sprite(0, 0, IMG_PLAYER)
        this.screenMap.placeObjectAt(x, y, this.me)
        this.speed = 50;
        this.totalBombs = msg.stats.totalBombs || 1;
        this.currentBombs = 0;
        this.bombSize = msg.stats.bombSize || 2;
        this.me.body.setCircle(6);
        this.me.body.offset = new Phaser.Math.Vector2(2,10)
        this.me.y = 20
        this.me.body.drag.set(768)
        this.lastGridPos = this.gridPos;
        this.me.gridPos = this.gridPos
        this.me.blastThrough = true;
        this.id = msg.id 
        this.me.kill = () => this.kill()

        this.me.anims.create({key:'up',frames: this.anims.generateFrameNumbers(IMG_PLAYER, {start: 30, end:34}), frameRate: 5, repeat: -1});
        this.me.anims.create({key:'side',frames: this.anims.generateFrameNumbers(IMG_PLAYER, {start: 15, end:20}), frameRate: 5, repeat: -1});
        this.me.anims.create({key:'down',frames: this.anims.generateFrameNumbers(IMG_PLAYER, {start: 2, end:6}), frameRate: 5, repeat: -1});
    }

    update() {
        super.update();
        if (!this.alive) {
            return;
        }
        if (this.isUp) {
            this.me.body.velocity.y = -this.speed
            this.me.body.velocity.x = 0
            if (this.me.anims.currentAnim.key != 'up') {
                this.me.anims.play('up')
            }
        }

        else if (this.isDown) {
            this.me.body.velocity.y = this.speed
            this.me.body.velocity.x = 0
            if (this.me.anims.currentAnim.key != 'down') {
                this.me.anims.play('down')
            }
        }

        else if (this.isLeft) {
            this.me.body.velocity.x = -this.speed
            this.me.body.velocity.y = 0
            this.me.flipX = true
            if (this.me.anims.currentAnim.key != 'side') {
                this.me.anims.play('side')
            }
        }

        else if (this.isRight) {
            this.me.body.velocity.x = this.speed
            this.me.body.velocity.y = 0
            this.me.flipX = false
            if (this.me.anims.currentAnim.key != 'side') {
                this.me.anims.play('side')
            }
        } else if (this.me.anims.currentAnim) {
            if (this.me.anims.currentAnim.key == 'up') {
                this.me.setFrame(29)
            } else if (this.me.anims.currentAnim.key == 'down') {
                this.me.setFrame(1) 
            } else if (this.me.anims.currentAnim.key == 'side'){
                this.me.setFrame(15)
            }
        }
        
        if (this.gridPos) {
            this.gridPos = this.screenMap.screenToGrid(this.me.body.position.x, this.me.body.position.y)
            this.me.gridPos = this.gridPos
        } 
        if (!(Phaser.Geom.Point.Equals(this.gridPos, this.lastGridPos))) {
            Phaser.Geom.Point.CopyFrom(this.gridPos, this.lastGridPos)
            this.checkGrid();
        }
    }

    kill () {
        this.me.body.moves = false
        this.screenMap.remove(this.me)
        this.alive = false
        this.me.destroy()
    }

    canPlaceBomb(place) {
        const item = this.screenMap.getAt(place.x, place.y, this.me);
        if (!item) {
        return true;
        }
        return false;
    }

    dropBomb() {    
        const place = this.gridPos;
        if (this.currentBombs < this.totalBombs && this.canPlaceBomb(place)) {
        const point = this.screenMap.screenToGrid(this.me.body.position.x, this.me.body.position.y)
        const bomb = new Bomb(this.game, point.x, point.y, this.screenMap, this);
        this.screenMap.add(bomb.me);
        }
    }

    checkGrid() {
        const item = this.screenMap.getAt(this.gridPos.x, this.gridPos.y, this.me);
        if (item) {
            if (item.collect) {
                item.collect(this);
            }
        }
    }
}

class Wall extends Entity {
    slack;
    constructor(game, x, y, grid) {
        super(game, x, y, grid, 0);
        this.me = game.physics.add.sprite(x, y, IMG_ENV)
        this.screenMap.placeObjectAt(this.x, this.y , this.me)
        this.me.setFrame(25)
        // this.me.body.moves = false
        this.me.body.immovable = true
        this.slack = 0.5;
        this.me.body.setSize(16 - this.slack, 16 - this.slack, true)
        this.me.kill = (owner) => this.kill(owner)
        this.me.dropPickup = (type) => this.dropPickup(type)
    }
    
    kill(owner) {
        // cannot be killed
    }

    dropPickup(type) {
    }

}

class Bricks extends Wall {
    game
    constructor(game, x, y, grid, private gameSvc:GameService) {
        super(game, x, y, grid);
        this.me.setFrame(26)
        this.game = game
        this.me.drop = 'null'
        this.me.place = this.gridPos
    }
    
    kill(owner) {
        if (owner.id == this.gameSvc.getId()) {
            this.gameSvc.destroyItem(this.x, this.y)
        }
    }
  }

  class Bomb extends Entity {
    owner;
    size;
    duration;
    explodeTimer;
    game
    constructor(game, x, y, grid, owner) {
        super(game, x, y, grid, 2);
        this.game = game
        this.me = game.physics.add.sprite(x, y, IMG_ENV)
        // game.physics.world.enableBody(this.me);
        this.screenMap.placeObjectAt(x, y, this.me)
        this.owner = owner;
        this.me.setFrame(0)
        this.me.body.immovable = true;
        this.me.body.moves = false;
        this.me.kill = () => this.kill()

        if (this.owner) {
            this.owner.currentBombs += 1;
        }
        
        this.size = this.owner.bombSize || 3;
        this.me.anims.create({key:'bomb',frames: this.anims.generateFrameNumbers(IMG_ENV, {start: 0, end:3}), frameRate: 3, repeat: -1});
        this.me.anims.play('bomb')
        this.duration = 3000 // in milliseconds
        // this.duration = 1000 // in milliseconds
        this.scene.time.addEvent({delay:this.duration, callback: () => this.explode()})
    }

    explode() {
            this.scene.time.removeEvent(this.explodeTimer)
            if (this.owner) {
                this.owner.currentBombs -= 1;
            }
            this.screenMap.remove(this.me)
            if (this.me.body) {
                const point = this.screenMap.screenToGrid(this.me.body.position.x, this.me.body.position.y)
                const explosion = new Explosion(this.game, point.x, point.y, this.screenMap, this.owner, this.size);
                this.me.destroy()
            }
    }

    kill () {
        this.explode();
    }

    // destroy() {
    //     this.explode();
    // }
  }

  class Explosion extends Entity {
    size;
    owner;
    duration;
    decayTimer;
    locs;
    blast = [];
    game;
    constructor(game, x, y, grid, owner, size = 3) {
        super(game, x, y, grid, 5);
        this.size = size;
        this.game = game
        this.owner = owner;

        this.duration = 500 //millisecond
        this.scene.time.addEvent({delay:this.duration, callback: () => this.destroy()})

        this.locs = this.getExplosionLocations(x,y);
        this.doExplosion();
    } 
  
    doExplosion() {
      this.blast = [];
      const blast = new Blast(this.game, this.x, this.y, this.screenMap, this.owner);
      blast.me.anims.create({key:'blast',frames: this.anims.generateFrameNumbers(IMG_ENV, {start: 10, end:14}), frameRate: 5, repeat: -1});
      blast.me.anims.play('blast')
      this.blast.push(blast)
      this.screenMap.addFire(blast.me);
  
      // Urgh. Improve plz.
      for (let i = 0; i < this.locs.left.length; i++) {
        const blast = new Blast(this.game, this.locs.left[i].x, this.locs.left[i].y, this.screenMap, this.owner);
        blast.me.angle = -90;
        if (i === this.size - 2) {
            blast.me.anims.create({key:'blast',frames: this.anims.generateFrameNumbers(IMG_ENV, {start: 5, end:9}), frameRate: 5, repeat: -1});
            blast.me.anims.play('blast')
        } else {
            blast.me.anims.create({key:'blast',frames: this.anims.generateFrameNumbers(IMG_ENV, {start: 20, end:24}), frameRate: 5, repeat: -1});
            blast.me.anims.play('blast')
        }
        this.blast.push(blast);
        this.screenMap.addFire(blast.me);
      }
  
      for (let i = 0; i < this.locs.right.length; i++) {
        const blast = new Blast(this.game, this.locs.right[i].x, this.locs.right[i].y, this.screenMap, this.owner);

        blast.me.angle = 90;
        if (i === this.size - 2) {
            blast.me.anims.create({key:'blast',frames: this.anims.generateFrameNumbers(IMG_ENV, {start: 5, end:9}), frameRate: 5, repeat: -1});
            blast.me.anims.play('blast')
        } else {
            blast.me.anims.create({key:'blast',frames: this.anims.generateFrameNumbers(IMG_ENV, {start: 20, end:24}), frameRate: 5, repeat: -1});
            blast.me.anims.play('blast')
        }
        this.blast.push(blast);
        this.screenMap.addFire(blast.me);
      }
  
      for (let i = 0; i < this.locs.up.length; i++) {
        const blast = new Blast(this.game, this.locs.up[i].x, this.locs.up[i].y, this.screenMap, this.owner);

        blast.me.angle = 0;
        if (i === this.size - 2) {
            blast.me.anims.create({key:'blast',frames: this.anims.generateFrameNumbers(IMG_ENV, {start: 5, end:9}), frameRate: 5, repeat: -1});
            blast.me.anims.play('blast')
        } else {
            blast.me.anims.create({key:'blast',frames: this.anims.generateFrameNumbers(IMG_ENV, {start: 20, end:24}), frameRate: 5, repeat: -1});
            blast.me.anims.play('blast')
        }
        this.blast.push(blast);
        this.screenMap.addFire(blast.me);
      }
  
      for (let i = 0; i < this.locs.down.length; i++) {
        const blast = new Blast(this.game, this.locs.down[i].x, this.locs.down[i].y, this.screenMap, this.owner);

        blast.me.angle = 180;
        if (i === this.size - 2) {
            blast.me.anims.create({key:'blast',frames: this.anims.generateFrameNumbers(IMG_ENV, {start: 5, end:9}), frameRate: 5, repeat: -1});
            blast.me.anims.play('blast')
        } else {
            blast.me.anims.create({key:'blast',frames: this.anims.generateFrameNumbers(IMG_ENV, {start: 20, end:24}), frameRate: 5, repeat: -1});
            blast.me.anims.play('blast')
        }
        this.blast.push(blast);
        this.screenMap.addFire(blast.me);
      }
    }
  
    getExplosionLocations(bomb_x,bomb_y) {
      const x = bomb_x;
      const y = bomb_y;
      const points = {
        left: [],
        right: [],
        up: [],
        down: []
      };
      const obstructed = {
        left: false,
        right: false,
        up: false,
        down: false
      }
  
      // Jesus, these explosion routines... gotta fix these :(
      for (let w = 1; w < this.size; w++) {
        let entity;
        if (!obstructed.right) {
            entity = this.screenMap.getAt(x + w, y);
          if (!entity || entity.blastThrough) {
            points.right.push(new Phaser.Geom.Point(x + w, y));
          }
          else {
            obstructed.right = true;

            if (entity.kill) {
                entity.kill(this.owner);
            }
          }
        }
  
        if (!obstructed.left) {
          entity = this.screenMap.getAt(x - w, y);

          if (!entity || entity.blastThrough) {
            points.left.push(new Phaser.Geom.Point(x - w, y));
          }
          else {
            obstructed.left = true;

            if (entity.kill) {
                entity.kill(this.owner);
            }
          }
        }
  
        if (!obstructed.down) {
          entity = this.screenMap.getAt(x, y + w);

          if (!entity || entity.blastThrough) {
            points.down.push(new Phaser.Geom.Point(x, y + w));
          }
          else {
            obstructed.down = true;

            if (entity.kill) {
                entity.kill(this.owner);
            }
          }
        }
  
        if (!obstructed.up) {
          entity = this.screenMap.getAt(x, y - w);
          
          if (!entity || entity.blastThrough) {
            points.up.push(new Phaser.Geom.Point(x, y - w));
          }
          else {
            obstructed.up = true;

            if (entity.kill) {
                entity.kill(this.owner);
            }
          }
        }
      }
      return points;
    }
  
    destroy() {
        this.scene.time.removeEvent(this.decayTimer)
        for (let i = 0; i < this.blast.length; i++) {
            this.screenMap.remove(this.blast[i].me)
            this.screenMap.removeFire(this.blast[i].me)
            this.blast[i].me.destroy();
        }
    }
    
    kill() {
      // cannot be killed
    }
  }

  class Blast extends Entity {
    frame
    slack;
    blastThrough;
    x;
    y;
    constructor(game, x, y, grid, owner) {
        super(game, x, y, grid, 0);
        this.x = x
        this.y = y
        this.me = game.physics.add.sprite(x, y, IMG_ENV)
        this.me.body.moves = false;
        // this.me.body.enable = false
        this.me.body.immovable = true;
        this.screenMap.placeObjectAt(this.x, this.y , this.me)
        this.me.setFrame(5)
        this.slack = 0.5;
        this.me.body.setSize(16 - this.slack, 16 - this.slack,true)
        this.blastThrough = true;

    }
    
    kill() {
      // cannot be killed
    }
    
    destroy() {
        this.me.body.enable = false;
        this.me.destroy()
        super.destroy()
    }
  }

  class Pickup extends Entity {
    slack;
    gameSvc;
    constructor(game, x, y, grid, index, gameSvc:GameService) {
      super(game, x, y, grid, index);
      if (new.target === Pickup) {
        throw new TypeError("Cannot construct Abstract instances directly");
      }
      this.gameSvc = gameSvc
      this.me = game.physics.add.sprite(x, y, IMG_ENV)
      this.screenMap.placeObjectAt(this.x, this.y , this.me)
      this.me.body.moves = false
      this.me.body.enable = false
      this.me.body.immovable = true
      this.slack = 0.5;
      this.me.body.setSize(16 - this.slack, 16 - this.slack, true)
      this.screenMap.add(this.me)
      this.me.collect = (player) => this.collect(player)
      this.me.kill = (owner) => this.kill(owner)
    }
    
    collect(owner) {
        // this.screenMap.remove(this.me)
        // this.me.destroy();
    }

    kill (owner) {
        if (owner.id == this.gameSvc.getId()) {
            this.gameSvc.destroyItem(this.x, this.y)
        }
    }
  }

  class PickupBomb extends Pickup {
      name;
    constructor(game, x, y, grid, gameSvc:GameService) {
      super(game, x, y, grid, 8, gameSvc);
      this.me.setFrame(31)
      this.name = 'PickupBomb'
    }
    
    collect(owner) {
        super.collect(owner);
        //   player.totalBombs += 1;
        if (owner.id == this.gameSvc.getId()) {
            this.gameSvc.collectItem(this.x, this.y, owner.id, this.name)
        }
    }
  }

  class PickupFire extends Pickup {
      name;
    constructor(game, x, y, grid, gameSvc:GameService) {
      super(game, x, y, grid, 9, gameSvc);
      this.me.setFrame(30)
      this.name = 'PickupFire'
    }
    
    collect(owner) {
        super.collect(owner);
    //   player.bombSize += 1;
        if (owner.id == this.gameSvc.getId()) {
            this.gameSvc.collectItem(this.x, this.y, owner.id, this.name)
        }
    }
  }