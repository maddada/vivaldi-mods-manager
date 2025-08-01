#!/bin/bash

# Author: debiedowner (Mac version)

# Change to the script's directory
cd "$(dirname "$0")"

# Vivaldi installation paths
INSTALL_PATHS=(
    "/Applications/Vivaldi.app/Contents/Frameworks/Vivaldi Framework.framework/Versions/Current/Resources/vivaldi/"
    "/Applications/Vivaldi Snapshot.app/Contents/Frameworks/Vivaldi Framework.framework/Versions/Current/Resources/vivaldi/"
)

echo
echo "## 2- Locating window.html in available installations"

# Find which installations exist
FOUND_PATHS=()
for path in "${INSTALL_PATHS[@]}"; do
    if [ -f "${path}window.html" ]; then
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
echo "## 3- Backing up window.html files"

for path in "${FOUND_PATHS[@]}"; do
    echo "Processing: ${path}"
    # Create backup if it doesn't exist
    if [ ! -f "${path}window.bak.html" ]; then
        echo "Creating a backup of your original window.html file."
        cp "${path}window.html" "${path}window.bak.html"
    fi
done

echo
echo "## 4- Copying js files and Patching window.html"

for path in "${FOUND_PATHS[@]}"; do
    echo "Installing to: ${path}"

    echo "Copying js files code to custom.js"
    if ls ./applied-js-mods/*.js 1> /dev/null 2>&1; then
        cat ./applied-js-mods/*.js > "${path}custom.js"
    else
        echo "No JS files found in applied-js-mods/, creating empty custom.js"
        touch "${path}custom.js"
    fi

    # Patch window.html
    sed '/<\/body>/d; /<\/html>/d' "${path}window.bak.html" > "${path}window.html"
    echo '    <script src="custom.js"></script>' >> "${path}window.html"
    echo '  </body>' >> "${path}window.html"
    echo '</html>' >> "${path}window.html"
done

echo
echo "## Done"
# echo "Press Enter to exit..."
# read
