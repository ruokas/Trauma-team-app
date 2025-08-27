# Trauma Team App

## Installation

Install project dependencies:

```bash
npm install
```

## Running the Server

Start the application backend:

```bash
node server/start.js
```

Alternatively, use the provided `npm start` script.

## Testing

Execute the test suite:

```bash
npm test
```

## Connection Lifecycle

The application maintains a Socket.IO connection to sync sessions and
users. The client listens for several connection events to aid
debugging:

- `connect_error` – logs the error, notifies the user and retries the
  connection.
- `disconnect` – warns the user that the connection was lost.
- `reconnect` – logs successful reconnection and notifies the user.

After refreshing authentication tokens, call `setAuthToken()` followed
by `reconnectSocket()` to manually re-establish the connection.

## Stylesheets

The CSS is generated from Sass files in `css/scss`:

- `_base.scss` – global variables and base element styles
- `_components.scss` – reusable UI components
- `_utilities.scss` – small utility classes

`main.scss` imports these partials and compiles to `css/main.css`.
Run the following to rebuild the stylesheet after making changes:

```bash
npm run build:css
```

Contributors should edit the `.scss` files rather than `css/main.css`.

## Building for Deployment

All development takes place in the `public/` directory. To produce the
deployable site used for publishing (e.g. GitHub Pages), run:

```bash
npm run build
```

This command compiles the stylesheets and copies everything from
`public/` into `docs/`, removing any test files. Only `public/` should be
edited directly; `docs/` is generated.

## Development Tips

- Watch Sass for automatic recompilation:

  ```bash
  npx sass --watch css/scss/main.scss css/main.css
  ```

- Run a linter after installing one (e.g., ESLint):

  ```bash
  npx eslint .
  ```
