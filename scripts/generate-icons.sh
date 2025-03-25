#!/usr/bin/env bash

# --------------------------
# Configuration
# --------------------------
SOURCE_ICON="icons/icon.png"
OUTPUT_DIR="icons"
SIZES=(128 48 16)

# Sharpening parameters
SHARPEN_128="0.25x0.25+0.25+0.01"
SHARPEN_48="0.5x0.5+0.5+0.008"
SHARPEN_16="1x1+0.75+0.008"

# --------------------------
# Initialization
# --------------------------
set -eo pipefail
echo "🎨✨ Starting icon generation party!"

# Validate environment
if ! command -v magick >/dev/null 2>&1; then
    echo "❌ Oops! ImageMagick isn't installed." 
    echo "   💻 Fix it with: brew install imagemagick"
    exit 1
fi

# Validate source file
if [[ ! -f "$SOURCE_ICON" ]]; then
    echo "❌ Whoops! Missing source icon at $SOURCE_ICON"
    echo "   ℹ️  Pro tip: Place your masterpiece there first"
    exit 1
fi

# Create output directory if needed
mkdir -p "$OUTPUT_DIR"
echo "📁 Created output directory: $OUTPUT_DIR/"

# --------------------------
# Processing
# --------------------------
echo "🔍 Processing source icon: $(ls -lh "$SOURCE_ICON")"
echo "⏳ Crunching pixels with magic wand..."

# Generate base 128px version with padding
magick "$SOURCE_ICON" \
    -trim \
    -bordercolor transparent -border 25 \
    -filter Lanczos -resize 128x128 \
    -unsharp "$SHARPEN_128" \
    -define png:compression-level=9 \
    "${OUTPUT_DIR}/icon128.png"

echo "🖼  Base 128px icon baked fresh!"

# Generate other sizes
for size in "${SIZES[@]}"; do
    if [[ "$size" -ne 128 ]]; then
        echo "📐 Resizing to ${size}px..."
        case $size in
            48)
                magick "${OUTPUT_DIR}/icon128.png" \
                    -filter Lanczos -resize 48x48 \
                    -unsharp "$SHARPEN_48" \
                    -define png:compression-level=9 \
                    "${OUTPUT_DIR}/icon48.png"
                ;;
            16)
                echo "🔮 Adding extra magic for 16px transparency..."
                magick "${OUTPUT_DIR}/icon128.png" \
                    -filter Lanczos -resize 16x16 \
                    -unsharp "$SHARPEN_16" \
                    -alpha on \
                    -background transparent \
                    -define png:format=png32 \
                    -define png:compression-level=9 \
                    "${OUTPUT_DIR}/icon16.png"
                ;;
        esac
    fi
done

# --------------------------
# Verification
# --------------------------
echo -e "\n🎉 Icon buffet ready! Here's what we cooked:"
for size in "${SIZES[@]}"; do
    ls -lh "${OUTPUT_DIR}/icon${size}.png"
done

echo -e "\n🔍 Quality control check:"
for size in "${SIZES[@]}"; do
    if file "${OUTPUT_DIR}/icon${size}.png" | grep -q "RGBA"; then
        echo "✔️  icon${size}.png: Beautiful transparency!"
    else
        echo "❌ icon${size}.png: Uh oh, missing transparency!"
    fi
done

echo -e "\n✅ All done! Icons are ready to rock 🤘"
echo "   Next step: npm run build or git commit"