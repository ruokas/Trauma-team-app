const { startServer } = require('./index');

startServer().catch(err => {
  console.error('Failed to start server', err);
});
