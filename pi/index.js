require('dotenv').config()
const fs = require('fs')
const WebSocket = require('ws')
const readline = require('readline')
const AWS = require('aws-sdk')
const Gpio = require('onoff').Gpio

AWS.config = {
  region: 'us-east-1',
  sslEnabled: true
}

const mturk = new AWS.MTurk({ endpoint: 'https://mturk-requester-sandbox.us-east-1.amazonaws.com' })
const sensor = new Gpio(3, 'in', 'rising')

const state = {
  ws: new WebSocket('wss://cnrd.computer/turing-test-ws/'),
  looking: false,
  connected: false,
  session: null,
  tasks: []
}

let db = {
  file: 'db.json',
  store: {}
}

state.ws.on('open', () => {
  state.ws.send(JSON.stringify({ type: 'human' }))
})

let debounce, pulses = 0

sensor.watch((err, value) => {
  if (err) return
  if (!state.looking && value) {
    if (debounce) {
      clearTimeout(debounce)
    }
    pulses++
    debounce = setTimeout(() => {
      if (pulses === 5) start(1)
      pulses = 0
    }, 200)
  }
})

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
  prompt: 'Human '
})

function log (who, message) {
  readline.clearLine(process.stdout, 0)
  readline.cursorTo(process.stdout, 0)

  process.stdout.write(`${who} ${ message }\n`)
  rl.prompt(true)
}

function exit (send = true) {
  if (send && state.connected) {
    state.ws.send(JSON.stringify({ type: 'exit' }))
  }

  state.ws = null
  state.connected = false
  state.looking = false

  restart()
}

function start (payload) {
  state.looking = true
  state.session = Math.random().toString(16).slice(2)

  state.ws.send(JSON.stringify({ type: 'looking', session: state.session }))

  process.stdout.write('\x1Bc')
  connect()
  create(payload)
}

function restart() {
  process.stdout.write('\x1Bc')

  setTimeout(() => {
    process.stdout.write('Insert a 1€ coin to start the conversation.\n')
  }, 50)
}

function connect () {
  const c = ['Connecting', 'Connecting.', 'Connecting..', 'Connecting...']
  let counter = 0

  const interval = setInterval(() => {
    if (!state.looking) {
      return clearInterval(interval)
    }

    process.stdout.clearLine()
    process.stdout.write(`\r${ c[counter++] }`)
    counter = counter % c.length
  }, 500)
}

function load () {
  fs.readFile(db.file, 'utf8', (err, data) => {
    if (err) {
      fs.writeFile(db.file, '{}', (err) => {
        if (err) return
      })
    }

    if (data) {
      db.store = JSON.parse(data)
    }
  })
}

function store (entry, session = state.session) {
  if (!db.store[session]) {
    db.store[session] = []
  }

  db.store[session].push(entry)
  fs.writeFile(db.file, JSON.stringify(db.store, null, 2), 'utf8', (err, data) => {
    if (err) return
  })
}

function create (reward) {
  const params = {
    Title: 'Conversation (text chat) with a person currently visiting an art exhibition',
    Description: 'You will chat with a person that will currently be at an art exhibition. The chat doesn\'t have to be about anything specific, just feel free to talk.',
    LifetimeInSeconds: 60 * 20,
    AssignmentDurationInSeconds: 60 * 30,
    AutoApprovalDelayInSeconds: 60 * 60 * 5,
    MaxAssignments: 1,
    Reward: reward.toString(),
    HITLayoutId: '3JWG6S58288SOR3FHJY8F86R9Q5OPT'
  }

  mturk.createHIT(params, (err, data) => {
    if (err) return
    state.tasks.push(data.HIT)
    store(data.HIT)
  })
}

function approve () {
  mturk.listHITs({}, (err, data) => {
    if (err) return

    data.HITs.forEach((hit) => {
      mturk.listAssignmentsForHIT({ HITId: hit.HITId }, (err, data) => {
        if (err) return
  
        data.Assignments.forEach((assignment) => {
          if (assignment.AssignmentStatus !== 'Submitted') return

          [username, session] = assignment.Answer.match(/(?<=<FreeText>).*?(?=<\/FreeText>)/gs)[0].split(',')
          
          if (!db.store[session]) return
          if (db.store[session][db.store[session].length - 1].AssignmentId) return
          store(assignment, session)

          if (db.store[session].length > 5) {
            mturk.approveAssignment({
              AssignmentId: assignment.AssignmentId,
              RequesterFeedback: 'Thank you very much for ur time :-)'
            }, (err, data) => {
              if (err) return
            })
          }
        })
      })
    })
  })
}

rl.on('line', (line) => {
  if (!state.connected) {
    readline.cursorTo(process.stdout, 0, 1)
    readline.clearScreenDown(process.stdout)
    return
  }

  if (line.trim() === '/exit') {
    return exit()
  } else if (line.trim() === '/cu') {
    return process.exit(0)
  }

  const msg = {
    type: 'message',
    username: 'human',
    message: line.trim(),
    timestamp: Date.now()
  }

  if (state.connected) {
    state.ws.send(JSON.stringify(msg))
    store(msg)
  }

  rl.prompt()
})

state.ws.on('message', (data) => {
  const msg = JSON.parse(data)
  store(msg)

  if (msg.type === 'hello') {
    if (msg.session === state.session) {
      state.connected = true
    }
  }

  if (msg.type === 'message') {
    log('Computer', msg.message)
  } else if (msg.type === 'exit') {
    exit(false)
  }
})

load()
restart()

setInterval(() => {
  approve()
}, (1000 * 60) * 1)
