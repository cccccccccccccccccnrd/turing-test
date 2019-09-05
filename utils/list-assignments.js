require('dotenv').config()
const AWS = require('aws-sdk')

AWS.config = {
  region: 'us-east-1',
  sslEnabled: true
}

const mturk = new AWS.MTurk({ endpoint: 'https://mturk-requester-sandbox.us-east-1.amazonaws.com' })

function list () {
  mturk.listHITs({}, (err, data) => {
    if (err) console.log(err)

    data.HITs.forEach((hit) => {
      mturk.listAssignmentsForHIT({ HITId: hit.HITId }, (err, data) => {
        if (err) console.log(err)

        data.Assignments.forEach((assignment) => {
          console.log(assignment)
        })
      })
    })
  })
}

list()