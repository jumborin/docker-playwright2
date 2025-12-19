import * as xlsx from 'xlsx';
import * as fs from 'fs';
import * as path from 'path';

export type TestStep = {
  caseId: string;
  description?: string;
  action: string;
  selector: string;
  value?: string;
  expect?: string;
};

/**
 * 指定されたExcelファイルからテストステップを読み込む
 * @param filePath Excelファイルのパス
 * @returns テストステップの配列
 */
export function loadTestSteps(filePath: string): TestStep[] {
  if (!fs.existsSync(filePath)) {
    const sanitizedPath = filePath.replace(/[\r\n\t]/g, '');
    console.warn(`Excel file not found: ${sanitizedPath}`);
    return [];
  }

  try {
    const workbook = xlsx.readFile(filePath, { codepage: 65001 });
    const sheetName = workbook.SheetNames[0];
    const worksheet = workbook.Sheets[sheetName];
    
    const jsonData = xlsx.utils.sheet_to_json(worksheet, { header: 1, raw: false });
    const headers = jsonData[0] as string[];
    const rows = jsonData.slice(1) as any[][];

    return rows
      .filter(row => row.length > 0 && row[0]) // Skip empty rows
      .map(row => {
        const step: TestStep = {
          caseId: row[0]?.toString() || '',
          description: row[1]?.toString() || '',
          action: row[2]?.toString() || '',
          selector: row[3]?.toString() || '',
          value: row[4]?.toString() || '',
          expect: row[5]?.toString() || ''
        };
        return step;
      })
      .filter(step => step.caseId && step.action);
  } catch (error) {
    const sanitizedPath = filePath.replace(/[\r\n\t]/g, '');
    console.error(`Error reading Excel file ${sanitizedPath}:`, error);
    return [];
  }
}

/**
 * 指定されたディレクトリ内のすべてのExcelファイルからテストケースを読み込む
 * @param testCasesDir テストケースディレクトリのパス（デフォルト: './testcases'）
 * @returns すべてのテストステップの配列
 */
export function loadAllTestCases(testCasesDir: string = './testcases'): TestStep[] {
  if (!fs.existsSync(testCasesDir)) {
    const sanitizedDir = testCasesDir.replace(/[\r\n\t]/g, '');
    console.warn(`Test cases directory not found: ${sanitizedDir}`);
    return [];
  }

  let files: string[];
  try {
    files = fs.readdirSync(testCasesDir)
      .filter(file => file.endsWith('.xlsx') || file.endsWith('.xls'));
  } catch (error) {
    const sanitizedDir = testCasesDir.replace(/[\r\n\t]/g, '');
    console.error(`Error reading directory ${sanitizedDir}:`, error);
    return [];
  }

  let allSteps: TestStep[] = [];
  
  for (const file of files) {
    const safeFileName = path.basename(file);
    const filePath = path.join(testCasesDir, safeFileName);
    const steps = loadTestSteps(filePath);
    allSteps = allSteps.concat(steps);
  }

  return allSteps;
}