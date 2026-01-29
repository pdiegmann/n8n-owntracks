import fs from 'fs';
import path from 'path';
import { parse } from 'yaml';
import { Config, ConfigSchema } from './config';

/**
 * Load configuration from YAML file
 */
export function loadConfig(configPath?: string): Config {
  const configFile = configPath || process.env.CONFIG_PATH || './config.yaml';
  
  let config: Partial<Config> = {};
  
  // Try to load config file if it exists
  if (fs.existsSync(configFile)) {
    const fileContent = fs.readFileSync(configFile, 'utf8');
    config = parse(fileContent);
  }
  
  // Override with environment variables
  const envOverrides: Partial<Config> = {};
  
  if (process.env.SERVER_HOST) {
    envOverrides.server = { ...envOverrides.server, host: process.env.SERVER_HOST } as any;
  }
  if (process.env.SERVER_PORT) {
    envOverrides.server = { ...envOverrides.server, port: parseInt(process.env.SERVER_PORT) } as any;
  }
  if (process.env.AUTH_USERNAME) {
    envOverrides.auth = { ...envOverrides.auth, enabled: true, username: process.env.AUTH_USERNAME } as any;
  }
  if (process.env.AUTH_PASSWORD) {
    envOverrides.auth = { ...envOverrides.auth, enabled: true, password: process.env.AUTH_PASSWORD } as any;
  }
  if (process.env.ENCRYPTION_KEY) {
    envOverrides.encryption = { ...envOverrides.encryption, enabled: true, key: process.env.ENCRYPTION_KEY } as any;
  }
  if (process.env.DB_PATH) {
    envOverrides.database = { ...envOverrides.database, path: process.env.DB_PATH } as any;
  }
  if (process.env.DB_TTL) {
    envOverrides.database = { ...envOverrides.database, ttl: parseInt(process.env.DB_TTL) } as any;
  }
  
  // Merge config sources
  const mergedConfig = {
    server: { ...config.server, ...envOverrides.server },
    auth: { ...config.auth, ...envOverrides.auth },
    encryption: { ...config.encryption, ...envOverrides.encryption },
    database: { ...config.database, ...envOverrides.database },
    logging: { ...config.logging },
  };
  
  // Validate and return
  return ConfigSchema.parse(mergedConfig);
}
