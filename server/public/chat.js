const app = new Vue({
  el: '#app',
  data: {
    socket: null,
    session: null,
    username: Math.random().toString(16).slice(2),
    message: '',
    info: 'There are no more of these HITs available.',
    /* info: 'confirm', */
    bubbles: [],
    hi: true
  },
  created: function () {
    const WS_URL = window.location.hostname === 'localhost' ? 'ws://localhost:4441' : 'wss://cnrd.computer/turing-test-ws/'
    this.socket = new WebSocket(WS_URL)

    this.socket.addEventListener('open', () => {
      this.socket.send(JSON.stringify({ type: 'computer' }))
    })

    this.socket.addEventListener('message', (event) => {
      const msg = JSON.parse(event.data)

      if (msg.type === 'message') {
        this.insert(msg.username, msg.message, msg.timestamp)
      } else if (msg.type === 'hello') {
        this.info = 'confirm'
        this.session = msg.session
      } else if (msg.type === 'exit') {
        this.info = `Person left the conversation.<br>This is your survey code: <mark>${ this.username },${ this.session }</mark>`
      } else if (msg.type === 'reset') {
        this.info = 'There are no more of these HITs available.'
      }
    })
  },
  methods: {
    send: function () {
      const msg = {
        type: 'message',
        message: this.message.trim(),
        username: this.username,
        timestamp: Date.now()
      }

      this.insert(this.username, msg.message, msg.timestamp)
      this.socket.send(JSON.stringify(msg))
      this.message = ''
    },
    insert: function (username, message, timestamp) {
      const bubble = {
        username,
        message,
        timestamp
      }

      this.bubbles.push(bubble)

      this.$nextTick(function () {
        this.$refs.bubbles.scrollTop = this.$refs.bubbles.scrollHeight
      })
    },
    self: function (username) {
      return username === this.username
    },
    date: function (timestamp) {
      const date = new Date(timestamp)
      return `${ date.getDate() }.${ date.getMonth() + 1}.${ date.getFullYear() } ${ ('0' + date.getHours()).slice(-2) }:${ ('0' + date.getMinutes()).slice(-2) }`
    },
    save: function () {
      const chat = this.bubbles.map((bubble) => {
        const username = bubble.username.startsWith('human') ? 'Them' : 'You'
        const message = bubble.message

        return `${ username } ${ message }`
      }).join('\r\n')

      const a = document.createElement('a')
      const file = new Blob([chat], { type: 'text/plain' })
      a.href = URL.createObjectURL(file)
      a.download = 'conversation.txt'
      document.body.appendChild(a)
      a.click()
    },
    end: function () {
      this.info = `You left the conversation.<br>This is your survey code: <mark>${ this.username },${ this.session }</mark>`
      this.socket.send(JSON.stringify({ type: 'exit' }))
    },
    confirm: function () {
      this.info = ''
      this.socket.send(JSON.stringify({ type: 'confirm' }))
      this.insert('human', 'hi', Date.now())
    },
    leave: function () {
      window.location.href = 'https://www.google.com'
    }
  }
})
