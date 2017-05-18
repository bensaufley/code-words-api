# Code Words API
[![Code Climate](https://codeclimate.com/github/bensaufley/code-words-api/badges/gpa.svg)](https://codeclimate.com/github/bensaufley/code-words-api) [![Issue Count](https://codeclimate.com/github/bensaufley/code-words-api/badges/issue_count.svg)](https://codeclimate.com/github/bensaufley/code-words-api) [![Test Coverage](https://codeclimate.com/github/bensaufley/code-words-api/badges/coverage.svg)](https://codeclimate.com/github/bensaufley/code-words-api/coverage) [![CircleCI](https://circleci.com/gh/bensaufley/code-words-api/tree/master.svg?style=shield)](https://circleci.com/gh/bensaufley/code-words-api/tree/master)


A Node API for Code Words, a game where you guess words.

## Setup

Copy `.env.example` to `.env` and
[generate a `SECRET_TOKEN` for development](secret-key-gen):

```
node -e "console.log(require('crypto').randomBytes(32).toString('hex'));"
```

Replace `<SECRET_TOKEN>` in your new `.env` with this token. Replace the
other `<BLAH>` things in your new `.env` with real values (e.g. Database
credentials).

Then run:

```sh
$ yarn install
$ npm run migrate-up
```


## Run the App

`npm start`

This app uses [foreman-node], so `start` wraps `node server.js` (in the
Procfile) with `nf start`.

## Testing

`npm test` is just a shortcut for `nf run mocha` (with [`nyc`] for coverage
reporting). To pass arguments, add `--` and your arguments, e.g.:

```sh
$ npm test -- --growl
$ npm test -- test/requests
```

[secret-key-gen]: https://github.com/dwyl/learn-json-web-tokens#how-to-generate-secret-key
[nyc]: https://github.com/istanbuljs/nyc
[foreman-node]: https://github.com/strongloop/node-foreman
