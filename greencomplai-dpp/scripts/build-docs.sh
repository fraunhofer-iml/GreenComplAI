#!/bin/sh
set -eu

# Publish only maintained guides, with Markdown links rewritten for the website.
mkdir -p public build
printf '%s' '<a class="home" href="./">Documentation</a>' > build/home.html
cp -r docs/screenshots public/screenshots
cp docs/pages.css public/pages.css

for name in index installation user-guide architecture connectors deployment-modes releases contributing; do
  source_file="docs/$name.md"
  [ "$name" != contributing ] || source_file=CONTRIBUTING.md
  title=$(sed -n '1s/^# //p' "$source_file")
  sed -e 's|\.\./CONTRIBUTING\.md|contributing.html|g' \
      -e 's|(CONTRIBUTING\.md)|(contributing.html)|g' \
      -e 's|(README\.md)|(index.html)|g' \
      -e 's|(docs/|(|g' \
      -e 's|\.md)|.html)|g' \
      -e '1{/^# /d;}' \
      "$source_file" > "build/$name.md"
  pandoc "build/$name.md" --standalone --css pages.css \
    --metadata lang=en --metadata title="$title" --toc --toc-depth=2 \
    --include-before-body=build/home.html -o "public/$name.html"
done

# Keep the former user-guide URL working for existing installations.
cp public/user-guide.html public/benutzerhandbuch.html
