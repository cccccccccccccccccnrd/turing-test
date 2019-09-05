require('dotenv').config()
const AWS = require('aws-sdk')

AWS.config = {
  region: 'us-east-1',
  sslEnabled: true
}

const mturk = new AWS.MTurk({ endpoint: 'https://mturk-requester-sandbox.us-east-1.amazonaws.com' })

function approve () {
  mturk.listHITs({}, (err, data) => {
    if (err) console.log(err)

    data.HITs.forEach((hit) => {
      mturk.listAssignmentsForHIT({ HITId: hit.HITId }, (err, data) => {
        if (err) console.log(err)

        data.Assignments.forEach((assignment) => {
          if (assignment.AssignmentStatus === 'Approved') return

          mturk.approveAssignment({
            AssignmentId: assignment.AssignmentId,
            RequesterFeedback: 'Thank you very much for ur work'
          }, (err, data) => {
            if (err) console.log(err)
            console.log(data)
          })
        })
      })
    })
  })
}

approve()