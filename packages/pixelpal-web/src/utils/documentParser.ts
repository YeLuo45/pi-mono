import * as pdfjsLib from 'pdfjs-dist';
import mammoth from 'mammoth';
import * as XLSX from 'xlsx';

// Set up PDF.js worker
pdfjsLib.GlobalWorkerOptions.workerSrc = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version}/pdf.worker.min.js`;

export type DocumentType = 'pdf' | 'docx' | 'xlsx' | 'txt';

export async function parseDocument(
  file: File
): Promise<{ content: string; type: DocumentType }> {
  const extension = file.name.split('.').pop()?.toLowerCase() as DocumentType;

  switch (extension) {
    case 'pdf':
      return { content: await parsePDF(file), type: 'pdf' };
    case 'docx':
      return { content: await parseDocx(file), type: 'docx' };
    case 'xlsx':
      return { content: await parseXlsx(file), type: 'xlsx' };
    case 'txt':
      return { content: await parseTxt(file), type: 'txt' };
    default:
      throw new Error(`Unsupported file type: ${extension}`);
  }
}

async function parsePDF(file: File): Promise<string> {
  const arrayBuffer = await file.arrayBuffer();
  const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
  const textParts: string[] = [];

  for (let i = 1; i <= pdf.numPages; i++) {
    const page = await pdf.getPage(i);
    const content = await page.getTextContent();
    const pageText = content.items
      .map((item: unknown) => {
        const textItem = item as { str?: string };
        return textItem.str || '';
      })
      .join(' ');
    textParts.push(`--- Page ${i} ---\n${pageText}`);
  }

  return textParts.join('\n\n');
}

async function parseDocx(file: File): Promise<string> {
  const arrayBuffer = await file.arrayBuffer();
  const result = await mammoth.extractRawText({ arrayBuffer });
  return result.value;
}

async function parseXlsx(file: File): Promise<string> {
  const arrayBuffer = await file.arrayBuffer();
  const workbook = XLSX.read(arrayBuffer, { type: 'array' });
  const textParts: string[] = [];

  for (const sheetName of workbook.SheetNames) {
    const sheet = workbook.Sheets[sheetName];
    const csv = XLSX.utils.sheet_to_csv(sheet);
    textParts.push(`=== Sheet: ${sheetName} ===\n${csv}`);
  }

  return textParts.join('\n\n');
}

async function parseTxt(file: File): Promise<string> {
  return file.text();
}

export function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export function isFileSizeValid(file: File, maxMB: number = 20): boolean {
  return file.size <= maxMB * 1024 * 1024;
}
