@echo off
echo Starting Playwright Excel Test...
echo.

echo Cleaning up Docker resources...
docker-compose down --remove-orphans
docker network rm playwright-network 2>nul
docker rmi docker-playwright2_playwright-test docker-playwright2_test-runner 2>nul
docker network prune -f
docker system prune -f

echo Starting test...
docker-compose --profile manual up test-runner

echo.
echo Test execution completed.
pause