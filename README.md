# Trauma Team App

## Styles

This project uses [Sass](https://sass-lang.com/) for styling. Source files live in the `scss/` directory and are split into partials:

- `_base.scss` – variables and global styles
- `_components.scss` – component styles
- `_utilities.scss` – utility classes

`scss/main.scss` combines these partials and compiles to `css/main.css`.

To rebuild the stylesheet run:

```bash
npm run build:css
```
