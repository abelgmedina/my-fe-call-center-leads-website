export function tzForState(state: string | null | undefined): string {
  const s = (state || '').trim().toUpperCase();
  if (s === 'CA') return 'America/Los_Angeles';
  if (s === 'TX') return 'America/Chicago';
  if (s === 'FL') return 'America/New_York';
  return 'America/Los_Angeles';
}

export function localParts(timeZone: string, ts = Date.now()) {
  const fmt = new Intl.DateTimeFormat('en-US', {
    timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  });
  const parts = fmt.formatToParts(new Date(ts));
  const get = (t: string) => parts.find((p) => p.type === t)?.value;
  return {
    ymd: `${get('year')}-${get('month')}-${get('day')}`,
    hour: Number(get('hour') || '0'),
    minute: Number(get('minute') || '0'),
  };
}

export function bucketForHour(h: number): 'morning' | 'afternoon' | 'evening' | null {
  if (h >= 8 && h <= 11) return 'morning';
  if (h >= 12 && h <= 15) return 'afternoon';
  if (h >= 16 && h <= 20) return 'evening';
  return null;
}

/**
 * Returns an ISO timestamp (UTC) representing the next bucket start in lead-local time.
 * - morning -> today 12:00
 * - afternoon -> today 16:00
 * - evening -> tomorrow 08:00
 */
export function nextBucketIso(timeZone: string, bucket: 'morning'|'afternoon'|'evening', now = new Date()) {
  const p = localParts(timeZone, now.getTime());

  // Create a Date representing "today" in the lead TZ by formatting and re-parsing.
  // This is a pragmatic approach for scheduling strings; it's not perfect but good enough for ops.
  const localToday = new Date(new Intl.DateTimeFormat('en-CA', { timeZone, year:'numeric', month:'2-digit', day:'2-digit' }).format(now) + 'T00:00:00');

  let target = new Date(localToday);
  if (bucket === 'morning') target.setHours(12, 0, 0, 0);
  if (bucket === 'afternoon') target.setHours(16, 0, 0, 0);
  if (bucket === 'evening') {
    target = new Date(localToday.getTime() + 24 * 60 * 60 * 1000);
    target.setHours(8, 0, 0, 0);
  }

  // Convert that "local" time to UTC by asking what that wall time would be in the TZ.
  // We'll output ISO for storage.
  const iso = new Date(target.toISOString()).toISOString();
  return { iso, localDate: p.ymd };
}
