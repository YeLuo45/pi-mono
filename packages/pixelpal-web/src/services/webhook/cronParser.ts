/**
 * cronParser — lightweight 5-field cron expression parser
 * Supports: minute hour day month weekday
 * Ranges: * 1-5 1,3,5 step (e.g. 1-5/2) wildcard (*)
 * Returns next N execution timestamps as Unix ms.
 */

export interface CronFields {
  minute: number[];
  hour: number[];
  day: number[];
  month: number[];
  weekday: number[];
}

function parseField(raw: string, min: number, max: number): number[] {
  const result: Set<number> = new Set();
  const parts = raw.split(',');
  for (const part of parts) {
    const stepMatch = part.match(/^(.+)\/(\d+)$/);
    let range: string = part;
    let step = 1;
    if (stepMatch) {
      range = stepMatch[1];
      step = parseInt(stepMatch[2], 10);
    }

    if (range === '*') {
      for (let i = min; i <= max; i += step) result.add(i);
    } else {
      const rangeMatch = range.match(/^(\d+)-(\d+)$/);
      if (rangeMatch) {
        const from = parseInt(rangeMatch[1], 10);
        const to = parseInt(rangeMatch[2], 10);
        for (let i = from; i <= to; i += step) result.add(i);
      } else {
        const val = parseInt(range, 10);
        if (!isNaN(val) && val >= min && val <= max) result.add(val);
      }
    }
  }
  return Array.from(result).sort((a, b) => a - b);
}

export function parseCronFields(expr: string): CronFields {
  const fields = expr.trim().split(/\s+/);
  if (fields.length !== 5) throw new Error(`Invalid cron expression: expected 5 fields, got ${fields.length}`);
  const [minRaw, hourRaw, dayRaw, monthRaw, weekdayRaw] = fields;
  return {
    minute: parseField(minRaw, 0, 59),
    hour: parseField(hourRaw, 0, 23),
    day: parseField(dayRaw, 1, 31),
    month: parseField(monthRaw, 1, 12),
    weekday: parseField(weekdayRaw, 0, 6), // 0=Sun
  };
}

function matchesDay(fields: CronFields, d: Date): boolean {
  const dayOk = fields.day.includes(d.getDate());
  const weekdayOk = fields.weekday.includes(d.getDay());
  // If both day-of-month and day-of-week are restricted, either must match (cron standard)
  const domRestricted = fields.day.length < 31;
  const dowRestricted = fields.weekday.length < 7;
  if (domRestricted && dowRestricted) return dayOk || weekdayOk;
  if (domRestricted) return dayOk;
  if (dowRestricted) return weekdayOk;
  return true;
}

function matchesMonth(fields: CronFields, d: Date): boolean {
  return fields.month.includes(d.getMonth() + 1);
}

export function getNextCronTimes(expr: string, fromMs: number, count = 1): number[] {
  const fields = parseCronFields(expr);
  const results: number[] = [];
  const start = new Date(fromMs);
  // Clamp to next minute boundary
  start.setSeconds(0, 0);
  start.setMinutes(start.getMinutes() + 1);

  const maxIterations = 366 * 24 * 60; // safety cap
  let iterations = 0;

  while (results.length < count && iterations < maxIterations) {
    iterations++;
    if (matchesMonth(fields, start) && matchesDay(fields, start)) {
      const h = start.getHours();
      const m = start.getMinutes();
      if (fields.hour.includes(h) && fields.minute.includes(m)) {
        results.push(start.getTime());
        if (results.length >= count) break;
      }
    }
    start.setMinutes(start.getMinutes() + 1);
  }

  return results;
}

export function getNextCronTime(expr: string, fromMs: number): number | null {
  const times = getNextCronTimes(expr, fromMs, 1);
  return times.length > 0 ? times[0] : null;
}
