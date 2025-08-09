# 🎨 Vivaldi Mods Manager

A simple, cross-platform tool for installing and managing Vivaldi browser modifications.

> **Get more mods**: [Vivaldi Forums - Modifications](https://forum.vivaldi.net/category/52/modifications)

## 🚀 Quick Start

### JavaScript Mods

1. **Edit the appropriate script for your OS:**

    - `mac_apply_mods.sh` for macOS
    - `linux_apply_mods.sh` for Linux
    - `window_apply_mods.bat` for Windows

2. **Run the script:**

    ```bash
    # macOS
    sudo ./mac_apply_mods.sh

    # Linux
    sudo ./linux_apply_mods.sh

    # Windows
    ./window_apply_mods.bat
    ```

### CSS Mods

1. **Enable CSS modifications:**

    - Open `vivaldi://experiments` or `chrome://flags/#vivaldi-css-mods` for v7.6+
    - Enable "Allow for using CSS modifications"

2. **Set custom folder:**

    - Go to Settings → Appearance → Custom UI Modifications
    - Choose your CSS folder (e.g., `applied-css-mods/`)

3. **Add CSS files and restart Vivaldi**

> ⚠️ **Important**: CSS files cannot have spaces in filenames. Ensure files have `.css` extension.

## 🔄 Auto-Apply Mods (Survives Updates)

### Windows

Follow the [AutoHotkey v2 guide](windows_auto_apply_instructions.md) to automatically apply mods when Vivaldi updates.

### macOS

I'm using BetterTouchTool to monitor the following folders and run the mac_apply_mods.sh script when changes are detected:

-   The `applied-js-mods/` folder
-   Vivaldi installation paths:
    ```
    /Applications/Vivaldi.app/Contents/Frameworks/Vivaldi Framework.framework/Versions/Current/Vivaldi Framework
    /Applications/Vivaldi Snapshot.app/Contents/Frameworks/Vivaldi Framework.framework/Versions/Current/Vivaldi Framework
    ```

### Linux

Hope someone can contribute a tested linux_auto_apply_instructions.md file.

## 📚 Resources

-   [**How to mod Vivaldi**](https://forum.vivaldi.net/topic/10549/modding-vivaldi) by Christoph142
-   [Vivaldi Modifications Forum](https://forum.vivaldi.net/category/52/modifications)

## 🙏 Credits

Special thanks to the Vivaldi modding community:

-   **Christoph142** - Modding guides and scripts
-   **luetage** - Mac apply mods script (and helping everyone on the forum!)
-   **Isildur** - Mac apply mods script
-   **debiedowner** - Windows apply mods script
-   **GwenDragon** - Linux apply mods script

And huge thanks to **Vivaldi** for creating the most customizable browser and supporting the modding community!

Please consider donating to the Vivaldi team if you like their work (recurring donations are even better): https://vivaldi.com/donate/

License: MIT