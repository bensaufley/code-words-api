# Games

All Games routes are [authenticated](#authentication).

## GET `/api/v1/games`: index

> Expects no params.
>
> Returns list of [serialized Games](#game).

Returns a list of [Game](#game)s.

## POST `/api/v1/games`: create

> Expects no params.
>
> Returns [serialized Game](#game).

Creates a new [Game](#game) for the credentialed User. Returns the Game, serialized.

## GET `/api/v1/game/:gameId`: show

> Expects no params besides URL param.
>
> Returns [serialized Game](#game).

Returns a serialized [Game](#game) record based on the id in the URL.

## POST `/api/v1/game/:gameId/start`: start

> Expects no params besides URL param.
>
> Returns [serialized Game](#game).

Attempts to start a [Game](#game). This assigns the `activePlayerId` which will have previously
been `null`. With an `activePlayerId`, the associated Player is now eligible to take her
turn. Returns the serialized Game.

## PUT `/api/v1/game/:gameId/transmit`: transmit

> Expects JSON body:

```json-doc
{
  "word": "clue",
  "number": 3
}
```

> Returns [serialized Game](#game).

Endpoint to take turn for Player of `role` `'transmitter'`. Updates the `activePlayerId` and
returns the serialized [Game](#game).

`word` must be a single word. `number` must be between `1` and the number of remaining tiles
un-revealed for the team.

## PUT `/api/v1/game/:gameId/decode`: decode

> Expects JSON body:

```json-doc
{
  "tile": 12
}
```

> Returns [serialized Game](#game).

Endpoint to take turn for Player of `role` `'decoder'`. Updates the `activePlayerId` _if
tile is incorrect_ and returns the serialized [Game](#game).

`tile` is the index of the chosen tile on the Game's `board`, and thus must be a number
between 0 and 24. It also cannot be the index of a tile that's already revealed.

## DELETE `/api/v1/game/:gameId`: destroy

> Expects no params besides URL params.
>
> Returns 200 status, no body.

Endpoint to delete a Game. Game cannot be deleted if it is already started. Does not
return a body because if it's successful there's nothing to serialize.
