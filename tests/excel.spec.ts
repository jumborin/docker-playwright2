import { test, expect, Page } from '@playwright/test';
import { loadAllTestCases, TestStep } from '../scripts/loadExcel';

// UTF-8出力を強制
process.stdout.setEncoding('utf8');
process.stderr.setEncoding('utf8');

let allSteps: TestStep[] = [];
let testCases: string[] = [];

test.beforeAll(async () => {
  allSteps = loadAllTestCases('./testcases');
  testCases = Array.from(new Set(allSteps.map(step => step.caseId)));
});

test('Load and execute test cases', async ({ page }) => {
  test.setTimeout(120000); // 2分のタイムアウト
  
  if (testCases.length === 0) {
    console.log('No Excel test cases found in ./testcases directory');
    expect(true).toBe(true);
    return;
  }

  console.log(`Found ${testCases.length} test cases: ${testCases.join(', ')}`);

  for (const caseId of testCases) {
    const caseSteps = allSteps.filter(step => step.caseId === caseId);
    const firstStep = caseSteps[0];
    const description = firstStep?.description || '';
    const displayName = description ? `${caseId}: ${description}` : caseId;
    
    console.log(`\n=== Executing test case: ${displayName} ===`);
    console.log(`Steps count: ${caseSteps.length}`);
    
    for (const [index, step] of caseSteps.entries()) {
      console.log(`Step ${index + 1}/${caseSteps.length}: ${step.action} - ${step.selector} - ${step.value || ''} - ${step.expect || ''}`);
      
      try {
        const startTime = Date.now();
        await executeStep(page, step);
        const duration = Date.now() - startTime;
        console.log(`  ✓ Completed in ${duration}ms`);
      } catch (error) {
        console.error(`  ✗ Error in step ${index + 1} of case ${caseId}:`, error);
        throw error;
      }
    }
    console.log(`=== Completed test case: ${caseId} ===\n`);
  }
});

/**
 * 指定されたテストステップをPlaywrightで実行する
 * @param page PlaywrightのPageオブジェクト
 * @param step 実行するテストステップ
 */
async function executeStep(page: Page, step: TestStep): Promise<void> {
  const actionsWithoutSelector = ['screenshot', 'wait', 'press'];
  if (!actionsWithoutSelector.includes(step.action.toLowerCase()) && (!step.selector || step.selector.trim() === '')) {
    throw new Error(`Invalid selector for action '${step.action}': selector is required`);
  }
  
  // pressアクションの場合、valueが必要
  if (step.action.toLowerCase() === 'press' && (!step.value || step.value.trim() === '')) {
    throw new Error(`Press action requires a key name in the 'value' field`);
  }
  
  switch (step.action.toLowerCase()) {
    // 指定されたURLにページ移動
    case 'goto':
      await page.goto(step.selector, { timeout: 60000, waitUntil: 'domcontentloaded' });
      break;
      
    // 入力フィールドに値を入力
    case 'fill':
      if (!step.selector) {
        throw new Error('Fill action requires a valid selector');
      }
      await page.fill(step.selector, step.value || '', { timeout: 30000 });
      break;
      
    // 要素をクリック
    case 'click':
      await page.click(step.selector, { timeout: 30000 });
      break;
      
    // 要素のテキストが期待値と一致するかを確認
    case 'asserttext':
      await expect(page.locator(step.selector)).toHaveText(step.expect || '');
      break;
      
    // 要素が表示されているかを確認
    case 'assertvisible':
      await expect(page.locator(step.selector)).toBeVisible();
      break;
      
    // 指定された時間だけ待機
    case 'wait':
      const waitTime = parseInt(step.value || '1000');
      const validWaitTime = Number.isNaN(waitTime) ? 1000 : waitTime;
      await page.waitForTimeout(validWaitTime);
      break;
      
    // 入力フィールドに文字をタイピング
    case 'type':
      await page.type(step.selector, step.value || '', { timeout: 30000 });
      break;
      
    // キーボードキーを押下
    case 'press':
      const keyName = step.value || step.selector;
      console.log(`Pressing key: '${keyName}'`);
      
      // キー名を正規化
      const normalizedKey = keyName.trim();
      
      try {
        // フォーカスされた要素がある場合はその要素にキーを送信
        const focusedElement = await page.locator(':focus').count();
        if (focusedElement > 0 && normalizedKey.toLowerCase() === 'enter') {
          await page.locator(':focus').press('Enter');
          console.log(`Pressed Enter on focused element`);
        } else {
          await page.keyboard.press(normalizedKey);
          console.log(`Successfully pressed key: '${normalizedKey}'`);
        }
      } catch (error) {
        console.error(`Failed to press key '${normalizedKey}':`, error);
        throw error;
      }
      break;
      
    // セレクトボックスで選択肢を選択
    case 'select':
      await page.selectOption(step.selector, step.value || '');
      break;
      
    // 要素にマウスホバー
    case 'hover':
      await page.hover(step.selector);
      break;
      
    // スクリーンショットを撮影
    case 'screenshot':
      const browserName = page.context().browser()?.browserType().name() || 'unknown';
      const now = new Date();
      const timestamp = `${now.getFullYear()}${(now.getMonth()+1).toString().padStart(2,'0')}${now.getDate().toString().padStart(2,'0')}_${now.getHours().toString().padStart(2,'0')}${now.getMinutes().toString().padStart(2,'0')}${now.getSeconds().toString().padStart(2,'0')}_${now.getMilliseconds().toString().padStart(3,'0')}`;
      await page.screenshot({ 
        path: `reports/screenshot-${step.caseId}-${browserName}-${timestamp}.png` 
      });
      break;
      
    // 未知のアクション
    default:
      console.warn(`Unknown action: ${step.action}`);
      break;
  }
}