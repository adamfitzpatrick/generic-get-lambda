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

  const promiseResolver = (value) => {
    return { promise: () => Promise.resolve(value) }
  }

  const setEnvVars = (sortKey) => {
    sut.__set__('process', {
      env: {
        TABLE_NAME: 'table',
        PRIMARY_KEY: 'key',
        SORT_KEY: sortKey || ''
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
        return sut({ primaryKey: 'key', sortKey: 'sort' }).should.eventually.deep.equal({ Item: {} }).then(() => {
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
        return sut({ primaryKey: 'key', sortKey: 'sort' }).should.eventually.deep.equal({ Item: {} }).then(() => {
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
        return sut({ primaryKey: 'key' }).should.eventually.deep.equal({ Item: {} }).then(() => {
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
        return sut({ primaryKey: 'key' }).should.eventually.deep.equal({ Items: [] }).then(() => {
          docClientMock.verify()
        })
      })
    })
  })

  describe('when not provided with a primary key', () => {
    it('should log the error', () => {
      return sut({}).should.be.rejectedWith('missing primary key').then(() => {
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
      return sut({ primaryKey: 'key' }).should.be.rejectedWith('error').then(() => {
        consoleStubs.error.should.have.been.calledWith('error')
      })
    })
  })
})
