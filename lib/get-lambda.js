const AWS = require('aws-sdk')

const initialize = () => {
  AWS.config.update({ region: process.env.REGION })
  return {
    docClient: new AWS.DynamoDB.DocumentClient({ apiVersion: '2012-08-10' })
  }
}

const doGet = (config, event) => {
  const params = {
    TableName: process.env.TABLE_NAME,
    Key: { [process.env.PRIMARY_KEY]: event.primaryKey }
  }
  if (process.env.SORT_KEY && event.sortKey) {
    params.Key[process.env.SORT_KEY] = event.sortKey
  }
  return config.docClient.get(params).promise()
}

const doQuery = (config, event) => {
  const params = {
    TableName: process.env.TABLE_NAME,
    ExpressionAttributeValues: { ':k': event.primaryKey },
    KeyConditionExpression: `${process.env.PRIMARY_KEY} = :k`
  }
  return config.docClient.query(params).promise()
}

const getLambda = async (event) => {
  const config = initialize()

  let promise
  if (!event.primaryKey) {
    const message = 'missing primary key'
    console.error(message)
    throw new Error(message)
  } else if (!process.env.SORT_KEY || event.sortKey) {
    promise = doGet(config, event)
  } else {
    promise = doQuery(config, event)
  }

  return promise.catch(err => {
    console.error(err.message)
    return Promise.reject(err)
  })
}

module.exports = getLambda
