#!/bin/sh
set -e
root=$(cd "$(dirname "$0")/.." && pwd)
stage=$(mktemp -d)
trap 'rm -rf "$stage"' EXIT
mkdir -p "$stage/recipe/assets" "$root/dist"
cp "$root/skills/recipe/SKILL.md" "$stage/recipe/SKILL.md"
cp "$root/skills/recipe/assets/page-template.html" "$stage/recipe/assets/page-template.html"
rm -f "$root/dist/recipe.zip"
(cd "$stage" && zip -qr "$root/dist/recipe.zip" recipe)
echo "Built $root/dist/recipe.zip"
