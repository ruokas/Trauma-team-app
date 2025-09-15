const { babel } = require('@rollup/plugin-babel');

module.exports = {
  input: 'public/js/app.js',
  output: {
    file: 'public/js/app.legacy.js',
    format: 'iife',
    name: 'TraumaTeamApp',
    sourcemap: false,
    inlineDynamicImports: true
  },
  plugins: [
    babel({
      babelHelpers: 'bundled',
      presets: [
        ['@babel/preset-env', {
          targets: { ie: '11' },
          modules: false,
          bugfixes: true
        }]
      ],
      extensions: ['.js'],
      exclude: 'node_modules/**'
    })
  ]
};
