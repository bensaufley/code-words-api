# Code Words API

A Node API for Code Words, a game where you guess words.

# Setup

Copy `.env.example` to `.env` and [generate a `SECRET_TOKEN` for development](secret-key-gen):

```
node -e "console.log(require('crypto').randomBytes(32).toString('hex'));"
```

Replace `<SECRET_TOKEN>` in your new `.env` with this token.

Run `yarn install`.

# Run the App

`npm start`

[secret-key-gen]: https://github.com/dwyl/learn-json-web-tokens#how-to-generate-secret-key
