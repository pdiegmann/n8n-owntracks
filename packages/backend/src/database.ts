import Database from 'better-sqlite3';
import fs from 'fs';
import path from 'path';
import type { Database as DatabaseType } from 'better-sqlite3';

/**
 * OwnTracks location data structure
 */
export interface LocationData {
  id?: number;
  _type: string;
  tid?: string; // Tracker ID
  lat: number;
  lon: number;
  acc?: number; // Accuracy
  alt?: number; // Altitude
  batt?: number; // Battery level
  bs?: number; // Battery status
  conn?: string; // Connectivity
  tst: number; // Timestamp (Unix epoch)
  vac?: number; // Vertical accuracy
  vel?: number; // Velocity
  cog?: number; // Course over ground
  rad?: number; // Radius
  t?: string; // Trigger
  topic?: string; // MQTT topic
  device?: string; // Device identifier
  raw_json: string; // Original JSON payload
  created_at: number; // When stored in DB
}

/**
 * Database manager for OwnTracks location data
 */
export class LocationDatabase {
  private db: DatabaseType;
  private ttl: number; // TTL in seconds

  constructor(dbPath: string, ttl: number = 2592000) {
    // Ensure directory exists
    const dir = path.dirname(dbPath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }

    this.db = new Database(dbPath);
    this.ttl = ttl;
    this.init();
  }

  /**
   * Initialize database schema
   */
  private init(): void {
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS locations (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        _type TEXT NOT NULL,
        tid TEXT,
        lat REAL NOT NULL,
        lon REAL NOT NULL,
        acc REAL,
        alt REAL,
        batt INTEGER,
        bs INTEGER,
        conn TEXT,
        tst INTEGER NOT NULL,
        vac REAL,
        vel REAL,
        cog REAL,
        rad REAL,
        t TEXT,
        topic TEXT,
        device TEXT,
        raw_json TEXT NOT NULL,
        created_at INTEGER NOT NULL
      );
      
      CREATE INDEX IF NOT EXISTS idx_tst ON locations(tst);
      CREATE INDEX IF NOT EXISTS idx_device ON locations(device);
      CREATE INDEX IF NOT EXISTS idx_created_at ON locations(created_at);
    `);
  }

  /**
   * Insert location data
   */
  insertLocation(data: any): number {
    const stmt = this.db.prepare(`
      INSERT INTO locations (
        _type, tid, lat, lon, acc, alt, batt, bs, conn, tst,
        vac, vel, cog, rad, t, topic, device, raw_json, created_at
      ) VALUES (
        @_type, @tid, @lat, @lon, @acc, @alt, @batt, @bs, @conn, @tst,
        @vac, @vel, @cog, @rad, @t, @topic, @device, @raw_json, @created_at
      )
    `);

    const result = stmt.run({
      _type: data._type,
      tid: data.tid || null,
      lat: data.lat,
      lon: data.lon,
      acc: data.acc || null,
      alt: data.alt || null,
      batt: data.batt || null,
      bs: data.bs || null,
      conn: data.conn || null,
      tst: data.tst,
      vac: data.vac || null,
      vel: data.vel || null,
      cog: data.cog || null,
      rad: data.rad || null,
      t: data.t || null,
      topic: data.topic || null,
      device: data.device || null,
      raw_json: JSON.stringify(data),
      created_at: Math.floor(Date.now() / 1000),
    });

    return result.lastInsertRowid as number;
  }

  /**
   * Get recent locations
   */
  getLocations(limit: number = 100, device?: string): LocationData[] {
    let stmt;
    if (device) {
      stmt = this.db.prepare(`
        SELECT * FROM locations 
        WHERE device = ?
        ORDER BY tst DESC 
        LIMIT ?
      `);
      return stmt.all(device, limit) as LocationData[];
    } else {
      stmt = this.db.prepare(`
        SELECT * FROM locations 
        ORDER BY tst DESC 
        LIMIT ?
      `);
      return stmt.all(limit) as LocationData[];
    }
  }

  /**
   * Get location by ID
   */
  getLocation(id: number): LocationData | undefined {
    const stmt = this.db.prepare('SELECT * FROM locations WHERE id = ?');
    return stmt.get(id) as LocationData | undefined;
  }

  /**
   * Clean up expired records based on TTL
   */
  cleanupExpired(): number {
    const expiryTimestamp = Math.floor(Date.now() / 1000) - this.ttl;
    const stmt = this.db.prepare('DELETE FROM locations WHERE created_at < ?');
    const result = stmt.run(expiryTimestamp);
    return result.changes;
  }

  /**
   * Get database statistics
   */
  getStats(): { totalRecords: number; oldestRecord: number | null; newestRecord: number | null } {
    const countStmt = this.db.prepare('SELECT COUNT(*) as count FROM locations');
    const countResult = countStmt.get() as { count: number };
    
    const rangeStmt = this.db.prepare('SELECT MIN(tst) as oldest, MAX(tst) as newest FROM locations');
    const rangeResult = rangeStmt.get() as { oldest: number | null; newest: number | null };

    return {
      totalRecords: countResult.count,
      oldestRecord: rangeResult.oldest,
      newestRecord: rangeResult.newest,
    };
  }

  /**
   * Close database connection
   */
  close(): void {
    this.db.close();
  }
}
