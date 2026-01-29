# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [1.0.0] - 2026-01-29

### Added
- Initial release of n8n-owntracks monorepo
- Backend API for OwnTracks HTTP JSON endpoints
  - Fastify-based HTTP server
  - YAML configuration support
  - Basic authentication support
  - Encryption/decryption for OwnTracks payloads
  - SQLite database with TTL-based auto-expiration
  - REST API for querying location data
  - Health check endpoint
  - Automatic cleanup of expired records
  - Comprehensive logging with Pino
- n8n Custom Nodes
  - OwnTracks Trigger node for location updates
  - Support for "New Location" and "Significant Movement" events
  - Device filtering capability
  - Configurable polling interval
  - Distance-based triggering with Haversine formula
- Documentation
  - Comprehensive README with setup instructions
  - Quick start guide
  - Configuration examples
  - Docker and docker-compose setup
  - Deployment guides (systemd, nginx reverse proxy)
  - Contributing guidelines
- Security
  - Updated bcrypt to v6.0.0 (fixing CVE vulnerabilities)
  - CodeQL security scanning (0 vulnerabilities)
  - Secure password hashing
  - Optional payload encryption

### Technical Details
- TypeScript throughout with strict type checking
- npm workspaces for monorepo management
- Zod for configuration validation
- Better-sqlite3 for lightweight database
- Proper n8n node structure following best practices

### Fixed
- SQL syntax for index creation in SQLite
- TypeScript compilation issues with n8n-workflow types
- Dependency vulnerabilities (bcrypt, n8n-workflow)

[1.0.0]: https://github.com/pdiegmann/n8n-owntracks/releases/tag/v1.0.0
