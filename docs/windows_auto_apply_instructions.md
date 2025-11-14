# AutoHotkey v2 Folder Monitoring Script

## Problem
I have a bat file that I want to run automatically if a certain folder has files added to it or if any files inside that folder are changed. How can I do this using AutoHotkey v2?

## Solution
You can easily do this using AutoHotkey v2's `FileChangeMonitor` function. This function watches a specified folder for changes and runs a custom function (a "callback") whenever a change is detected.

Here is a complete script that will run your batch file when a file is added to or changed within a folder.

### AutoHotkey v2 Script
This script will monitor a folder and its subfolders for file creation and modification events.

```autohotkey
#Requires AutoHotkey v2.0
#Persistent ; Keeps the script running in the background

; --- Configuration ---
; IMPORTANT: Change these two paths to match your system.
folderToWatch := "C:\Users\YourUser\Desktop\MonitoredFolder" ; 📁 The folder to watch.
batToRun      := "C:\Path\To\YourScript.bat"               ; 🦇 The batch file to run.

; --- Main Script ---
; Check if the folder and file exist to prevent errors on startup.
if not DirExist(folderToWatch) {
    MsgBox("Error: The folder to watch does not exist.`n`n" folderToWatch)
    ExitApp
}
if not FileExist(batToRun) {
    MsgBox("Error: The batch file to run does not exist.`n`n" batToRun)
    ExitApp
}

; Start monitoring the folder.
; The "S" option includes subfolders. Remove it to only watch the top-level folder.
FileChangeMonitor(folderToWatch, ChangeDetected, "S")
return ; End of the auto-execute section.

; --- Callback Function ---
; This function is called automatically when a change is detected.
ChangeDetected(Event, Path, OldPath:="") {
    global batToRun ; Make the global variable accessible inside the function.

    ; Event=1 means a file/folder was created.
    ; Event=3 means a file/folder was modified.
    if (Event = 1 or Event = 3) {
        ; Check if the change was to a file, not a directory.
        if not DirExist(Path) {
            Run(batToRun)
        }
    }
}
```

## How to Use

1. **Install AutoHotkey v2**: If you haven't already, download and install it from the official AutoHotkey website.

2. **Create a New Script**: Right-click on your desktop, go to **New** → **AutoHotkey Script**, and give it a name (e.g., `FolderWatcher.ahk`).

3. **Edit the Script**: Right-click the new file and select **Edit script**.

4. **Paste the Code**: Copy the code above and paste it into the script file.

5. **Modify the Paths**: You must change the `folderToWatch` and `batToRun` variables to the correct paths on your computer.

6. **Save and Run**: Save the file and then double-click it to run. An AutoHotkey icon (a green "H") will appear in your system tray, indicating the script is active and monitoring the folder.

## ⚙️ Customization and Improvements

### Watch Only the Top-Level Folder
If you do not want to monitor subfolders, simply remove the "S" option from the FileChangeMonitor line:

```autohotkey
; Change this:
FileChangeMonitor(folderToWatch, ChangeDetected, "S")

; To this:
FileChangeMonitor(folderToWatch, ChangeDetected)
```

### Prevent Running the Batch File Too Often
If many files are changed at once (e.g., extracting a zip archive), the script might try to run the batch file multiple times in quick succession. To prevent this, you can add a small cooldown period.

Here's an updated version of the `ChangeDetected` function that will only run the batch file once every 5 seconds at most:

```autohotkey
; --- Callback Function with Cooldown ---
isReady := true ; A flag to check if we can run the script.

ChangeDetected(Event, Path, OldPath:="") {
    global isReady, batToRun

    if (isReady and (Event = 1 or Event = 3)) {
        if not DirExist(Path) {
            isReady := false ; Set the flag to false to prevent re-entry.
            Run(batToRun)
            SetTimer () => isReady := true, -5000 ; Reset the flag to true after 5000 ms (5 seconds).
        }
    }
}
```