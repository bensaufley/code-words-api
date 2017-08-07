---
title: API Reference

language_tabs: # must be one of https://git.io/vQNgJ
  - json-doc

toc_footers:
  - <a href='http://github.com/bensaufley/code-words-api'>Code Words API</a> by <a href='http://github.com/bensaufley'>Ben Saufley</a>
  - <a href='https://github.com/tripit/slate'>Documentation Powered by Slate</a>

includes:
  #- errors

search: true
---

# Introduction

The [Code Words API](https://github.com/bensaufley/code-words-api) is an API for playing the game Code Words. It is built as a compliment to [Code Words Web](https://github.com/bensaufley/code-words-api), a web client-based React project, with the aim of potentially creating something in React-Native or Swift to consume this same API at some future date.

All `id`s are UUIDv4 format.

# Authentication

## POST `/signup`

> Example JSON body for `/signup`:

```json-doc
{
  "username": "my-username",
  "password": "my-password"
}
```

> Responds with [login](#post-code-login-code) JSON

The Sign Up endpoint expects a JSON body with `username` and `password` keys. The `username` must be between six and 24 characters, and consist of letters, numbers, dashes, and periods. The `password` must be between six and 24 characters and has no character restrictions.

Upon successful signup, the user is logged in and granted a token. See [POST `/login`](#post-code-login-code) for return value.

## POST `/login`

> Example JSON body for `/login`:

```json-doc
{
  "username": "my-username",
  "password": "my-password"
}
```

> Responds with JSON:

```json-doc
{
  "token": "xxxxx",
  "user": {
    "id": "xxxxx",
    "username": "username"
  }
}
```

> `token` is a [JSONWebToken](https://github.com/auth0/node-jsonwebtoken) containing a payload with `userId`

The Log In endpoint expects the same type of JSON body as Sign Up, and returns the same type of response (since both log a user in).

# Games

## get `/api/v1/games`: index
## post `/api/v1/games`: create
## get `/api/v1/game/:gameId`: show
## post `/api/v1/game/:gameId/start`: start
## put `/api/v1/game/:gameId/transmit`: transmit
## put `/api/v1/game/:gameId/decode`: decode
## delete `/api/v1/game/:gameId`: destroy

# Players

## post `/api/v1/game/:gameId/players`: create
## put `/api/v1/game/:gameId/player/:playerId`: update
## delete `/api/v1/game/:gameId/player/:playerId`: destroy
