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

1. Merge changes to the default branch.
2. Run the release script from the repo root (defaults to patch; use `minor` or `major` as needed):
```bash
./release.sh
# Or explicitly specify the release type:
./release.sh minor
```
3. The `release.yml` workflow publishes the backend Docker image, publishes the n8n node to npm, and creates the GitHub release from the shared `vX.Y.Z` tag.

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
