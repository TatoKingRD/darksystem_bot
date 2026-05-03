const { startDarkSystemBot } = require('./core/darksystemBootstrap');

startDarkSystemBot().catch((error) => {
  console.error('DarkSystem failed to start:', error);
  process.exit(1);
});
