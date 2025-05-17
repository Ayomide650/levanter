const { Client, logger } = require('./lib/client');
const { DATABASE, VERSION } = require('./config');
const { stopInstance } = require('./lib/pm2');
const express = require('express'); // Import the express library
const app = express(); // Create an express application instance
const port = process.env.PORT || 3000; // Use the environment port provided by Render or default to 3000

const start = async () => {
  logger.info(`levanter ${VERSION}`);
  try {
    await DATABASE.authenticate({ retry: { max: 3 } });
  } catch (error) {
    const databaseUrl = process.env.DATABASE_URL;
    logger.error({ msg: 'Unable to connect to the database', error: error.message, databaseUrl });
    return stopInstance();
  }
  try {
    const bot = new Client();
    await bot.connect();
  } catch (error) {
    logger.error(error);
  }

  // Simple Express route to make Render happy
  app.get('/', (req, res) => {
    res.send('WhatsApp bot is running!');
  });

  // Start the Express server
  app.listen(port, () => {
    logger.info(`Server is listening on port ${port}`);
  });
};

start();
