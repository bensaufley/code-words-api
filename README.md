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

- `npm test` is just a shortcut for `nf run mocha`.
- `npm run cov` runs the test suite inside [`nyc`] for coverage reporting.

[secret-key-gen]: https://github.com/dwyl/learn-json-web-tokens#how-to-generate-secret-key
[`nyc`]: https://github.com/istanbuljs/nyc
[foreman-node]: https://github.com/strongloop/node-foreman

# API Routes

**Failed requests** are conveyd by appropriate HTTP statuses and a JSON body with an `error` key explaining the error.

## Unauthenticated Routes

### Authentication Routes

#### `/signup`

Expects JSON body with keys:

- `username`: 6-24 characters - letters, numbers, dashes, dots
- `password`: 6-24 characters

Logs user in and responds with same data as `/login` endpoint.

#### `/login`

Expects JSON body with keys:

- `username`: Matches `/signup` parameters
- `password`: Matches `/signup` parameters

Responds with JSON:

- `token`: [JSONWebToken] containing `userId` (also represented in `user` object)
- `user`: Serialized User object:
  - `id`: UUIDv4 for User in database
  - `username`: String username for logged-in User

## Authenticated Routes

Requests to these routes should use [Bearer authorization] or pass `access_token` as a parameter in their POST body or GET parameters. The token should be the JSONWebToken received from `/login` or `/signup`.

### Games Resource

#### The Serialized Game Record

A serialized Game record will be structured consistently regardless of the endpoint and have two keys:

- `game`: an Object representing the Game record itself:
  - `id`: UUIDv4 for Game in database
  - `activePlayerId`: UUIDv4 for current `Player` whose turn it is, or `null`
  - `board`: Array of serialized Tile objects:
    - `word`: The word on the tile
    - `revealed`: Boolean for whether the type of the card has been revealed
    - `type`: Type of card, if available. Possible values:
      - `'a'`: for Team A
      - `'b'`: for Team B
      - `'x'`: for trap tile
      - `null`: for unaffiliated tiles
      - `'redacted'`: for tiles that have not yet been revealed to the Player
  - `completed`: Boolean representing the completion state of the game
  - `started`: Boolean representing the readiness state of the game
- `players`: Array with serialized Player objects and their associated User serializations:
  - `id`: UUIDv4 for Player in database
  - `gameId`: UUIDv4 for associated Game record
  - `role`: String or `null` representing the chosen role of the Player
  - `team`: String or `null` representing the chosen team of the Player
  - `user`: Serialized User object:
    - `id`: UUIDv4 for User in database
    - `username`: String username

#### GET `/games`: Index

Lists games for logged-in User. Expects no params.

Responds with JSON:

- `games`: Array with [serialized Game objects](#the-serialized-game-record)

#### POST `/games`: Create

Creates a new Game for the authenticated User. Expects no params.

Responds with [serialized Game object](#the-serialized-game-record)

#### GET `/games/:gameId`: Show

Returns [serialized Game object](#the-serialized-game-record) for requested `id`

#### PUT `/games/:gameId/transmit`: Transmit

Creates new "transmit" turn on Game with requested `id` for authenticated User, if User's
corresponding Player has `role` of `'transmitter'`.

Expects JSON:

- `word`: String, required. One word.
- `number`: Integer, required. Greater than zero, less than remaining tiles for team.

Returns updated [serialized Game object](#the-serialized-game-record)

#### PUT `/games/:gameId/decode`: Decode

Creates new "decode" turn on Game with requested `id` for authenticated User, if User's
corresponding Player has `role` of `'decoder'`.

Expects JSON:

- `tile`: Integer, required. Index for tile corresponding to Game.board.

Returns updated [serialized Game object](#the-serialized-game-record)

#### DELETE `/games/:gameId`: Destroy

Sets `deletedAt` for Game with requested `id` to current timestamp, effectively
deleting the Game.

Returns 200 status.

### Players Resource

#### POST `/games/:gameId/players`: Create

Creates new Player association between Game and User. Expects JSON:

- `username`: String to search for to find User

Returns updated [serialized Game object](#the-serialized-game-record)

#### PUT `/games/:gameId/players/:playerId`: Update

Changes `team` and/or `role` attribute for Player. Only allowed before Game has started. Expects JSON:

- `team`: String, `'a'` or `'b'`
- `role`: String, `'decoder'` or `'transmitter'`

Returns updated [serialized Game object](#the-serialized-game-record)

#### DELETE `/games/:gameId/players/:playerId`: Destroy

Deletes Player record associating User with game. Only allowed before Game has started. Expects no body data.

Returns updated [serialized Game object](#the-serialized-game-record), unless initiating user has deleted his or her own Player.

[JSONWebToken]: https://github.com/auth0/node-jsonwebtoken
[Bearer authorization]: http://self-issued.info/docs/draft-ietf-oauth-v2-bearer.html
