# Trauma Team App

## Installation

Install project dependencies:

```bash
npm install
```

## Running the Server

Set the required JWT secret and start the application backend:

```bash
export JWT_SECRET="your-secret"
node server/start.js
```

Alternatively, set `JWT_SECRET` and use the provided `npm start` script.

## Environment Variables

- `JWT_SECRET` – Secret used to sign JSON Web Tokens. **Required**; the
  server will not start without it.
- `ALLOWED_ORIGINS` – Comma-separated list of origins allowed for
  Socket.IO connections. If unset, all origins are permitted.

## Testing

Execute the test suite:

```bash
npm test
```

## Database Error Handling

The backend persists session data to `server/db.json`. If this file
cannot be read or written (for example, due to missing permissions), the
server logs the error and falls back to an empty in-memory database so it
can continue running.

## Connection Lifecycle

The application maintains a Socket.IO connection to sync sessions and
users. The client listens for several connection events to aid
debugging:

- `connect_error` – logs the error, notifies the user and retries the
  connection.
- `disconnect` – warns the user that the connection was lost.
- `reconnect` – logs successful reconnection and notifies the user.

After refreshing authentication tokens, call `setAuthToken()` followed
by `connectSocket({ force: true })` to manually re-establish the
connection if needed.

## Offline Support

The application registers a service worker to cache static assets and to
queue session data when saves fail. Changes made while offline are stored
locally and sent to the server automatically once connectivity returns.

### Testing Service Worker Changes

Service workers are aggressively cached by browsers. After modifying
`public/sw.js`:

1. Run the development server and load the app to register the worker.
2. Use your browser's developer tools (Application → Service Workers) to
   **Unregister** the worker or perform a hard reload to pick up changes.
3. To test background sync, switch the network panel to “Offline,” make
   some edits, then go back online; the queued data should sync
   automatically.

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
