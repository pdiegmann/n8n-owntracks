#!/usr/bin/env bash

set -euo pipefail

ROOT_DIR=$(pwd)

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

for command in git bun; do
  if ! command -v "$command" >/dev/null 2>&1; then
    echo "Missing required command: $command" >&2
    exit 1
  fi
done

if [ -n "$(git status --porcelain)" ]; then
  echo "Working tree is not clean. Commit or stash changes before releasing." >&2
  exit 1
fi

NEW_VERSION=""
COMMIT_CREATED="false"
TAG_CREATED="false"

rollback_versions() {
  trap - ERR INT TERM
  echo "An error occurred. Rolling back version changes..." >&2
  set +e
  cd "$ROOT_DIR"
  if [ "${TAG_CREATED}" = "true" ] && git rev-parse -q --verify "refs/tags/v${NEW_VERSION}" >/dev/null; then
    git tag -d "v${NEW_VERSION}" >/dev/null 2>&1
    TAG_CREATED="false"
  fi
  if [ "${COMMIT_CREATED}" = "true" ] && git rev-parse -q --verify HEAD~1 >/dev/null; then
    git reset --hard HEAD~1 >/dev/null 2>&1
    COMMIT_CREATED="false"
  fi
  git restore --staged "${PACKAGE_FILES[@]}" >/dev/null 2>&1
  git restore "${PACKAGE_FILES[@]}" >/dev/null 2>&1
  exit 1
}

trap rollback_versions ERR INT TERM

get_version() {
  bun -e "console.log(require('${ROOT_DIR}/$1').version)"
}

bun version "$RELEASE_TYPE" --no-git-tag-version >/dev/null
NEW_VERSION=$(get_version "package.json")

bump_package_version() {
  local dir="$1"
  cd "${ROOT_DIR}/${dir}"
  bun version "$NEW_VERSION" --no-git-tag-version >/dev/null
  cd "$ROOT_DIR"
}

bump_package_version "packages/backend"
bump_package_version "packages/n8n-nodes-owntracks"

for pkg in "${PACKAGE_FILES[@]}"; do
  CURRENT_VERSION=$(get_version "$pkg")
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
COMMIT_CREATED="true"
git tag "v${NEW_VERSION}"
TAG_CREATED="true"

if git push origin HEAD --follow-tags; then
  trap - ERR INT TERM
  echo "Release v${NEW_VERSION} created and pushed."
else
  rollback_versions
  echo "Failed to push release v${NEW_VERSION}." >&2
  exit 1
fi
