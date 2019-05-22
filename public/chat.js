const WS_URL = window.location.hostname === 'localhost' ? 'ws://localhost:5001' : 'wss://translation-of-computation.com/ws'
const socket = new WebSocket(WS_URL)

const chat = document.getElementById('chat')
const bubbles = document.getElementById('bubbles')
const textareaMessage = document.getElementById('textarea-message')
const inputUsername = document.getElementById('input-username')
const buttonSend = document.getElementById('button-send')
const overlay = document.getElementById('overlay')
const info = document.getElementById('info')

const usernameId = Math.random().toString(16).slice(2)

function send() {
  const msg = {
    type: 'chat-message',
    message: textareaMessage.value.trim(),
    username: usernameId,
    timestamp: Date.now()
  }

  socket.send(JSON.stringify(msg))
  textareaMessage.value = ''
}

function getBubble (username, message, timestamp) {
  const self = (username === usernameId) ? 'self' : ''
  const date = new Date(timestamp)
  const time = `${ date.getDate() }.${ date.getMonth() + 1}.${ date.getFullYear() } ${ ('0' + date.getHours()).slice(-2) }:${ ('0' + date.getMinutes()).slice(-2) }`

  return bubble = `
    <section class="bubble-container ${ self }">
      <section class="bubble ${ self }">
        <p class="message">${ message.replace(/<\/?[^>]+(>|$)/g, '') }</p>
        <p class="timestamp ${ self }">${ time }</p>
      </section>
    </section>`
}

function insert (username, message, timestamp) {
  const bubble = getBubble(username, message, timestamp)

  bubbles.insertAdjacentHTML('beforeend', bubble)
  bubbles.scrollTop = bubbles.scrollHeight
}

socket.addEventListener('message', (event) => {
  const msg = JSON.parse(event.data)

  if (msg.type === 'chat-message') {
    insert(msg.username, msg.message, msg.timestamp)
  } else if (msg.type === 'hello') {
    chat.style.display = 'block'
    overlay.style.display = 'none'
  } else if (msg.type === 'exit') {
    chat.style.display = 'none'
    info.innerText = 'Person left the conversation.'
    overlay.style.display = 'flex'
  }
})

buttonSend.addEventListener('click', () => {
  if (!textareaMessage.value.trim()) return
  send()
})

textareaMessage.addEventListener('keydown', (event) => {
  if (event.keyCode === 13) {
    event.preventDefault()
    if (!textareaMessage.value.trim()) return
    send()
  }
})
