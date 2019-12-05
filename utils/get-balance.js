require('dotenv').config()
const AWS = require('aws-sdk')

AWS.config = {
  region: 'us-east-1',
  sslEnabled: true
}

const mturk = new AWS.MTurk({ endpoint: 'https://mturk-requester.us-east-1.amazonaws.com' })

function getBalance () {
  mturk.getAccountBalance({}, (err, data) => {
    if (err) return console.log(err)
    console.log(data)
  })
}

getBalance()