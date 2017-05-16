# Code Words API

A Node API for Code Words, a game where you guess words.

## Setup

Copy `.env.example` to `.env` and [generate a `SECRET_TOKEN` for development](secret-key-gen):

```
node -e "console.log(require('crypto').randomBytes(32).toString('hex'));"
```

Replace `<SECRET_TOKEN>` in your new `.env` with this token.

Then run:

```sh
$ yarn install
$ npm run migrate-up
```


## Run the App

`npm start`

This app uses [foreman-node], so `start` wraps `node server.js` (in the Procfile) with `nf start`.

## Testing

`npm run test` is just a shortcut for `nf run mocha`. To pass arguments, add `--` and your arguments, e.g.:

```sh
$ npm run test -- --growl
$ npm run test -- test/requests
```

[secret-key-gen]: https://github.com/dwyl/learn-json-web-tokens#how-to-generate-secret-key
[foreman-node]: https://github.com/strongloop/node-foreman
