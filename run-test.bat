@echo off
echo Starting Playwright Excel Test...
echo.

echo Cleaning up Docker resources...
docker-compose down --remove-orphans
docker rmi docker-playwright2_playwright-test docker-playwright2_test-runner 2>nul

echo Starting test...
docker-compose --profile manual up test-runner

echo.
echo Test execution completed.
pause