import pino from 'pino';
import { loadConfig } from './config-loader';
import { LocationDatabase } from './database';
import { createServer } from './server';

/**
 * Main entry point for the OwnTracks backend
 */
async function main() {
  // Load configuration
  const config = loadConfig();

  // Create logger
  const logger = pino({
    level: config.logging.level,
    transport: config.logging.pretty
      ? {
          target: 'pino-pretty',
          options: {
            colorize: true,
            translateTime: 'HH:MM:ss Z',
            ignore: 'pid,hostname',
          },
        }
      : undefined,
  });

  logger.info('Starting OwnTracks Backend...');
  logger.info({ config: { ...config, auth: { ...config.auth, password: '***' } } }, 'Configuration loaded');

  // Initialize database
  const db = new LocationDatabase(config.database.path, config.database.ttl);
  logger.info({ path: config.database.path, ttl: config.database.ttl }, 'Database initialized');

  // Set up periodic cleanup (run every hour)
  const cleanupInterval = setInterval(() => {
    const deleted = db.cleanupExpired();
    if (deleted > 0) {
      logger.info({ deleted }, 'Automatic cleanup completed');
    }
  }, 3600000); // 1 hour

  // Create and start server
  const server = await createServer(config, db, logger);

  try {
    await server.listen({
      host: config.server.host,
      port: config.server.port,
    });
    logger.info(`Server listening on ${config.server.host}:${config.server.port}`);
  } catch (error) {
    logger.error(error, 'Error starting server');
    process.exit(1);
  }

  // Graceful shutdown
  const shutdown = async (signal: string) => {
    logger.info(`${signal} received, shutting down gracefully...`);
    clearInterval(cleanupInterval);
    await server.close();
    db.close();
    process.exit(0);
  };

  process.on('SIGTERM', () => shutdown('SIGTERM'));
  process.on('SIGINT', () => shutdown('SIGINT'));
}

// Run the server
main().catch((error) => {
  console.error('Fatal error:', error);
  process.exit(1);
});
