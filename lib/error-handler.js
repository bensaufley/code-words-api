'use strict';

let config = require('../config');

module.exports = class ErrorHandler {
  constructor(req, res) {
    this.req = req;
    this.res = res;
    this.process = this.process.bind(this);
  }

  process(error) {
    config.log(
      'path:', this.req.path,
      'query:', this.req.query,
      'params:', this.req.params,
      'Error Details:',
      error.name,
      error.message,
      error.stack);

    let status = 500;
    if (this.res) this.res.status(status).json({ error: `${error.name}: ${error.message}` });
  }
};
