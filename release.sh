#!/usr/bin/env bash

set -euo pipefail

ROOT_DIR=$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)

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

DEFAULT_BRANCH=$(git remote show origin 2>/dev/null | sed -n 's/^[[:space:]]*HEAD branch:[[:space:]]*//p' | head -n 1)
CURRENT_BRANCH=$(git rev-parse --abbrev-ref HEAD)
DEFAULT_BRANCH=$(printf '%s' "$DEFAULT_BRANCH" | tr -d '[:space:]')

if [ -z "$DEFAULT_BRANCH" ]; then
  echo "Unable to determine default branch. Ensure the remote default branch is configured (e.g., 'git remote set-head origin --auto')." >&2
  exit 1
fi

if [ "$CURRENT_BRANCH" != "$DEFAULT_BRANCH" ]; then
  echo "Release script must be run from the default branch ('$DEFAULT_BRANCH'), but you are on '$CURRENT_BRANCH'." >&2
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

read_package_version() {
  local rel_path="$1"
  local package_file
  for package_file in "${PACKAGE_FILES[@]}"; do
    if [ "$rel_path" = "$package_file" ]; then
      local file_path="${ROOT_DIR}/${rel_path}"
      if [ ! -f "$file_path" ]; then
        echo "Missing package file: $file_path" >&2
        exit 1
      fi
      local script
      read -r -d '' script <<'EOF'
const fs = require('fs');
try {
  const pkg = JSON.parse(fs.readFileSync(process.argv[1], 'utf8'));
  if (!pkg.version) {
    throw new Error('missing version');
  }
  console.log(pkg.version);
} catch (err) {
  console.error(`Failed to read version from ${process.argv[1]}: ${err.message}`);
  process.exit(1);
}
EOF
      local version
      if ! version=$(bun -e "$script" "$file_path"); then
        echo "Failed to read version from $file_path" >&2
        exit 1
      fi
      if [ -z "$version" ]; then
        echo "Failed to read version from $file_path" >&2
        exit 1
      fi
      echo "$version"
      return 0
    fi
  done
  echo "Unexpected package path: $rel_path" >&2
  exit 1
}

bun version "$RELEASE_TYPE" --no-git-tag-version >/dev/null
NEW_VERSION=$(read_package_version "package.json")

bump_package_version() {
  local dir="$1"
  (
    cd "${ROOT_DIR}/${dir}"
    bun version "$NEW_VERSION" --no-git-tag-version >/dev/null
  )
}

bump_package_version "packages/backend"
bump_package_version "packages/n8n-nodes-owntracks"

for pkg in "${PACKAGE_FILES[@]}"; do
  CURRENT_VERSION=$(read_package_version "$pkg")
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
