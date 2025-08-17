# Trauma Team App

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
