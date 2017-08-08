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
      { "word": "waffle", "revealed": true, "type": "b" },
      { "word": "pancake", "revealed": false, "type": "redacted" }
      // ⨉ 25
    ],
    "completed": false,
    "started": true
  },
  "players": [
    // See Player
  ]
}
```

The Game model is the major model in Code Words. It contains all sorts of stuff, including
`tiles`, which is a list of 25 Objects describing the 5 ⨉ 5 grid of tiles (in a simple list,
no grid in serialization) with their words, whether they've been revealed, and what their
type is. If the User is playing a `'transmitter'`, `type` will never be `'redacted'` even if
`revealed` is `true`. If the User is playing a `'decoder'`, `type` will be `'redacted'` if
the tile is not yet `revealed`.

Enumerated values:

- `board`:
  - `type`: `null`, `'a'`, `'b'`, `'x'`, `'redacted'`

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
