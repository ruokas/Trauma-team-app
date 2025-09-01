const { startServer } = require('./index');
const logger = require('./logger');

startServer().catch(err => {
  logger.error('Failed to start server', err);
});
