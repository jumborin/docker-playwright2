import * as cron from 'node-cron';
import { exec } from 'child_process';
import { promises as fs } from 'fs';
import * as http from 'http';
import * as path from 'path';

interface LogEntry {
  timestamp: string;
  success: boolean;
  stdout: string;
  stderr: string;
  error: string | null;
}

interface Config {
  schedule: string;
  enabled: boolean;
  port: number;
  logFile: string;
  maxLogs: number;
  timeout: number;
}

class TestScheduler {
  private config: Config;

  constructor() {
    this.config = {
      schedule: process.env.CRON_SCHEDULE || '0 2 * * *',
      enabled: process.env.SCHEDULE_ENABLED === 'true',
      port: parseInt(process.env.PORT || '9323'),
      logFile: path.join('/app/reports', 'execution-log.json'),
      maxLogs: 100,
      timeout: 300000 // 5分
    };
  }

  /**
   * 現在の日本時間を取得
   */
  private getJSTTime(): string {
    return new Date().toLocaleString('ja-JP', { timeZone: 'Asia/Tokyo' });
  }

  /**
   * ログエントリをサニタイズ
   */
  private sanitizeLogEntry(entry: LogEntry): LogEntry {
    return {
      ...entry,
      stdout: entry.stdout.replace(/[\r\n\t]/g, ' ').substring(0, 1000),
      stderr: entry.stderr.replace(/[\r\n\t]/g, ' ').substring(0, 1000),
      error: entry.error?.replace(/[\r\n\t]/g, '') || null
    };
  }

  /**
   * ログファイルを読み込み
   */
  private async readLogs(): Promise<LogEntry[]> {
    try {
      const data = await fs.readFile(this.config.logFile, 'utf8');
      return JSON.parse(data);
    } catch {
      return [];
    }
  }

  /**
   * ログファイルに書き込み
   */
  private async writeLogs(logs: LogEntry[]): Promise<void> {
    try {
      await fs.mkdir(path.dirname(this.config.logFile), { recursive: true });
      const jsonString = JSON.stringify(logs, null, 2);
      // JSON形式の検証
      JSON.parse(jsonString);
      await fs.writeFile(this.config.logFile, jsonString);
    } catch (error) {
      console.error('Failed to write log file:', error);
      // フォールバックとして空配列を書き込み
      try {
        await fs.writeFile(this.config.logFile, '[]');
      } catch (fallbackError) {
        console.error('Failed to write fallback log file:', fallbackError);
      }
    }
  }

  /**
   * テストを実行し、結果をログファイルに記録する
   */
  async runTests(): Promise<void> {
    const startTime = this.getJSTTime();
    console.log(`Starting test execution at ${startTime}`);

    return new Promise((resolve) => {
      exec('npm test', 
        { cwd: '/app', timeout: this.config.timeout }, 
        async (error, stdout, stderr) => {
          const logEntry: LogEntry = {
            timestamp: this.getJSTTime(),
            success: !error,
            stdout,
            stderr,
            error: error?.message || null
          };

          const sanitizedEntry = this.sanitizeLogEntry(logEntry);
          const logs = await this.readLogs();
          logs.push(sanitizedEntry);

          if (logs.length > this.config.maxLogs) {
            logs.splice(0, logs.length - this.config.maxLogs);
          }

          await this.writeLogs(logs);

          if (error) {
            console.error(`Test execution failed: ${sanitizedEntry.error}`);
          } else {
            console.log('Test execution completed successfully');
          }

          resolve();
        }
      );
    });
  }

  /**
   * HTTPサーバーを起動
   */
  private startServer(): void {
    const server = http.createServer(async (req, res) => {
      const corsHeaders = {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type'
      };

      if (req.method === 'OPTIONS') {
        res.writeHead(200, corsHeaders);
        res.end();
        return;
      }

      try {
        if (req.url === '/run-tests' && req.method === 'POST') {
          this.runTests();
          res.writeHead(200, corsHeaders);
          res.end(JSON.stringify({ message: 'Tests started', timestamp: this.getJSTTime() }));
        } else if (req.url === '/status' && req.method === 'GET') {
          res.writeHead(200, corsHeaders);
          res.end(JSON.stringify({
            status: 'running',
            schedule: this.config.enabled ? this.config.schedule : 'disabled',
            timestamp: this.getJSTTime(),
            port: this.config.port
          }));
        } else if (req.url === '/logs' && req.method === 'GET') {
          const logs = await this.readLogs();
          res.writeHead(200, corsHeaders);
          res.end(JSON.stringify({ logs: logs.slice(-10) }));
        } else {
          res.writeHead(404, corsHeaders);
          res.end(JSON.stringify({ error: 'Not found' }));
        }
      } catch (error) {
        res.writeHead(500, corsHeaders);
        res.end(JSON.stringify({ error: 'Internal server error' }));
      }
    });

    server.listen(this.config.port, () => {
      console.log(`HTTP server listening on port ${this.config.port}`);
      console.log('Available endpoints:');
      console.log('  POST /run-tests - Manual test execution');
      console.log('  GET /status - Check scheduler status');
      console.log('  GET /logs - Get recent logs');
    });
  }

  /**
   * スケジューラーを開始
   */
  start(): void {
    console.log('Playwright Excel Test Scheduler started');

    if (this.config.enabled) {
      console.log(`Scheduling tests with cron pattern: ${this.config.schedule}`);
      cron.schedule(this.config.schedule, () => this.runTests());
    } else {
      console.log('Scheduler disabled. Running tests once and exiting.');
      this.runTests();
    }

    this.startServer();
  }
}

const scheduler = new TestScheduler();
scheduler.start();