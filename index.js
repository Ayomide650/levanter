const { Client, logger } = require('./lib/client');
const { DATABASE, VERSION } = require('./config');
const stopInstance = async () => {
  try {
    // Only try to use PM2 if it's available
    const pm2Available = require('./lib/pm2').stopInstance;
    await pm2Available();
  } catch (error) {
    // PM2 not available, just log and continue
    logger.info('PM2 not used or not available, continuing shutdown...');
  }
};
const express = require('express');

const app = express();

// Codespaces and many cloud IDEs want 0.0.0.0 binding so external traffic can reach the app
const port = process.env.PORT || 3000;
const host = process.env.HOST || '0.0.0.0';

const start = async () => {
  logger.info(`levanter ${VERSION}`);

  // Modify database path for Render if using their disk storage
  try {
    const databaseUrl = process.env.DATABASE_URL;
    if (databaseUrl && databaseUrl.includes('sqlite:./data/')) {
      // Make sure data directory exists
      const fs = require('fs');
      const path = require('path');
      const dataDir = path.join(__dirname, 'data');
      if (!fs.existsSync(dataDir)) {
        fs.mkdirSync(dataDir, { recursive: true });
      }
    }
    
    await DATABASE.authenticate({ retry: { max: 3 } });
    // Sync database models if needed
    // await DATABASE.sync();
    logger.info('Database connected successfully.');
  } catch (error) {
    const databaseUrl = process.env.DATABASE_URL;
    logger.error({ msg: 'Unable to connect to the database', error: error.message, databaseUrl });
    
    // Create SQLite database if it was the selected option and doesn't exist
    if (databaseUrl && databaseUrl.startsWith('sqlite:')) {
      try {
        logger.info('Attempting to create SQLite database...');
        const { Sequelize } = require('sequelize');
        const sequelize = new Sequelize(databaseUrl);
        await sequelize.authenticate();
        await sequelize.sync();
        logger.info('SQLite database created successfully!');
        // Continue execution instead of stopping
      } catch (sqliteError) {
        logger.error('Failed to create SQLite database:', sqliteError);
        await stopInstance();
        return;
      }
    } else {
      await stopInstance();
      return;
    }
  }

  // Initialize WhatsApp client
  let bot = null;
  try {
    bot = new Client();
    await bot.connect();
    logger.info('WhatsApp bot connected successfully.');
  } catch (error) {
    logger.error('Error connecting WhatsApp bot:', error);
    // Don't exit here - we can still run the web server even if WhatsApp fails
  }

  // Setup express routes
  app.get('/', (req, res) => {
    res.send('WhatsApp bot is running!');
  });

  // Add a health check endpoint
  app.get('/health', (req, res) => {
    res.json({
      status: 'ok',
      whatsappConnected: bot?.isConnected() || false,
      databaseConnected: DATABASE?.authenticate ? true : false,
      version: VERSION
    });
  });

  // Start the web server
  const server = app.listen(port, host, () => {
    logger.info(`Server is listening on http://${host}:${port}`);
  });

  // Graceful shutdown handling
  const shutdown = async () => {
    logger.info('Shutting down...');
    
    // Close express server
    server.close();
    
    // Disconnect WhatsApp if connected
    if (bot && typeof bot.disconnect === 'function') {
      try {
        await bot.disconnect();
        logger.info('WhatsApp bot disconnected.');
      } catch (error) {
        logger.error('Error disconnecting WhatsApp bot:', error);
      }
    }
    
    // Stop PM2 instance if applicable
    await stopInstance();
    
    // Exit process
    process.exit(0);
  };

  process.on('SIGINT', shutdown);
  process.on('SIGTERM', shutdown);
};

// Execute the main function
start().catch(error => {
  logger.error('Unhandled error in start function:', error);
  stopInstance().then(() => process.exit(1));
});
