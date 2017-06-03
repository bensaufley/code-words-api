'use strict';

import express from 'express';
import http from 'http';
import logger from 'morgan';
import bodyParser from 'body-parser';
import createWebSocketsServer from './lib/web-sockets-server';
import validateRequest from './middleware/validate-request';

const app = express();

if (process.env.NODE_ENV !== 'test' || process.env.DEBUG === 'true') {
  app.use(logger('dev'));
}

app.use(bodyParser.json());

app.all('/*', function(req, res, next) {
  // CORS headers
  res.header('Access-Control-Allow-Origin', '*'); // TODO: restrict to domains
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
app.use(function(req, res, next) {
  let err = new Error('Not Found');
  err.status = 404;
  next(err);
});

app.set('port', process.env.PORT || 3000);

let server = http.createServer(app),
    wss = createWebSocketsServer.v1(server);

if (process.env.NODE_ENV !== 'test') {
  server.listen(app.get('port'), function() {
    console.log('Express server listening on port ' + server.address().port);
  });
}

export default {
  app,
  server,
  wss
};
