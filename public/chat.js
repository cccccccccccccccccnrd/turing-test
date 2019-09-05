const app = new Vue({
  el: '#app',
  data: {
    socket: null,
    session: null,
    username: Math.random().toString(16).slice(2),
    message: '',
    info: 'There are no more of these HITs available.',
    bubbles: []
  },
  created: function () {
    const WS_URL = window.location.hostname === 'localhost' ? 'ws://localhost:5001' : 'ws://192.168.178.71:5001'
    this.socket = new WebSocket(WS_URL)

    this.socket.addEventListener('message', (event) => {
      const msg = JSON.parse(event.data)
    
      if (msg.type === 'chat-message') {
        this.insert(msg.username, msg.message, msg.timestamp)
      } else if (msg.type === 'hello') {
        this.info = null
        this.session = msg.session
      } else if (msg.type === 'exit') {
        this.info = `Person left the conversation.<br>This is your survey code: <mark>${ this.username },${ this.session }</mark>`
      }
    })
  },
  methods: {
    send: function () {
      const msg = {
        type: 'chat-message',
        message: this.message.trim(),
        username: this.username,
        timestamp: Date.now()
      }
    
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
    }
  }
})
