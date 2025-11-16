:: Author: debiedowner

@echo off

REM make current directory work when run as administrator
cd "%~dp0"

set installPath=C:\Programs\Vivaldi Work\Application\

echo ## 1- Searching for window.html

echo Searching at: %installPath%
for /f "tokens=*" %%a in ('dir /a:-d /b /s "%installPath%"') do (
	if "%%~nxa"=="window.html" set latestVersionFolder=%%~dpa
)

echo:
echo ## 2- Verifying backup exists

if "%latestVersionFolder%"=="" (
	echo Error: Could not find window.html in the installation path.
	pause & exit
) else (
	echo Found latest version folder: "%latestVersionFolder%"
)

if not exist "%latestVersionFolder%\window.bak.html" (
	echo Error: Backup file window.bak.html not found!
	echo Cannot safely uninstall without backup.
	pause & exit
) else (
	echo Backup file found.
)

echo:
echo ## 3- Restoring original window.html

echo Restoring window.html from backup...
copy /Y "%latestVersionFolder%\window.bak.html" "%latestVersionFolder%\window.html"
echo window.html restored successfully.

echo:
echo ## 4- Removing custom.js

if exist "%latestVersionFolder%\custom.js" (
	echo Deleting custom.js...
	del "%latestVersionFolder%\custom.js"
	echo custom.js removed.
) else (
	echo custom.js not found, skipping.
)

echo:
echo ## 5- Removing CSS files from applied-js-mods folder

if exist "applied-js-mods\*.css" (
	for %%f in (applied-js-mods\*.css) do (
		if exist "%latestVersionFolder%\%%~nxf" (
			echo Deleting %latestVersionFolder%\%%~nxf
			del "%latestVersionFolder%\%%~nxf"
		)
	)
) else (
	echo No CSS files found in applied-js-mods/, skipping
)

echo:
echo ## 6- Removing UserTheme folder

if exist "%installPath%UserTheme\" (
	echo Removing UserTheme folder...
	rmdir /S /Q "%installPath%UserTheme\"
	echo UserTheme folder removed.
) else (
	echo UserTheme folder not found, skipping.
)

echo:
echo ## Done
echo:
echo Note: The backup file window.bak.html has been kept for safety.
echo You can manually delete it from: %latestVersionFolder%

pause
