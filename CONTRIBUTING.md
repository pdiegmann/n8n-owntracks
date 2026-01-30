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

1. Merge changes to the default branch.
2. Tag a release like `backend-v1.2.3`:
```bash
git tag backend-v1.2.3
git push origin backend-v1.2.3
```
3. The `release-backend.yml` workflow builds and pushes `latest` and the versioned tag to GHCR.

### n8n Node Package (npm)

1. Bump the package version:
```bash
cd packages/n8n-nodes-owntracks
npm version patch --no-git-tag-version
```
2. Commit and push the version bump, then tag a release like `nodes-v1.2.3`:
```bash
git add package.json
git commit -m "chore: bump n8n node version"
git push
git tag nodes-v1.2.3
git push origin nodes-v1.2.3
```
3. The `release-n8n-node.yml` workflow builds and publishes to npm using `NPM_TOKEN` (configured in repository secrets).
   For manual releases, you can substitute `bun publish` in place of `npm publish` if preferred, but verify npm-specific lifecycle hooks/config behave as expected.

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
