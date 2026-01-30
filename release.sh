#!/usr/bin/env bash

set -euo pipefail

PACKAGE_FILES=(
  "package.json"
  "packages/backend/package.json"
  "packages/n8n-nodes-owntracks/package.json"
)

RELEASE_TYPE="${1:-patch}"

case "$RELEASE_TYPE" in
  patch|minor|major) ;;
  *)
    echo "Usage: $0 [patch|minor|major]" >&2
    exit 1
    ;;
esac

for command in git bun node; do
  if ! command -v "$command" >/dev/null 2>&1; then
    echo "Missing required command: $command" >&2
    exit 1
  fi
done

if [ -n "$(git status --porcelain)" ]; then
  echo "Working tree is not clean. Commit or stash changes before releasing." >&2
  exit 1
fi

rollback_versions() {
  echo "An error occurred. Rolling back version changes..." >&2
  git checkout HEAD -- "${PACKAGE_FILES[@]}"
}

trap rollback_versions ERR INT TERM

bun version "$RELEASE_TYPE" --no-git-tag-version >/dev/null
NEW_VERSION=$(node -p "require('./package.json').version")

bun --prefix packages/backend version "$NEW_VERSION" --no-git-tag-version
bun --prefix packages/n8n-nodes-owntracks version "$NEW_VERSION" --no-git-tag-version

for pkg in "${PACKAGE_FILES[@]}"; do
  CURRENT_VERSION=$(node -p "require('./$pkg').version")
  if [ "$CURRENT_VERSION" != "$NEW_VERSION" ]; then
    echo "Version mismatch in $pkg: $CURRENT_VERSION (expected $NEW_VERSION)" >&2
    exit 1
  fi
done

if git rev-parse -q --verify "refs/tags/v${NEW_VERSION}" >/dev/null; then
  echo "Tag v${NEW_VERSION} already exists." >&2
  exit 1
fi

git add "${PACKAGE_FILES[@]}"
git commit -m "chore: release v${NEW_VERSION}"
git tag "v${NEW_VERSION}"

trap - ERR

if git push origin HEAD --follow-tags; then
  echo "Release v${NEW_VERSION} created and pushed."
else
  echo "Failed to push release v${NEW_VERSION}." >&2
  exit 1
fi
