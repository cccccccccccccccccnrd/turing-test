require('dotenv').config()
const AWS = require('aws-sdk')

AWS.config = {
  region: 'us-east-1',
  sslEnabled: true
}

const mturk = new AWS.MTurk({ endpoint: 'https://mturk-requester-sandbox.us-east-1.amazonaws.com' })

function remove () {
  mturk.listHITs({}, (err, data) => {
    if (err) console.log(err)

    data.HITs.forEach((hit) => {
      if (hit.NumberOfAssignmentsCompleted > 0) {
        console.log(hit.HITId)
        mturk.deleteHIT({
          HITId: hit.HITId
        })
      }
    })
  })
}

remove()