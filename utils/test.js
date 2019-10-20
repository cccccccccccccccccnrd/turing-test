require('dotenv').config()
const path = require('path')
const fs = require('fs')
const WebSocket = require('ws')
const readline = require('readline')
const AWS = require('aws-sdk')

AWS.config = {
  region: 'us-east-1',
  sslEnabled: true
}

/* https://mturk-requester-sandbox.us-east-1.amazonaws.com, https://mturk-requester.us-east-1.amazonaws.com */
const mturk = new AWS.MTurk({ endpoint: 'https://mturk-requester-sandbox.us-east-1.amazonaws.com' })

const state = {
  ws: new WebSocket('wss://cnrd.computer/turing-test-ws/'),
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

state.ws.on('error', (err) => {
  return
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

  state.connected = false

  restart()
}

function start (payload) {
  state.session = Math.random().toString(16).slice(2)
  state.ws.send(JSON.stringify({ type: 'looking', session: state.session }))

  process.stdout.write('\x1Bc')
  connect()
  create(payload)
}

function restart() {
  process.stdout.write('\x1Bc')

  setTimeout(() => {
    process.stdout.write('Insert a 1€ coin to have a conversation.\n')
  }, 50)
}

function connect () {
  const c = ['Connecting', 'Connecting.', 'Connecting..', 'Connecting...']
  let counter = 0

  const interval = setInterval(() => {
    if (state.connected) {
      process.stdout.write('\x1Bc')
      log('Computer', 'hi')
      rl.prompt(true)
      return clearInterval(interval)
    }

    process.stdout.clearLine()
    process.stdout.write(`\r${ c[counter++] }`)
    counter = counter % c.length
  }, 500)
}

function load () {
  fs.readFile(path.join(__dirname, db.file), 'utf8', (err, data) => {
    if (err) {
      fs.writeFile(path.join(__dirname, db.file), '', (err) => {
        if (err) return console.log(err)
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
  fs.writeFile(path.join(__dirname, db.file), JSON.stringify(db.store, null, 2), 'utf8', (err, data) => {
    if (err) return console.log(err)
  })
}

function create (reward) {
  const params = {
    Title: 'Have a casual conversation (~5min)',
    Description: 'You will chat with a person that is currently visiting an art exhibition. The chat doesn\'t have to be about anything specific, just feel free to talk.',
    LifetimeInSeconds: 60 * 60,
    AssignmentDurationInSeconds: 60 * 30,
    AutoApprovalDelayInSeconds: 60 * 60 * 5,
    MaxAssignments: 1,
    Reward: reward.toString(),
    HITLayoutId: '3R24I9HZC95ECZKM8WJMEKHRDVLDUG' /* 3R24I9HZC95ECZKM8WJMEKHRDVLDUG, 35C9SNQSQ1CEZVATZ9DAQG9BDC95IU */
  }

  mturk.createHIT(params, (err, data) => {
    if (err) return console.log(err)
    state.tasks.push(data.HIT)
    store(data.HIT)
  })
}

function approve () {
  mturk.listHITs({}, (err, data) => {
    if (err) return console.log(err)

    data.HITs.forEach((hit) => {
      mturk.listAssignmentsForHIT({ HITId: hit.HITId }, (err, data) => {
        if (err) return console.log(err)
  
        data.Assignments.forEach((assignment) => {
          if (assignment.AssignmentStatus !== 'Submitted') return

          [username, session] = assignment.Answer.match(/(?<=<FreeText>).*?(?=<\/FreeText>)/gs)[0].trim().split(',')
          
          if (!db.store[session]) return
          if (db.store[session][db.store[session].length - 1].AssignmentId) return
          store(assignment, session)

          if (db.store[session].length > 5) {
            mturk.approveAssignment({
              AssignmentId: assignment.AssignmentId,
              RequesterFeedback: 'Thank you very much for ur time :-)'
            }, (err, data) => {
              if (err) return console.log(err)
            })
          }
        })
      })
    })
  })
}

rl.on('line', (line) => {
  if (line.trim() === '/cu') {
    return process.exit(0)
  } else if (line.trim() === '/stanni') {
    start(1)
  }

  if (!state.connected) {
    readline.cursorTo(process.stdout, 0, 1)
    readline.clearScreenDown(process.stdout)
    return
  }

  if (line.trim() === '') {
    process.stdout.clearLine()
    readline.moveCursor(process.stdout, 0, -1)
    rl.prompt()
    return
  }

  if (line.trim() === '/exit') {
    return exit()
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

/* setInterval(() => {
  approve()
}, (1000 * 60) * 1) */
