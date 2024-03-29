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
      console.log('human connected')
      return state.human = ws
    } else if (msg.type === 'computer') {
      if (!state.looking) {
        return ws.terminate()
      } else {
        console.log('computer connected')
        return ws.send(JSON.stringify({ type: 'hello', session: state.session }))
      }
    }

    if (msg.type === 'looking') {
      console.log('looking')
      state.looking = true
      state.session = msg.session
    }

    if (msg.type === 'confirm') {
      if (state.computer) {
        ws.send(JSON.stringify({ type: 'reset' }))
        ws.terminate()
      } else {
        console.log('computer confirmed')
        state.computer = ws
        state.human.send(JSON.stringify({ type: 'hello', session: state.session }))
        return state.looking = false
      }
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
        state.session = null
      } else {
        state.human.send(JSON.stringify({ type: 'exit' }))
        state.computer = null
        state.session = null
      }
    }
  })

  ws.on('close', () => {
    if (ws === state.computer) {
      console.log('computer ws disconnect')
      state.computer = null
      if (!state.looking) {
        state.human.send(JSON.stringify({ type: 'exit' }))
      }
    } else if (ws === state.human) {
      console.log('human ws disconnect')
      state.human = null
    }
  })
})
