'use strict';

let config = require('../config');

class NotFoundError extends Error {
  constructor(...args) {
    super(...args);
    this.errorCode = 404;
    this.name = 'Not Found Error';
  }
}

class ErrorHandler {
  constructor(req, res) {
    this.req = req;
    this.res = res;
    this.process = this.process.bind(this);
  }

  promise(error) {
    return Promise.resolve(this.process(error));
  }

  process(error) {
    config.log(
      'path:', this.req.path, '\n',
      'query:', this.req.query, '\n',
      'body:', this.req.body, '\n',
      'params:', this.req.params, '\n',
      'Error Details:',
      error.name,
      error.message,
      error.stack);

    let status = error.errorCode || 500;
    if (this.res) this.res.status(status).json({ error: `${error.name}: ${error.message}` });
  }
}

module.exports = {
  ErrorHandler,
  NotFoundError
};
