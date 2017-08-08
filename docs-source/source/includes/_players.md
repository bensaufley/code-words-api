# Players

All Players routes are [authenticated](#authentication).

## POST `/api/v1/game/:gameId/players`: create

> Expects no params besides URL params.
>
> Returns [serialized Game](#game)

Creates a new [Player](#player) associating the authenticated User with
the specified Game, and returns that Game, serialized.

## PUT `/api/v1/game/:gameId/player/:playerId`: update

> Expects JSON body with at least one of the following keys:

```json-doc
{
  "team": "a",
  "role": "decoder"
}
```

> Returns [serialized Game](#game)

Updates the specified Player to assign him to a team and/or role. Returns
updated Game, serialized.

## DELETE `/api/v1/game/:gameId/player/:playerId`: destroy

> Expects no params besides URL params.
>
> Returns 200 status if authenticated User's Player was destroyed;
> returns [serialized Game](#game) if it was another User's Player.

Deletes association between User and Game. Can only be done if Game is not
yet started. If the User removed her own Player, a 200 status is returned.
If the User removed another Player, the updated, serialized Game is returned.
