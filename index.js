const fs = require('fs')
const path = require('path')
const express = require('express')
const WebSocket = require('ws')
const readline = require('readline')

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
  prompt: 'Human '
})

const wss = new WebSocket.Server({ port: 5001 })
const app = express()

app.use(express.static(path.join(__dirname, 'public')))
app.listen(5000)

const state = {
  ws: null,
  looking: false,
  username: 'human',
  session: Math.random().toString(16).slice(2)
}

let db = {
  file: 'db.json',
  store: {}
}

function clear() {
  readline.clearLine(process.stdout, 0)
  readline.cursorTo(process.stdout, 0)
}

function log(who, message) {
  clear()
  process.stdout.write(`${who} ${ message }\n`)
  rl.prompt()
}

rl.on('line', (line) => {
  if (line.trim() === '/exit') {
    return exit()
  } else if (line.trim() === '/start') {
    return start()
  }

  const msg = {
    type: 'chat-message',
    message: line.trim(),
    username: state.username,
    timestamp: Date.now()
  }

  if (state.ws) {
    state.ws.send(JSON.stringify(msg))
    store(msg)
  }

  rl.prompt()
})

wss.on('connection', (ws) => {
  if (state.ws || !state.looking) {
    return ws.terminate()
  }

  state.ws = ws

  ws.send(JSON.stringify({ type: 'hello' }))
  rl.prompt()

  ws.on('message', async (data) => {
    const msg = JSON.parse(data)
    store(msg)

    if (msg.type === 'chat-message') {
      ws.send(data)
      log('Computer', msg.message)
    }
  })

  ws.on('close', () => {
    if (state.looking) {
      state.ws = null
      connect()
    }
  })
})

process.on('SIGINT', () => {
  return process.exit(0)
})

function exit() {
  if (state.ws) {
    state.ws.send(JSON.stringify({ type: 'exit' }))
  }

  state.ws = null
  state.looking = false

  restart()
}

function start () {
  state.looking = true
  state.session = Math.random().toString(16).slice(2)
  process.stdout.write('\x1Bc')
  connect()
}

function restart() {
  process.stdout.write('\x1Bc')

  setTimeout(() => {
    process.stdout.write('Type /start to start a conversation.\n')
    rl.prompt()
  }, 50)
}

function connect () {
  const c = ['Connecting', 'Connecting.', 'Connecting..', 'Connecting...']
  let counter = 0

  const interval = setInterval(() => {
    if (state.ws) {
      return clearInterval(interval)
    }

    process.stdout.clearLine()
    process.stdout.write(`\r${ c[counter++] }`)
    counter = counter % c.length
  }, 500)
}

function load () {
  fs.readFile(db.file, 'utf8', (err, data) => {
    if (err) return
    if (data) db.store = JSON.parse(data)
  })
}

function store (entry) {
  if (!db.store[state.session]) {
    db.store[state.session] = []
  }

  db.store[state.session].push(entry)
  fs.writeFile(db.file, JSON.stringify(db.store, null, 2), 'utf8', (err, data) => {
    if (err) console.log(err)
  })
}

load()
restart()
