@echo off
echo Cleaning up previous test results...
echo.

if exist "reports\" (
    echo Removing reports directory...
    rmdir /s /q "reports"
)

if exist "test-results\" (
    echo Removing test-results directory...
    rmdir /s /q "test-results"
)

if exist "playwright-report\" (
    echo Removing playwright-report directory...
    rmdir /s /q "playwright-report"
)

echo Creating fresh reports directory...
mkdir "reports" 2>nul

echo.
echo Test results cleanup completed.
pause