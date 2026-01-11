# 🎨 Sharp Tabs Sidebar Hover to Expand Mod v1.2

https://github.com/user-attachments/assets/a0051a36-b2c5-4266-b431-ac6871783a02

Changelog:
- v1.2 - 2025-11-23: Fixed full screen youtube videos having a line on the left side of the video

Explanation of how to install the mods: https://youtu.be/dOAQyuEaJIQ

A simple, cross-platform tool for installing and managing Vivaldi browser modifications.

> **Get more mods**: [Vivaldi Forums - Modifications](https://forum.vivaldi.net/category/52/modifications)

## 🚨 Important steps to trouble shoot why it's not working

- Make 100% sure that floating mode is disable for Sharp Tabs (explained in the [install video](https://youtu.be/dOAQyuEaJIQ))

- To re-add Sharp Tabs panel if it was removed do the steps in this video: https://youtu.be/6sVhFGgXQKE

- Make sure to reinstall the latest version of the extension in case of any issues. Post on https://reddit.com/r/sharptabs if the issue keeps happening.

## 🚀 Quick Start

### CSS Mods (Optional)

1. Go to `vivaldi://experiments` and enable `Allow CSS modification` flag
2. Put all the CSS files you want to apply in the `applied-css-mods` folder (only `improved-extensions-dropdown-menu.css` is included by default in this repo)
3. In Vivaldi settings search for `Custom UI Modifications`, and select the folder called `applied-css-mods`
4. Restart the browser

### JavaScript Mods

1. **If installing on windows then edit the script for your OS:**
    - `window_apply_mods.bat`

2. **Run the appropriate script for your OS:**

    #### macOS
    ```
        sudo ./mac_apply_mods.sh
    ```

    #### Linux
    `sudo ./linux_apply_mods.sh`

    #### Windows
    `./window_apply_mods.bat`


> ⚠️ **Important**: files cannot have spaces in filenames.

## 🔄 Auto-Apply Mods (Survives Updates)

### Windows

Follow this [AutoHotkey v2 guide](windows_auto_apply_instructions.md) to automatically apply mods when Vivaldi updates.

### macOS

I'm using BetterTouchTool to monitor the following folders and run the mac_install_mods.sh script when changes are detected, but I'm sure there are other ways:

-   The `applied-js-mods/` folder
-   Vivaldi installation paths:
    ```
    /Applications/Vivaldi.app;;/Applications/Vivaldi Snapshot.app
    ```
<img width="800" height="634" alt="2026-01-11_BetterTouchTool_16-03-19" src="https://github.com/user-attachments/assets/28b0ea15-e1b7-4fb6-9258-790e7a9c24a6" />

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
-   **Igor-Ratajczak** - VivaZen CSS mod


And huge thanks to **Vivaldi** for creating the most customizable browser and supporting the modding community!

Please consider donating to the Vivaldi team if you like their work (recurring donations are even better): https://vivaldi.com/donate/

License: MIT
