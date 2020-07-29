const AWS = require('aws-sdk')

const initialize = () => {
  AWS.config.update({ region: process.env.REGION })
  return {
    docClient: new AWS.DynamoDB.DocumentClient({ apiVersion: '2012-08-10' }),
    TableName: process.env.TABLE_NAME,
    primaryKeyColumn: process.env.PRIMARY_KEY_COLUMN_NAME,
    sortKeyColumn: process.env.SORT_KEY_COLUMN_NAME,
    primaryKeyEventPath: process.env.PRIMARY_KEY_EVENT_PATH,
    sortKeyEventPath: process.env.SORT_KEY_EVENT_PATH,
    region: process.env.REGION
  }
}

const isConfigInvalid = ({ docClient, TableName, primaryKeyColumn, primaryKeyEventPath, region }) => {
  if (!docClient || !TableName || !primaryKeyColumn || !primaryKeyEventPath || !region) {
    return true
  }
}

const getKey = (event, eventPath, regex) => {
  return eventPath.split('.').reduce((interim, path) => {
    if (!interim) { return }
    return interim[path]
  }, event)
}

const doGet = (config, event) => {
  const params = {
    TableName: config.TableName,
    Key: { [config.primaryKeyColumn]: config.primaryKey }
  }
  if (config.sortKeyColumn && config.sortKey) {
    params.Key[config.sortKeyColumn] = config.sortKey
  }
  return config.docClient.get(params).promise()
}

const doQuery = (config, event) => {
  const params = {
    TableName: config.TableName,
    ExpressionAttributeValues: { ':k': config.primaryKey },
    KeyConditionExpression: `${config.primaryKeyColumn} = :k`
  }
  return config.docClient.query(params).promise()
}

const buildResponse = (statusCode, errMessage, data) => {
  const response = {
    statusCode,
    headers: { 'Content-Type': 'application/json' }
  }
  if (errMessage) {
    response.body = JSON.stringify({ message: errMessage })
  } else {
    response.body = JSON.stringify(data || {})
  }
  return response
}

const getLambda = async (event) => {
  const config = initialize()
  if (isConfigInvalid(config)) {
    console.error('lambda is not properly configured')
    return buildResponse(500, 'internal server error')
  }

  let promise
  config.primaryKey = getKey(event, config.primaryKeyEventPath)
  config.sortKey = getKey(event, config.sortKeyEventPath)
  if (!config.primaryKey) {
    const message = 'missing primary key'
    console.error(message)
    return buildResponse(400, message)
  } else if (!config.sortKeyColumn || config.sortKey) {
    promise = doGet(config, event).then(data => buildResponse(200, null, data.Item))
  } else {
    promise = doQuery(config, event).then(data => buildResponse(200, null, data.Items))
  }

  return promise.catch(err => {
    console.error(err.message)
    return buildResponse(500, 'internal server error')
  })
}

module.exports = getLambda
