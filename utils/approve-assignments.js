require('dotenv').config()
const AWS = require('aws-sdk')

AWS.config = {
  region: 'us-east-1',
  sslEnabled: true
}

const mturk = new AWS.MTurk({ endpoint: 'https://mturk-requester.us-east-1.amazonaws.com' })


function approveSingle(id, msg = 'Thank you for the conversation :-)') {
  mturk.approveAssignment({
    AssignmentId: id,
    RequesterFeedback: msg
  }, (err, data) => {
    if (err) console.log(err)
    console.log(data)
  })
}

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
            RequesterFeedback: 'Thank you for the conversation :-)'
          }, (err, data) => {
            if (err) console.log(err)
            console.log(data)
          })
        })
      })
    })
  })
}

/* approveSingle('') */
approve()