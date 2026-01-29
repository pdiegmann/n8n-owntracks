# Contributing to n8n-owntracks

Thank you for your interest in contributing to n8n-owntracks!

## Development Setup

1. Fork and clone the repository
2. Install dependencies: `bun install`
3. Build the project: `bun run build`
4. Make your changes
5. Test your changes
6. Submit a pull request

## Code Style

- Use TypeScript for all code
- Follow the existing code style
- Run linters before committing
- Add comments for complex logic

## Testing

- Test backend API endpoints manually
- Ensure TypeScript compilation succeeds
- Verify n8n nodes work correctly

## Pull Request Process

1. Update documentation if needed
2. Ensure all tests pass
3. Update the README.md with details of changes if applicable
4. The PR will be reviewed by maintainers

## Release Process (Maintainers)

### Backend Docker Image

1. Build and tag the image:
```bash
docker build -t ghcr.io/pdiegmann/n8n-owntracks-backend:latest .
```

2. Push the image:
```bash
docker push ghcr.io/pdiegmann/n8n-owntracks-backend:latest
```

3. Tag and push versioned releases (e.g. `v1.2.3`) for reproducible deploys:
```bash
docker tag ghcr.io/pdiegmann/n8n-owntracks-backend:latest ghcr.io/pdiegmann/n8n-owntracks-backend:v1.2.3
docker push ghcr.io/pdiegmann/n8n-owntracks-backend:v1.2.3
```

### n8n Node Package (npm)

1. Build the package:
```bash
cd packages/n8n-nodes-owntracks
bun install
bun run build
```

2. Bump the version:
```bash
npm version patch
```

3. Publish to npm:
```bash
npm publish --access public
```

## Bug Reports

When filing a bug report, please include:
- Description of the issue
- Steps to reproduce
- Expected behavior
- Actual behavior
- Environment details (OS, Node version, etc.)

## Feature Requests

Feature requests are welcome! Please describe:
- The feature you'd like to see
- Why it would be useful
- How it might work

Thank you for contributing!
