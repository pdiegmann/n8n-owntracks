#!/usr/bin/env bash

set -euo pipefail

RELEASE_TYPE="${1:-patch}"

case "$RELEASE_TYPE" in
  patch|minor|major) ;;
  *)
    echo "Usage: $0 [patch|minor|major]" >&2
    exit 1
    ;;
esac

for command in git npm node; do
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
  git checkout -- package.json packages/backend/package.json packages/n8n-nodes-owntracks/package.json
}

trap rollback_versions ERR

NEW_VERSION=$(npm version "$RELEASE_TYPE" --no-git-tag-version)
NEW_VERSION="${NEW_VERSION#v}"

npm --prefix packages/backend version "$NEW_VERSION" --no-git-tag-version
npm --prefix packages/n8n-nodes-owntracks version "$NEW_VERSION" --no-git-tag-version

for pkg in package.json packages/backend/package.json packages/n8n-nodes-owntracks/package.json; do
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

trap - ERR

git add package.json packages/backend/package.json packages/n8n-nodes-owntracks/package.json
git commit -m "chore: release v${NEW_VERSION}"
git tag "v${NEW_VERSION}"

if git push origin HEAD --follow-tags; then
  echo "Release v${NEW_VERSION} created and pushed."
else
  echo "Failed to push release v${NEW_VERSION}." >&2
  exit 1
fi
