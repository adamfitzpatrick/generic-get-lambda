const rewire = require('rewire')
const sinon = require('sinon')
const chai = require('chai')
chai.should()
chai.use(require('chai-as-promised'))
chai.use(require('sinon-chai'))

describe('get-lambda', () => {
  let sut
  let docClientMock
  let consoleStubs
  let response

  const promiseResolver = (value) => {
    return { promise: () => Promise.resolve(value) }
  }

  const setEnvVars = (sortKey) => {
    sut.__set__('process', {
      env: {
        TABLE_NAME: 'table',
        PRIMARY_KEY_COLUMN_NAME: 'key',
        SORT_KEY_COLUMN_NAME: sortKey || '',
        PRIMARY_KEY_EVENT_PATH: 'pathParameters.key',
        SORT_KEY_EVENT_PATH: 'pathParameters.sort',
        REGION: 'us-west-2'
      }
    })
  }

  beforeEach(() => {
    sut = rewire('./get-lambda')
    const fakeDocClient = {
      get: () => 'get',
      query: () => 'query'
    }
    docClientMock = sinon.mock(fakeDocClient)
    const FakeDocClientConstructor = function () {
      Object.assign(this, fakeDocClient)
    }
    sut.__get__('AWS').DynamoDB = {
      DocumentClient: FakeDocClientConstructor
    }
    consoleStubs = {
      log: sinon.stub(),
      error: sinon.stub()
    }
    sut.__set__('console', consoleStubs)
    response = {
      statusCode: 200,
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({})
    }
  })

  describe('when provided with a primary and sort key', () => {
    describe('when the table has no sort key', () => {
      it('should ignore the sort key and get from the table using the primary key only', () => {
        setEnvVars()
        const params = {
          TableName: 'table',
          Key: { key: 'key' }
        }
        docClientMock.expects('get')
          .withExactArgs(params)
          .returns(promiseResolver({ Item: {} }))
        return sut({ pathParameters: { key: 'key', sort: 'sort' }})
          .should.eventually.deep.equal(response).then(() => {
            docClientMock.verify()
          })
      })
    })

    describe('when the table has a sort key', () => {
      it('should get from the table using both keys', () => {
        setEnvVars('sort')
        const params = {
          TableName: 'table',
          Key: {
            key: 'key',
            sort: 'sort'
          }
        }
        docClientMock.expects('get')
          .withExactArgs(params)
          .returns(promiseResolver({ Item: {} }))
        return sut({ pathParameters: { key: 'key', sort: 'sort' }})
          .should.eventually.deep.equal(response).then(() => {
            docClientMock.verify()
          })
      })
    })
  })

  describe('when provided with only a primary key', () => {
    describe('when the table has no sort key', () => {
      it('should get from the table using the primary key', () => {
        setEnvVars()
        const params = {
          TableName: 'table',
          Key: { key: 'key' }
        }
        docClientMock.expects('get')
          .withExactArgs(params)
          .returns(promiseResolver({ Item: {} }))
        return sut({ pathParameters: { key: 'key' }}).should.eventually.deep.equal(response).then(() => {
          docClientMock.verify()
        })
      })
    })

    describe('when the table has a sort key', () => {
      it('should execute a query with the primary key', () => {
        setEnvVars('sort')
        const params = {
          TableName: 'table',
          ExpressionAttributeValues: {
            ':k': 'key'
          },
          KeyConditionExpression: 'key = :k'
        }
        docClientMock.expects('query')
          .withExactArgs(params)
          .returns(promiseResolver({ Items: [] }))
        response.body = JSON.stringify([])
        return sut({ pathParameters: { key: 'key' }}).should.eventually.deep.equal(response).then(() => {
          docClientMock.verify()
        })
      })
    })
  })

  describe('when the lambda is not properly configured', () => {
    it('should log the error and provide a 500 response', () => {
      response.statusCode = 500
      response.body = JSON.stringify({ message: 'internal server error' })
      sut.__set__('process', { env: {} })
      return sut({ pathParameters: { key: 'key' }}).should.eventually.deep.equal(response).then(() => {
        consoleStubs.error.should.have.been.calledWith('lambda is not properly configured')
      })
    })
  })

  describe('when not provided with a primary key', () => {
    it('should log the error and provide a 400 response', () => {
      setEnvVars()
      response.statusCode = 400
      response.body = JSON.stringify({ message: 'missing primary key' })
      return sut({ queryStringParameters: { key: 'key' }}).should.eventually.deep.equal(response).then(() => {
        consoleStubs.error.should.have.been.calledWith('missing primary key')
      })
    })
  })

  describe('when dynamo returns an error', () => {
    it('should log the error and re-throw it', () => {
      setEnvVars()
      const params = {
        TableName: 'table',
        Key: { key: 'key' }
      }
      docClientMock.expects('get')
        .withExactArgs(params)
        .returns({ promise: () => Promise.reject(new Error('error')) })
      response.statusCode = 500
      response.body = JSON.stringify({ message: 'internal server error' })
      return sut({ pathParameters: { key: 'key' }}).should.eventually.deep.equal(response).then(() => {
        consoleStubs.error.should.have.been.calledWith('error')
      })
    })
  })
})
