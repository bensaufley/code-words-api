# Authentication

Authentication is managed with a signed [JSONWebToken] received during Signup or Login.
To access authenticated routes, this token must be passed along in one of the following
ways:

- [Bearer authorization]: pass the `Authorization` HTTP header in the format
  "Bearer xxxxxxxxxx…"
- GET or POST parameters: pass the token as `access_token`

## POST `/signup`

> Example JSON body for `/signup`:

```json-doc
{
  "username": "my-username",
  "password": "my-password"
}
```

> Responds with [login](#post-code-login-code) JSON

The Sign Up endpoint expects a JSON body with `username` and `password` keys. The `username` must be between six and 24 characters, and consist of letters, numbers, dashes, and periods. The `password` must be between seven and 50 characters and has no character restrictions.

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
  "token": "…",
  "user": {
    "id": "xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx",
    "username": "username"
  }
}
```

> `token` is a [JSONWebToken] containing a payload with `userId`

The Log In endpoint expects the same type of JSON body as Sign Up, and returns the same type of response (since both log a user in).

[JSONWebToken]: https://github.com/auth0/node-jsonwebtoken
[Bearer authorization]: http://self-issued.info/docs/draft-ietf-oauth-v2-bearer.html

## Facebook Auth

> Example JSON body for Facebook auth:

```json-doc
{
  "facebook_token": "some-facebook-token"
}
```

> Responds with JSON:

```json-doc
{
  "token": "…",
  "user": {
    "id": "xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx",
    "username": "username"
  }
}
```

The `/signup/facebook` and `/login/facebook` routes are synonymous: when given a
Facebook token, the API will find or create a User for the given profile.

If a user is created from a Facebook profile, the username will default to
`fbu` followed by the `id` property of the Facebook profile (e.g.
`fbu.12345678909876543`).

