const { injectManifest } = require('workbox-build');

async function buildServiceWorker() {
  try {
    const { count, size } = await injectManifest({
      globDirectory: 'docs',
      globPatterns: ['**/*.{js,css,html}'],
      swSrc: 'public/sw.js',
      swDest: 'docs/sw.js'
    });
    console.log(`Generated docs/sw.js, which will precache ${count} files, totaling ${size} bytes.`);
  } catch (err) {
    console.error('Service worker generation failed:', err);
    process.exit(1);
  }
}

buildServiceWorker();
