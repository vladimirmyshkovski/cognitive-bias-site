#!/bin/bash
# Symlink the content directory from the encyclopedia
# This allows the Astro site to read the original markdown files

CONTENT_SRC="/home/vladimirmyshkovski/Документы/Obsidian/Энциклопедии/Энциклопедия когнитивных искажений/ru/5. Каталог"
TARGET="$(dirname "$0")/../src/content/biases"

if [ ! -d "$CONTENT_SRC" ]; then
  echo "ERROR: Source directory not found: $CONTENT_SRC"
  exit 1
fi

mkdir -p "$(dirname "$TARGET")"
rm -f "$TARGET"
ln -s "$CONTENT_SRC" "$TARGET"

echo "Symlinked: $TARGET -> $CONTENT_SRC"
ls -la "$TARGET" | head -3
