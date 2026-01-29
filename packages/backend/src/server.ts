import Fastify, { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import cors from '@fastify/cors';
import bcrypt from 'bcrypt';
import { Config } from './config';
import { LocationDatabase } from './database';
import { decryptPayload, isEncrypted } from './encryption';

/**
 * Create and configure Fastify server
 */
export async function createServer(
  config: Config,
  db: LocationDatabase,
  logger: any
): Promise<FastifyInstance> {
  const server = Fastify({
    logger,
  });

  // Enable CORS if configured
  if (config.server.cors) {
    await server.register(cors, {
      origin: true,
      credentials: true,
    });
  }

  // Basic authentication hook
  if (config.auth.enabled) {
    server.addHook('onRequest', async (request: FastifyRequest, reply: FastifyReply) => {
      // Skip auth for health check
      if (request.url === '/health') {
        return;
      }

      const authHeader = request.headers.authorization;
      
      if (!authHeader || !authHeader.startsWith('Basic ')) {
        reply.code(401).send({ error: 'Authentication required' });
        return;
      }

      const base64Credentials = authHeader.slice(6);
      const credentials = Buffer.from(base64Credentials, 'base64').toString('utf8');
      const [username, password] = credentials.split(':');

      if (
        username !== config.auth.username ||
        !config.auth.password ||
        !(await bcrypt.compare(password, config.auth.password))
      ) {
        reply.code(401).send({ error: 'Invalid credentials' });
        return;
      }
    });
  }

  // Health check endpoint
  server.get('/health', async (request, reply) => {
    const stats = db.getStats();
    return {
      status: 'ok',
      timestamp: Date.now(),
      database: stats,
    };
  });

  // OwnTracks HTTP endpoint - POST
  server.post('/owntracks', async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      if (!request.body || request.body === '') {
        return [];
      }

      let payload = request.body;

      // Handle encrypted payloads
      if (config.encryption.enabled && config.encryption.key) {
        if (typeof payload === 'object' && payload && (payload as any)._type === 'encrypted') {
          payload = await decryptPayload((payload as any).data, config.encryption.key);
          logger.debug('Decrypted OwnTracks payload');
        } else if (typeof payload === 'string' && isEncrypted(payload)) {
          payload = await decryptPayload(payload, config.encryption.key);
          logger.debug('Decrypted OwnTracks payload');
        }
      }

      // Validate payload structure
      if (!payload || typeof payload !== 'object') {
        reply.code(400).send({ error: 'Invalid payload' });
        return;
      }

      // Handle different OwnTracks message types
      const messageType = (payload as any)._type;
      const deviceFromHeader = (request.headers['x-limit-d'] as string | undefined)?.trim();

      if (messageType === 'location') {
        // Validate required fields for location
        if (typeof (payload as any).lat !== 'number' || typeof (payload as any).lon !== 'number') {
          reply.code(400).send({ error: 'Invalid location data: lat and lon are required' });
          return;
        }

        if (deviceFromHeader && !(payload as any).device) {
          (payload as any).device = deviceFromHeader;
        }

        // Add timestamp if not present
        if (!(payload as any).tst) {
          (payload as any).tst = Math.floor(Date.now() / 1000);
        }

        // Store in database
        const id = db.insertLocation(payload);
        logger.info({ id, type: messageType }, 'Location stored');

        return { success: true, id };
      } else if (messageType === 'transition') {
        // Transition events (entering/leaving regions)
        logger.info({ type: messageType, event: (payload as any).event }, 'Transition event received');
        return { success: true };
      } else if (messageType === 'waypoint' || messageType === 'waypoints') {
        // Waypoint data
        logger.info({ type: messageType }, 'Waypoint data received');
        return { success: true };
      } else {
        // Other message types - log and acknowledge
        logger.debug({ type: messageType }, 'Unknown message type received');
        return { success: true };
      }
    } catch (error) {
      logger.error({ error }, 'Error processing OwnTracks data');
      reply.code(500).send({
        error: 'Internal server error',
        message: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  });

  // GET endpoint - retrieve locations
  server.get('/locations', async (request: FastifyRequest, reply: FastifyReply) => {
    const { limit = '100', device } = request.query as { limit?: string; device?: string };
    
    try {
      const locations = db.getLocations(parseInt(limit), device);
      return {
        success: true,
        count: locations.length,
        data: locations,
      };
    } catch (error) {
      logger.error({ error }, 'Error retrieving locations');
      reply.code(500).send({ error: 'Failed to retrieve locations' });
    }
  });

  // GET specific location by ID
  server.get('/locations/:id', async (request: FastifyRequest, reply: FastifyReply) => {
    const { id } = request.params as { id: string };
    
    try {
      const location = db.getLocation(parseInt(id));
      if (!location) {
        reply.code(404).send({ error: 'Location not found' });
        return;
      }
      return {
        success: true,
        data: location,
      };
    } catch (error) {
      logger.error({ error }, 'Error retrieving location');
      reply.code(500).send({ error: 'Failed to retrieve location' });
    }
  });

  // Cleanup endpoint - manually trigger TTL cleanup
  server.post('/cleanup', async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const deleted = db.cleanupExpired();
      logger.info({ deleted }, 'Cleanup completed');
      return {
        success: true,
        deletedRecords: deleted,
      };
    } catch (error) {
      logger.error({ error }, 'Error during cleanup');
      reply.code(500).send({ error: 'Cleanup failed' });
    }
  });

  return server;
}
