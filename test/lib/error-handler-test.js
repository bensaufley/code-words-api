'use strict';

const helper = require('../test-helper'),
      config = helper.config,
      sinon = helper.sinon,
      expect = helper.expect,
      { ErrorHandler } = require('../../lib/error-handler');

describe('ErrorHandler', () => {
  describe('process', () => {
    it('logs details', () => {
      sinon.spy(config, 'log');
      let req = { path: '/test/path', query: { query_param: 'test' } },
          res = {},
          error = new Error('This is just a test');
      error.name = 'Test Error';
      res.json = sinon.stub().returns(res);
      res.status = sinon.stub().returns(res);


      new ErrorHandler(req, res).process(error);

      expect(config.log).to.have.been.calledWith(
        'path:', '/test/path', '\n',
        'query:', { query_param: 'test' }, '\n',
        'body:', undefined, '\n',
        'params:', undefined, '\n',
        'Error Details:',
        'Test Error',
        'This is just a test',
        error.stack
      );
      expect(res.status).to.have.been.calledWith(500);
      expect(res.json).to.have.been.calledWith({ error: 'Test Error: This is just a test' });
      config.log.restore();
    });
  });
});
