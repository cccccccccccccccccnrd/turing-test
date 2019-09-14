const path = require('path')
const express = require('express')
const WebSocket = require('ws')

const state = {
  human: null,
  computer: null,
  session: null,
  looking: false
}

const app = express()

app.use(express.static(path.join(__dirname, 'public')))
app.listen(4440)

const wss = new WebSocket.Server({ port: 4441 })

console.log(`Turing Test server running on port 4440 (4441)`)

wss.on('connection', (ws) => {
  ws.on('message', (data) => {
    const msg = JSON.parse(data)
    
    if (msg.type === 'human') {
      if (state.human) {
        return ws.terminate()
      } else {
        return state.human = ws
      }
    } else if (msg.type === 'computer') {
      if (!state.looking) {
        return ws.terminate()
      } else {
        state.computer = ws
        state.computer.send(JSON.stringify({ type: 'hello', session: state.session }))
        state.human.send(JSON.stringify({ type: 'hello', session: state.session }))
        return state.looking = false
      }
    }

    if (msg.type === 'looking') {
      state.looking = true
      state.session = msg.session
    }

    if (msg.type === 'message') {
      if (msg.username === 'human') {
        state.computer.send(data)
      } else {
        state.human.send(data)
      }
    }

    if (msg.type === 'exit') {
      if (msg.username === 'human') {
        state.computer.send(JSON.stringify({ type: 'exit' }))
        state.computer = null
      } else {
        state.human.send(JSON.stringify({ type: 'exit' }))
      }
    }
  })

  ws.on('close', () => {
    if (ws === state.computer) {
      console.log('computer ws disconnect')
    }
  })
})
