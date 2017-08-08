# WebSockets Messages

WebSockets are authenticated using `access_token` in the query string, and
connected at `/api/v1` through the `ws://` protocol.

On successful connection, [`GAMES_INDEXED`](#code-games-indexed-code) is emitted.

## `GAMES_INDEXED`

> Emits JSON:

```json-doc
{
  event: 'GAMES_INDEXED',
  payload: {
    games: [
      // list of Games for authenticated User
    ]
  }
}
```

Emitted on successful connection.

## `GAME_UPDATED`

> Emits JSON:

```json-doc
{
  event: 'GAME_UPDATED',
  payload: {
    // serialized Game object
  }
}
```

Emitted to all connected WebSockets for a Game except the initiating User
when a Game is updated in any way.
