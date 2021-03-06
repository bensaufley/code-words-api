'use strict';

require('dotenv').config();

const config = require('./config'),
      express = require('express'),
      http = require('http'),
      logger = require('morgan'),
      bodyParser = require('body-parser'),
      { ErrorHandler, NotFoundError } = require('./lib/error-handler'),
      createWebSocketsServer = require('./lib/web-sockets-server'),
      validateRequest = require('./middleware/validate-request');

const app = express();

/* istanbul ignore next */
if (process.env.NODE_ENV !== 'test' || process.env.DEBUG === 'true') {
  app.use(logger('dev'));
}

app.use(bodyParser.json());

app.all('/*', function(req, res, next) {
  // CORS headers
  /* istanbul ignore else */
  if (config.corsDomains && config.corsDomains.length) {
    const origin = req.get('origin');
    if (origin && config.corsDomains.includes(origin.replace(/^.*\/\//, ''))) {
      res.header('Access-Control-Allow-Origin', origin);
    }
  } else {
    res.header('Access-Control-Allow-Origin', '*');
  }
  res.header('Access-Control-Allow-Methods', 'GET,PUT,POST,DELETE,OPTIONS');
  // Set custom headers for CORS
  res.header('Access-Control-Allow-Headers', 'Content-type,Accept,Authorization');
  res.header('Accept', 'application/json');

  if (req.method === 'OPTIONS') return res.status(200).end();

  next();
});

// Auth Middleware for api/v1 only
app.all('/api/v1/*', [validateRequest]);

app.use('/', require('./routes'));

// If no route is matched by now, it must be a 404
app.use(function(req, res) {
  const err = new NotFoundError(`No route matches path ${req.path}`);
  new ErrorHandler(req, res).process(err);
});

app.set('port', process.env.PORT || 5000);

let server = http.createServer(app),
    wss = createWebSocketsServer.v1(server);

/* istanbul ignore next */
if (process.env.NODE_ENV !== 'test') {
  server.listen(app.get('port'), function() {
    console.log('Express server listening on port ' + server.address().port);
  });
}

module.exports = {
  app,
  server,
  wss
};
