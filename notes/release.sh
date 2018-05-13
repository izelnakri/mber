set -e

VERSION="$1"

if [ -z "$VERSION" ]; then
  echo "Usage: ./release.sh VERSION"
  exit 1
fi

git commit -am "Release v${VERSION}"
git tag "v${VERSION}" -a -m "Release v${VERSION}"
git pull origin master
git push origin master --follow-tags
