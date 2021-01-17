const express = require('express')
const expressWS = require('express-ws')
const secure = require('secure-env')
const morgan = require('morgan')
const cors = require('cors')

const app = express()
const appWS = expressWS(app)

const PORT = parseInt(process.env.PORT) || 3000

const ROOMS = {}
const PLAYER_STATS = {}
const PLAYER_NO = {}
const BG_POS = {}

app.use(express.static(`${__dirname}/dist/client`))

app.ws('/room/:payload', (ws, req) => {
    console.info("connection incoming")
    const payload = req.params.payload.split('+')
    const code = payload[0]
    const id = payload[1]
    try {
        if (!ROOMS[code]) {
            initRoom(code)
            generateBricksPos(code)
        }
        ws.id = id
        ROOMS[code][id] = ws
        checkId(code, id, ws)
        initPlayer(code, ws)
        initBG_POS(code, ws)
        
    } catch (e) {
        console.info(e)
    }

    ws.on('message', (msg) => {
        console.info("MSG INCOMING",msg)
        processMessage(msg, code, id)
    })

    ws.on('close', () => {
        if (!!ROOMS[code][id]) {
            ROOMS[code][id].close()
            for (let i in PLAYER_NO[code]) {
                if (PLAYER_NO[code][i] == id) {
                    PLAYER_NO[code][i] = ''
                }
                console.info(i)
            }
            delete ROOMS[code][id]
            delete PLAYER_STATS[code][id]
            const msg = JSON.stringify({
                type: "player-remove",
                msg: {
                    id: id
                }
            })
            console.info("deleting player")
            broadcastMsg(code, msg)
        }
    })
})

// Setup the variables for a new room
const initRoom = (code) => {
    ROOMS[code] = {}
    PLAYER_STATS[code] = {}
    PLAYER_NO[code] = {
        p1: '',
        p2: '',
        p3: '',
        p4: ''
    }
}

const processMessage = (payload, code, id) => {
    const msg = JSON.parse(payload)
    switch (msg.type) {
        case 'player-move':
            const init_resp = JSON.stringify({
                type: 'move-player',
                msg : {
                    id: msg.id,
                    key: msg.key,
                    x: msg.x,
                    y: msg.y
                }
            })
            PLAYER_STATS[code][id].x = msg.gridx
            PLAYER_STATS[code][id].y = msg.gridy
            broadcastMsg(code, init_resp)
            break;
        case 'item-destroy':
                // const item
                console.info(msg)
                const block = BG_POS[code].find(e => {
                    return (e.x == msg.x && e.y == msg.y)
                })
                const index = BG_POS[code].indexOf(block)
                if (!!block) {
                    if (block.type == 'Bricks') {
                        const resp = JSON.stringify({
                            type: 'item-destroy',
                            msg: {
                                type: "Bricks",
                                x: block.x,
                                y: block.y,
                                spawn: block.spawn
                            }
                        })
                        if (block.spawn != 'null') {
                            BG_POS[code][index].type = block.spawn
                            BG_POS[code][index].spawn = 'null'
                        } else {
                            BG_POS[code].splice(index, 1)
                        }
                        broadcastMsg(code, resp)
                    }
                    else if (block.type != 'Bricks') {
                        // is a pickup item
                        const resp = JSON.stringify({
                            type:'item-destroy',
                            msg: {
                                type: "Pickup",
                                x: block.x,
                                y: block.y,
                                spawn: "null"
                            }
                        })
                        BG_POS[code].splice(index, 1)
                        broadcastMsg(code, resp)
                    }
                }
            break;
        case 'item-collect':
            const data = PLAYER_STATS[code][msg.id]
            console.info(data)
            switch (msg.name) {
                case 'PickupFire':
                    PLAYER_STATS[code][msg.id].bombSize += 1
                break;
                case 'PickupBomb':
                    PLAYER_STATS[code][msg.id].totalBombs += 1
                break;
                default:
                break;
            }
            const myresp = JSON.stringify({
                type:'update-stats',
                msg: {
                    id: msg.id,
                    x: msg.x,
                    y: msg.y,
                    stats: PLAYER_STATS[code][msg.id]
                }
            })
            broadcastMsg(code, myresp)
    }
}
// Initialise the positions of the bricks and walls
const generateBricksPos = (code) => {
    const pickupClasses = ["PickupBomb", "PickupFire"]
    for (let x = 0; x <= 17; x++) {
        for (let y = 0; y <= 13; y++) {
            const pos = {
                x: x,
                y: y,
                type: "Wall",
                spawn: "null",
            }
            if (!BG_POS[code]) {
                BG_POS[code] = []
            }
            if (x ==  0 || x == 16 || y == 0 || y == 12) {
                // outer wall
                BG_POS[code].push(pos)

            }
            else if ((x >= 0.1 && x < 17 && !(x%2) && (y > 0 && y < 11  && !(y%2)))) {
                // inner wall
                BG_POS[code].push(pos)
            }
            else if (x > 0 && x < 17 && y > 0 && y <= 13 && Math.random() > 0.25 && !(x == 1 && y == 1) && !(x == 15 && y == 11) && !(x == 15 && y == 1) && !(x == 1 && y == 11) && !(x == 1 && y == 2) && !(x == 2 && y == 1) && !(x == 14 && y == 11) && !(x == 14 && y == 1) && !(x == 2 && y == 11) && !(x == 15 && y == 10) && !(x == 15 && y == 2) && !(x == 1 && y == 10)) {
                pos.type = "Bricks",
                pos.spawn = Math.random() < 0.3 ? (pickupClasses[Math.floor(Math.random()*pickupClasses.length)]) : "null"
                BG_POS[code].push(pos)
            }
        }
    }
}
// Assigns an id to the player
const checkId = (code, id, ws) => {
    if (PLAYER_NO[code].p1 == '') {
        PLAYER_NO[code].p1 = id
        PLAYER_STATS[code][id] = {
            x: 1,
            y: 1,
            totalBombs: 1,
            bombSize: 2,
            speed: 50
        }
    } else if (PLAYER_NO[code].p2 == '') {
        PLAYER_NO[code].p2 = id
        PLAYER_STATS[code][id] = {
            x: 15,
            y: 1,
            totalBombs: 1,
            bombSize: 2,
            speed: 50
        }
    } else if (PLAYER_NO[code].p3 == '') {
        PLAYER_NO[code].p3 = id
        PLAYER_STATS[code][id] = {
            x: 1,
            y: 11,
            totalBombs: 1,
            bombSize: 2,
            speed: 50
        }
    } else if (PLAYER_NO[code].p4 == '') {
        PLAYER_NO[code].p4 = id
        PLAYER_STATS[code][id] = {
            x: 15,
            y: 11,
            totalBombs: 1,
            bombSize: 2,
            speed: 50
        }
    } else {
        // Room is full already
        ws.close()
    }
}
// send position of new player to all players
const initPlayer = (code, ws) => {
    for (let i in ROOMS[code]) {
        // send location of all players to connecting player
        const temp_id = ROOMS[code][i].id
        const msg = JSON.stringify({
            type: 'player-init',
            msg: {
                id: temp_id,
                stats: PLAYER_STATS[code][temp_id]
            }
        })
        if (ROOMS[code][i] != ws) {
            const msg2 = JSON.stringify({
                type: 'player-init',
                msg: {
                    id: ws.id,
                    stats: PLAYER_STATS[code][ws.id]
                }
            })
            console.info("INIT OTHER PLAYER",msg2)
            ROOMS[code][i].send(msg2)
        }
        console.info("INIT PLAYER",msg)
        ws.send(msg)
    }
}
// sends the position of blocks to all players
const initBG_POS = (code, ws) => {
    const msg = JSON.stringify({
        type: 'bg-init',
        msg: BG_POS[code]
    })
    ws.send(msg)
}
const broadcastMsg = (code, msg) => {
    for (let i in ROOMS[code]) {
        ROOMS[code][i].send(msg)
    }
}

app.listen(PORT, () => {
    console.info(`Application is listening PORT ${PORT} at ${new Date()}`)
})