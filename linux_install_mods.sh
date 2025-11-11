#!/bin/bash

#######################################################################
# Author: GwenDragon, <https://labs.gwendragon.de/blog/>
# License: GPL
#######################################################################

# users can now use vivaldi://experiments (v7.5 & older) or chrome://flags (v7.6+) to change CSS in UI

# Get the directory where the script is located
mod_dir="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

vivaldi_installs=$(dirname $(find /opt -name "vivaldi-bin" )) ;
vivaldi_install_dirs=( $vivaldi_installs ) ;

echo "---------------------"
count=1
selected=0
echo "Installations found:"
for dir in $vivaldi_installs ; do
	echo $dir": "$count ;
	((count++)) ;
done
read -p "
Select installation to patch.
Input number and press [Enter] or [X] to cancel.
Input selection: " selected ;
if [ "$selected" = "X" ] ; then
	exit ;
fi
((selected--)) ;
if [ $selected -ge ${#vivaldi_install_dirs[@]} ] ; then
    echo "Selection too large!"
fi
dir=${vivaldi_install_dirs[$selected]} ;
echo "---------------------"
echo "Patch originating from "${mod_dir}" targeting "${vivaldi_install_dirs[$selected]} ;

sudo cp "$dir/resources/vivaldi/window.html" "$dir/resources/vivaldi/window.html-$(date +%Y-%m-%dT%H-%M-%S)"

# Copy JS files from applied-js-mods/
if ls "$mod_dir"/applied-js-mods/*.js 1> /dev/null 2>&1; then
    for js_file in "$mod_dir"/applied-js-mods/*.js; do
        js_basename=$(basename "${js_file}")
        echo "Copying ${js_basename} to ${dir}/resources/vivaldi/"
        sudo cp -f "${js_file}" "${dir}/resources/vivaldi/${js_basename}"
        
        # Check if this script is already referenced in window.html
        alreadypatched=$(grep "<script src=\"${js_basename}\"></script>" "$dir/resources/vivaldi/window.html");
        
        if [ "$alreadypatched" = "" ] ; then
            echo "Patching window.html to include ${js_basename}"
            sudo sed -i -e "s/<\/body>/<script src=\"${js_basename}\"><\/script> <\/body>/" "$dir/resources/vivaldi/window.html"
        else
            echo "${js_basename} already referenced in window.html"
        fi
    done
else
    echo "No JS files found in applied-js-mods/, skipping"
fi

# Copy CSS files from applied-css-mods/
if ls "$mod_dir"/applied-css-mods/*.css 1> /dev/null 2>&1; then
    for css_file in "$mod_dir"/applied-css-mods/*.css; do
        css_basename=$(basename "${css_file}")
        echo "Copying ${css_basename} to ${dir}/resources/vivaldi/"
        sudo cp -f "${css_file}" "${dir}/resources/vivaldi/${css_basename}"
    done
else
    echo "No CSS files found in applied-css-mods/"
fi

# Copy CSS files from applied-js-mods/ (in case there are any there too)
if ls "$mod_dir"/applied-js-mods/*.css 1> /dev/null 2>&1; then
    for css_file in "$mod_dir"/applied-js-mods/*.css; do
        css_basename=$(basename "${css_file}")
        echo "Copying ${css_basename} to ${dir}/resources/vivaldi/"
        sudo cp -f "${css_file}" "${dir}/resources/vivaldi/${css_basename}"
    done
else
    echo "No CSS files found in applied-js-mods/"
fi