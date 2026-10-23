#!/bin/sh
# Publish the port to GitHub Pages: tools/deploy.sh [original|own]
#   original (default): original art + data files from port/original-assets/
#   own: our re-authored stand-ins only (the fallback if the author objects)
# The build goes to the gh-pages branch as a single force-pushed commit, so
# swapping variants leaves no copy of the original art in the branch history.
set -e
variant=${1:-original}
cd "$(dirname "$0")/../port"
remote=$(git remote get-url origin)
case $variant in
  original) npm run build:original; out=dist-original ;;
  own) npx tsc && npx vite build --base=./; out=dist ;;
  *) echo "usage: $0 [original|own]" >&2; exit 1 ;;
esac
cd "$out"
rm -rf .git
touch .nojekyll
git init -q -b gh-pages
git add -A
git commit -qm "Deploy ($variant art)"
git push -qf "$remote" gh-pages
rm -rf .git
echo "Deployed $variant art to gh-pages."
