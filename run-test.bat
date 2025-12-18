@echo off
echo Starting Playwright Excel Test...
echo.

echo Cleaning up Docker resources...
docker-compose down
docker rmi playwright-excel-automation_playwright-test playwright-excel-automation_test-runner 2>nul
docker network prune -f
docker system prune -f

echo Starting test...
docker-compose --profile manual up test-runner

echo.
echo Test execution completed.
pause