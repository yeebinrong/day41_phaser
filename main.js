const express = require('express')
const expressWS = require('express-ws')
const secure = require('secure-env')
const morgan = require('morgan')
const cors = require('cors')

const app = express()
const PORT = parseInt(process.env.PORT) || 3000

app.listen(PORT, () => {
    console.info(`Application is listening PORT ${PORT} at ${new Date()}`)
})