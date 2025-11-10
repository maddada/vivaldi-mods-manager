#!/bin/bash

# Author: debiedowner (Mac version - Uninstaller)

# Change to the script's directory
cd "$(dirname "$0")"

# Vivaldi installation paths
INSTALL_PATHS=(
    "/Applications/Vivaldi.app/Contents/Frameworks/Vivaldi Framework.framework/Versions/Current/Resources/vivaldi/"
    "/Applications/Vivaldi Snapshot.app/Contents/Frameworks/Vivaldi Framework.framework/Versions/Current/Resources/vivaldi/"
)

echo
echo "## 1- Locating Vivaldi installations"

# Find which installations exist
FOUND_PATHS=()
for path in "${INSTALL_PATHS[@]}"; do
    if [ -d "$path" ]; then
        echo "Found: ${path}"
        FOUND_PATHS+=("$path")
    else
        echo "Not found: ${path}"
    fi
done

if [ ${#FOUND_PATHS[@]} -eq 0 ]; then
    echo "Error: No Vivaldi installations found"
    exit 1
fi

echo
echo "## 2- Restoring original window.html files"

for path in "${FOUND_PATHS[@]}"; do
    echo "Processing: ${path}"

    if [ -f "${path}window.bak.html" ]; then
        echo "Restoring window.html from backup"
        cp "${path}window.bak.html" "${path}window.html"
        echo "Backup restored successfully"
    else
        echo "Warning: No backup found at ${path}window.bak.html"
    fi
done

echo
echo "## 3- Removing custom.js files"

for path in "${FOUND_PATHS[@]}"; do
    if [ -f "${path}custom.js" ]; then
        echo "Removing: ${path}custom.js"
        rm "${path}custom.js"
    else
        echo "No custom.js found at: ${path}"
    fi
done

echo
echo "## 4- Removing CSS files"

for path in "${FOUND_PATHS[@]}"; do
    echo "Checking CSS files in: ${path}"

    if ls ./applied-js-mods/*.css 1> /dev/null 2>&1; then
        for css_file in ./applied-js-mods/*.css; do
            css_basename=$(basename "$css_file")
            target_file="${path}${css_basename}"

            if [ -f "$target_file" ]; then
                echo "Removing: ${target_file}"
                rm "$target_file"
            else
                echo "Not found: ${target_file}"
            fi
        done
    else
        echo "No CSS files found in applied-js-mods/ directory"
    fi
done

echo
echo "## Done - Vivaldi mods have been uninstalled"
echo "Note: Backup files (window.bak.html) have been kept for safety"
echo
