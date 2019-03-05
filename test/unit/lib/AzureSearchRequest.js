const chai = require('chai');
const nock = require('nock');
const chaiAsPromised = require('chai-as-promised');
const azureSearchRequest = require('../../../lib/AzureSearchRequest.js');

const expect = chai.expect;
chai.use(chaiAsPromised);

describe('AzureSearchRequest', () => {
  afterEach('clean nock', () => {
    nock.cleanAll();
  });
  beforeEach('set up environment', () => {
    process.env = {
      'search-api-admin-key': 'key',
      'search-hostname': 'hostname',
    };
  });

  it('should make correctly set up HTTP request with parameters', async () => {
    const searchApiVersion = '2017-11-11';
    const expectedHeaders = {
      reqheaders: {
        'Content-Type': 'application/json',
        'api-key': 'key',
      },
    };
    nock('https://hostname/', expectedHeaders)
      .get(/path/, {})
      .times(1)
      .query({ 'api-version': searchApiVersion })
      .reply(200);

    const response = await azureSearchRequest('path', {
      method: 'get',
      searchApiVersion,
    });
    expect(response).to.not.be.null;
    expect(response.statusCode).to.equal(200);
  });
  it('should make correctly set up HTTP request with defaults', async () => {
    const expectedHeaders = {
      reqheaders: {
        'Content-Type': 'application/json',
        'api-key': 'key',
      },
    };
    nock('https://hostname/', expectedHeaders)
      .get(/path/, {})
      .times(1)
      .query({ 'api-version': '2017-11-11' })
      .reply(200);

    const response = await azureSearchRequest('https://hostname/path');
    expect(response).to.not.be.null;
    expect(response.statusCode).to.equal(200);
  });
  it('should throw error if search API version is unknown', async () => {
    const searchApiVersion = 'unknown-version';
    const expectedHeaders = {
      reqheaders: {
        'Content-Type': 'application/json',
        'api-key': 'key',
      },
    };
    nock('https://hostname/', expectedHeaders)
      .get(/path/, {})
      .times(1)
      .query({ 'api-version': searchApiVersion })
      .reply(200);

    await expect(azureSearchRequest('path', { searchApiVersion }))
      .to.be.rejectedWith(Error, `The API version '${searchApiVersion}' can not be handled.`);
  });
});
