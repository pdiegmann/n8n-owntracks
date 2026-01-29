import { z } from 'zod';

/**
 * Configuration schema for the OwnTracks backend
 */
export const ConfigSchema = z.object({
  server: z.object({
    host: z.string().default('0.0.0.0'),
    port: z.number().default(3000),
    cors: z.boolean().default(true),
  }).default({}),
  
  auth: z.object({
    enabled: z.boolean().default(false),
    username: z.string().optional(),
    password: z.string().optional(), // bcrypt hashed password
  }).default({}),
  
  encryption: z.object({
    enabled: z.boolean().default(false),
    key: z.string().optional(), // Decryption key for OwnTracks encrypted payloads
  }).default({}),
  
  database: z.object({
    path: z.string().default('./data/owntracks.db'),
    ttl: z.number().default(2592000), // Default: 30 days in seconds
  }).default({}),
  
  logging: z.object({
    level: z.enum(['fatal', 'error', 'warn', 'info', 'debug', 'trace']).default('info'),
    pretty: z.boolean().default(true),
  }).default({}),
});

export type Config = z.infer<typeof ConfigSchema>;
