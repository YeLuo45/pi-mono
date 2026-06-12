/**
 * csvExport.ts — V45 Data Export Enhancement
 * Provides CSV export for messages and collaboration history.
 */

import type { Message } from '../../types';
import type { CollabHistoryEntry } from '../../store';

// UTF-8 BOM for Excel compatibility
const BOM = '\uFEFF';

/**
 * Escape a value for CSV (handle quotes and commas)
 */
function escapeCSV(value: string): string {
  if (value.includes(',') || value.includes('"') || value.includes('\n')) {
    return `"${value.replace(/"/g, '""')}"`;
  }
  return value;
}

/**
 * Convert messages to CSV string
 */
export function messagesToCSV(messages: Message[]): string {
  const header = '时间,角色,内容';
  const rows = messages.map((m) => {
    const time = new Date(m.timestamp).toLocaleString('zh-CN');
    const role = m.role;
    const content = escapeCSV(m.content);
    return `${time},${role},${content}`;
  });
  return BOM + [header, ...rows].join('\n');
}

/**
 * Convert collaboration history to CSV string
 */
export function collabHistoryToCSV(entries: CollabHistoryEntry[]): string {
  const header = '时间,状态,参与人数,摘要';
  const rows = entries.map((e) => {
    const time = new Date(e.timestamp).toLocaleString('zh-CN');
    const status = e.status;
    const participants = e.participants.join(';');
    const summary = escapeCSV((e as any).summary || e.conclusion || '');
    return `${time},${status},${participants},${summary}`;
  });
  return BOM + [header, ...rows].join('\n');
}

/**
 * Download CSV content as a file
 */
export function downloadCSV(content: string, filename: string): void {
  const blob = new Blob([content], { type: 'text/csv;charset=utf-8' });
  const url = URL.createObjectURL(blob);

  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = filename;
  anchor.style.display = 'none';
  document.body.appendChild(anchor);
  anchor.click();

  document.body.removeChild(anchor);
  URL.revokeObjectURL(url);
}
