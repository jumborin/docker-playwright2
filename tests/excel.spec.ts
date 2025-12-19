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
  if (testCases.length === 0) {
    console.log('No Excel test cases found in ./testcases directory');
    expect(true).toBe(true);
    return;
  }

  for (const caseId of testCases) {
    const caseSteps = allSteps.filter(step => step.caseId === caseId);
    const firstStep = caseSteps[0];
    const description = firstStep?.description || '';
    const displayName = description ? `${caseId}: ${description}` : caseId;
    
    console.log(`Executing test case: ${displayName}`);
    console.log(`Executing test case: ${caseId} with ${caseSteps.length} steps`);
    
    for (const [index, step] of caseSteps.entries()) {
      console.log(`Step ${index + 1}: ${step.action} - ${step.selector}`);
      
      try {
        await executeStep(page, step);
      } catch (error) {
        console.error(`Error in step ${index + 1} of case ${caseId}:`, error);
        throw error;
      }
    }
  }
});

/**
 * 指定されたテストステップをPlaywrightで実行する
 * @param page PlaywrightのPageオブジェクト
 * @param step 実行するテストステップ
 */
async function executeStep(page: Page, step: TestStep): Promise<void> {
  const actionsWithoutSelector = ['screenshot', 'wait'];
  if (!actionsWithoutSelector.includes(step.action.toLowerCase()) && (!step.selector || step.selector.trim() === '')) {
    throw new Error(`Invalid selector for action '${step.action}': selector is required`);
  }
  
  switch (step.action.toLowerCase()) {
    case 'goto':
      await page.goto(step.selector, { timeout: 60000, waitUntil: 'domcontentloaded' });
      break;
      
    case 'fill':
      if (!step.selector) {
        throw new Error('Fill action requires a valid selector');
      }
      await page.fill(step.selector, step.value || '');
      break;
      
    case 'click':
      await page.click(step.selector);
      break;
      
    case 'asserttext':
      await expect(page.locator(step.selector)).toHaveText(step.expect || '');
      break;
      
    case 'assertvisible':
      await expect(page.locator(step.selector)).toBeVisible();
      break;
      
    case 'wait':
      const waitTime = parseInt(step.value || '1000');
      const validWaitTime = Number.isNaN(waitTime) ? 1000 : waitTime;
      await page.waitForTimeout(validWaitTime);
      break;
      
    case 'type':
      await page.type(step.selector, step.value || '');
      break;
      
    case 'select':
      await page.selectOption(step.selector, step.value || '');
      break;
      
    case 'hover':
      await page.hover(step.selector);
      break;
      
    case 'screenshot':
      const browserName = page.context().browser()?.browserType().name() || 'unknown';
      const now = new Date();
      const timestamp = `${now.getFullYear()}${(now.getMonth()+1).toString().padStart(2,'0')}${now.getDate().toString().padStart(2,'0')}_${now.getHours().toString().padStart(2,'0')}${now.getMinutes().toString().padStart(2,'0')}${now.getSeconds().toString().padStart(2,'0')}_${now.getMilliseconds().toString().padStart(3,'0')}`;
      await page.screenshot({ 
        path: `reports/screenshot-${step.caseId}-${browserName}-${timestamp}.png` 
      });
      break;
      
    default:
      console.warn(`Unknown action: ${step.action}`);
      break;
  }
}