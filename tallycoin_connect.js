const express = require('express')
const jsonParser = require('body-parser').json()
const fs = require('fs')
const WebSocket = require('ws')
const lnService = require('ln-service')
const server = require('http').createServer()
const shajs = require('sha.js')

const app = express()
let ws, wstimer, connected = 'N', users = [], keys = {}

// Utils
const writeConfig = update => {
  const config = JSON.stringify(Object.assign(keys, update), null, 2)
  fs.writeFile(CONFIG_FILE, config, err => {
    if (err) console.error(err)
  })
}

const passwdHash = text => shajs('sha256').update(text).digest('hex')

const base64FromFile = file => Buffer.from(fs.readFileSync(file)).toString('base64')

// Load config from file and use environment variables as overrides
const {
  TALLYCOIN_APIKEY,
  TALLYCOIN_PASSWD,
  TALLYCOIN_PASSWD_CLEARTEXT,
  LND_TLSCERT_PATH,
  LND_MACAROON_PATH,
  LND_SOCKET = '127.0.0.1:10009',
  CONFIG_FILE = 'tallycoin_api.key',
  PORT = 8123
} = process.env

try {
  keys = JSON.parse(fs.readFileSync(CONFIG_FILE, 'utf8'))
} catch (err) {
  console.error('Could not read config file:', err.message)
}

// override from env
if (LND_TLSCERT_PATH) keys.tls_cert = base64FromFile(LND_TLSCERT_PATH)
if (LND_MACAROON_PATH) keys.macaroon = base64FromFile(LND_MACAROON_PATH)

// override unless customized
if (!keys.lnd_socket && LND_SOCKET) keys.lnd_socket = LND_SOCKET
if (!keys.tallycoin_api && TALLYCOIN_APIKEY) keys.tallycoin_api = TALLYCOIN_APIKEY
if (!keys.tallycoin_passwd && TALLYCOIN_PASSWD) keys.tallycoin_passwd = TALLYCOIN_PASSWD
if (!keys.tallycoin_passwd && TALLYCOIN_PASSWD_CLEARTEXT) keys.tallycoin_passwd = passwdHash(TALLYCOIN_PASSWD_CLEARTEXT)

writeConfig(keys)

// Create a server for transaction and setup pages
app.set('trust proxy', true)

app.use('/assets', express.static(__dirname + '/assets'))

app.get('/', (req, res) => {
  if (users.includes(req.ip) || !keys.tallycoin_passwd) {
    res.sendFile(__dirname + '/index.html')
  } else {
    res.sendFile(__dirname + '/login.html')
  }
})

server.on('request', app)

// Retrieve invoice list from LND
app.post('/list', jsonParser, (req, res) => {
  const { lnd } = lnService.authenticatedLndGrpc({
    cert: keys.tls_cert,
    macaroon: keys.macaroon,
    socket: keys.lnd_socket
  })

  lnService.getInvoices({ lnd }, (err, invoices) => {
    if (err) {
      const [code, name, { err: { details } }] = err
      res.status(code).json({ error: details })
    } else {
      res.json(invoices)
    }
  })
})

// Confirm sync connection to Tallycoin server
app.post('/sync', jsonParser, (req, res) => {
  let lnd_status = 'Y'
  if (keys.macaroon == '' || keys.tls_cert == '' || keys.tls_cert == null || keys.macaroon == null) {
    lnd_status = 'N'
  }
  res.json({
    sync: connected,
    api: keys.tallycoin_api,
    lnd: lnd_status
  })
})

// Login when password is set
app.post('/login', jsonParser, (req, res) => {
  if (passwdHash(req.body.passwd) == keys.tallycoin_passwd) {
    users.push(req.ip)
    res.json({ login_state: 'Y' })
  } else {
    res.json({ login_state: 'N' })
  }
})

// Save API from setup page
app.post('/save_api', jsonParser, (req, res) => {
  writeConfig({
    tallycoin_api: req.body.api
  })
})

// Save password from setup page
app.post('/save_passwd', jsonParser, (req, res) => {
  writeConfig({
    tallycoin_passwd: passwdHash(req.body.passwd)
  })
})

// start connection to Tallycoin server
start_websocket()

// Start server
server.listen(PORT, () => {
  console.log(`Running on http://localhost:${PORT}`)
})

// Websocket connection
function start_websocket() {
  console.log('Starting websocket')

  clearInterval(wstimer)
  ws = new WebSocket('wss://ws.tallycoin.app:8123/')
  let restarting

  // send setup message and API key every 20 seconds to keep a live connection
  ws.on('open', function open() {
    restarting = 'N'
    connected = 'Y'

    ws.send(JSON.stringify({ setup: keys.tallycoin_api }))

    wstimer = setInterval(() => {
      if (ws.readyState == 1) {
        ws.send(JSON.stringify({ ping: keys.tallycoin_api }))
      }
    }, 20000)
  })

  // Parse incoming message
  ws.on('message', function incoming(data) {
    const msg = JSON.parse(data)
    lightning(msg.type, msg)
  })

  // Error handling. Try reconnect every 10 seconds.
  ws.on('close', function close(e) {
    clearInterval(wstimer)
    connected = 'N'
    if (restarting != 'Y') {
      restarting = 'Y'
      console.log('Close websocket')
      setTimeout(start_websocket, 10000)
    }
  })

  ws.on('error', function error(e) {
    clearInterval(wstimer)
    connected = 'N'
    if (restarting != 'Y') {
      restarting = 'Y'
      setTimeout(start_websocket, 10000)
    }
  })
}

// Parse incoming messages and reply to Tallycoin server
function lightning(type, data) {
  const { lnd } = lnService.authenticatedLndGrpc({
    cert: keys.tls_cert,
    macaroon: keys.macaroon,
    socket: keys.lnd_socket
  })

  // When message 'payment_create' received, get fresh invoice from LND and send response to Tallycoin server
  if (type == 'payment_create') {
    lnService.createInvoice({ lnd, is_including_private_channels: true, is_fallback_included: true, description: data.description, tokens: data.amount }, (err, invoice) => {
      ws.send(JSON.stringify({
        type: 'payment_data',
        id: invoice['id'],
        chain_address: invoice['chain_address'],
        payment_request: invoice['request'],
        api_key: keys.tallycoin_api,
        unique_id: data.unique_id
      }))
    })
  }

  // When message 'payment_verify' received, check payment status of specific invoice with LND and send response to Tallycoin server
  if (type == 'payment_verify') {
    lnService.getInvoice({ lnd, id: data.inv_id }, (err, invoice) => {
      const received = parseInt(invoice['received']) // amount received in satoshis
      const tokens = parseInt(invoice['tokens']) // amount requested in satoshis
      const status = received >= tokens ? 'paid' : 'unpaid'

      ws.send(JSON.stringify({
        type: 'payment_verify',
        id: invoice['id'],
        status: status,
        amount: tokens,
        api_key: keys.tallycoin_api,
        unique_id: data.unique_id
      }))
    })
  }
}
