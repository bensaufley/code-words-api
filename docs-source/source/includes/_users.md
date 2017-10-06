# Users

All User routes are [authenticated](#authentication).

## POST `/api/v1/user/facebook`: connect Facebook

> Expects JSON body:

```json-doc
{
  "facebook_token": "some-facebook-token"
}
```

> Returns HTTP Status Code and empty JSON body.

This endpoint can be used to connect an existing User account to a Facebook
profile, allowing "Login with Facebook" functionality and, eventually, the
ability to find Facebook friends in the app.
