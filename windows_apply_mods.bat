:: Author: debiedowner

@echo off

REM make current directory work when run as administrator
cd "%~dp0"

set installPath=C:\Programs\Vivaldi Work\Application\

echo ## 1- Copying UserTheme folder
xcopy "UserTheme" "%installPath%UserTheme\" /E /Y

echo:
echo ## 2- Searching for window.html

echo Searching at: %installPath%
for /f "tokens=*" %%a in ('dir /a:-d /b /s "%installPath%"') do (
	if "%%~nxa"=="window.html" set latestVersionFolder=%%~dpa
)

echo:
echo ## 3- Backing up window.html

if "%latestVersionFolder%"=="" (
	pause & exit
) else (
	echo Found latest version folder: "%latestVersionFolder%"
)

if not exist "%latestVersionFolder%\window.bak.html" (
	echo Creating a backup of your original window.html file.
	copy "%latestVersionFolder%\window.html" "%latestVersionFolder%\window.bak.html"
)

echo:
echo ## 4- Copying js files and Patching window.html

echo copying js files code to custom.js
type "applied-js-mods\*.js" > "%latestVersionFolder%\custom.js"

type "%latestVersionFolder%\window.bak.html" | findstr /v "</body>" | findstr /v "</html>" > "%latestVersionFolder%\window.html"
echo     ^<script src="custom.js"^>^</script^> >> "%latestVersionFolder%\window.html"
echo   ^</body^> >> "%latestVersionFolder%\window.html"
echo ^</html^> >> "%latestVersionFolder%\window.html"

echo:
echo ## Done

pause