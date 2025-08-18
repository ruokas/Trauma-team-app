# Trauma Team App

## Installation

Install project dependencies:

```bash
npm install
```

## Running the Server

Start the application backend:

```bash
node server/index.js
```

You can also create an `npm start` script for convenience.

## Testing

Execute the test suite:

```bash
npm test
```

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

## Development Tips

- Watch Sass for automatic recompilation:

  ```bash
  npx sass --watch css/scss/main.scss css/main.css
  ```

- Run a linter after installing one (e.g., ESLint):

  ```bash
  npx eslint .
  ```
