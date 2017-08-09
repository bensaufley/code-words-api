# Models

<aside class="notice">All model <code>id</code>s are strings in UUIDv4 format.</aside>

Database models should be consistently serialized regardless of the endpoint.

## Game

```json-doc
{
  "game": {
    "id": "xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx",
    "activePlayerId": "yyyyyyyy-yyyy-yyyy-yyyy-yyyyyyyyyyyy",
    "board": [
      // see Game.board
    ],
    "completed": false,
    "started": true,
    "turns": [
      // see Game.turns
    ]
  },
  "players": [
    // See Player
  ]
}
```

The Game model is the major model in Code Words. It contains all sorts of stuff, including most importantly, [`board`](#code-game-board-code) and [`turns`](#code-game-turns-code).

Enumerated values:

### `Game.board`

> Example turns:

```json-doc
{ "word": "waffle", "revealed": true, "type": "b" },
{ "word": "pancake", "revealed": false, "type": "redacted" },
{ "word": "chowder", "revealed": true, "type": null }
```

The Game's `board` is an array of 25 Objects describing the 5 ⨉ 5 grid of tiles (in a simple list,
no grid in serialization) with their words, whether they've been revealed, and what their
type is.

- **If the User is playing a `'transmitter'`**, `type` will never be `'redacted'` even if
`revealed` is `true`.
- **If the User is playing a `'decoder'`**, `type` will be `'redacted'` if
the tile is not yet `revealed`.

Enumerated values:

- `type`: `null`, `'a'`, `'b'`, `'x'`, `'redacted'`

### `Game.turns`

> `transmission` turn:

```json-doc
{
  "event": "transmission",
  "number": 2,
  "playerId": "yyyyyyyy-yyyy-yyyy-yyyy-yyyyyyyyyyyy",
  "word": "breakfast"
}
```

> `decoding` turn:

```json-doc
{
  "correct": true,
  "event" "decoding",
  "playerId": "yyyyyyyy-yyyy-yyyy-yyyy-yyyyyyyyyyyy",
  "tile": 12
}
```

> `end` turn:

```json-doc
{
  "event": "end",
  "winner": "a"
}
```

The Game's `turns` are an array of the turns taken thus far in the game. There are three possible
types of turns, indicated by the turn Object's `event` attribute. The other attributes will change
based on the `event` being described.

- The `transmission` event contains the word and number submitted from the Transmitter.
- The `decoding` event contains the tile chosen to decode, and whether or not the tile
  belonged to the team of the Decoder indicated in `correct`.
- The `end` turn signifies that a game has ended, either by all of one team's tiles being
  revealed, or the `'x'` tile being selected. It indicates the winning team.

Enumerated values:

- `event`: `'transmission'`, `'decoding'`, `'end'`
- `winner` (for `'end'` event): `'a'`, `'b'`

## User

```json-doc
{
  "id": "xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx",
  "username": "my-username"
}
```

The User model is currently very simple. When serialized, it just had an `id` and
a `username`, both strings.

## Player

```json-doc
{
  "id": "xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx",
  "gameId": "yyyyyyyy-yyyy-yyyy-yyyy-yyyyyyyyyyyy",
  "role": "transmitter",
  "team": "a",
  "user": {
    // See User
  }
}
```

The Player model joins Users and Games. It also contains information about how the
player relates to the game. Both the `role` and `team` attributes begin as `null`,
and are assigned before a game is started.

Enumerated values:

- `role`: `null`, `'transmitter'`, `'decoder'`
- `team`: `null`, `'a'`, `'b'`
