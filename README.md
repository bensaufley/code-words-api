# Code Words API
[![Maintainability](https://api.codeclimate.com/v1/badges/cd972d4a45f481c95fc2/maintainability)](https://codeclimate.com/github/bensaufley/code-words-api/maintainability)
[![Issue Count](https://codeclimate.com/github/bensaufley/code-words-api/badges/issue_count.svg)](https://codeclimate.com/github/bensaufley/code-words-api)
[![Test Coverage](https://api.codeclimate.com/v1/badges/cd972d4a45f481c95fc2/test_coverage)](https://codeclimate.com/github/bensaufley/code-words-api/test_coverage)
[![CircleCI](https://circleci.com/gh/bensaufley/code-words-api/tree/master.svg?style=shield)](https://circleci.com/gh/bensaufley/code-words-api/tree/master)


A Node API for Code Words, a game where you guess words. Docs available at [GitHub Page](https://bensaufley.github.io/code-words-api/)

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

- `npm test` is just a shortcut for `nf run mocha`.
- `npm run cov` runs the test suite inside [`nyc`] for coverage reporting.

[secret-key-gen]: https://github.com/dwyl/learn-json-web-tokens#how-to-generate-secret-key
[`nyc`]: https://github.com/istanbuljs/nyc
[foreman-node]: https://github.com/strongloop/node-foreman
