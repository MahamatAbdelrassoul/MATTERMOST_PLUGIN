type UsageRecord = {
  charsUsed: number;
  resetDate: string;
};

const usageByKey = new Map<string, UsageRecord>();

function nextMonthReset(): string {
  const now = new Date();
  return new Date(now.getFullYear(), now.getMonth() + 1, 1).toISOString().slice(0, 10);
}

function getRecord(apiKey: string): UsageRecord {
  const existing = usageByKey.get(apiKey);
  if (existing) {
    const today = new Date().toISOString().slice(0, 10);
    if (today >= existing.resetDate) {
      const fresh = {charsUsed: 0, resetDate: nextMonthReset()};
      usageByKey.set(apiKey, fresh);
      return fresh;
    }
    return existing;
  }

  const record = {charsUsed: 0, resetDate: nextMonthReset()};
  usageByKey.set(apiKey, record);
  return record;
}

export function trackUsage(apiKey: string, charCount: number, limit: number): void {
  const record = getRecord(apiKey);
  record.charsUsed += charCount;
  if (record.charsUsed > limit) {
    throw new QuotaExceededError(limit, record);
  }
}

export function getUsage(apiKey: string, limit: number) {
  const record = getRecord(apiKey);
  return {
    chars_used: record.charsUsed,
    chars_limit: limit,
    chars_remaining: Math.max(0, limit - record.charsUsed),
    reset_date: record.resetDate,
  };
}

export class QuotaExceededError extends Error {
  constructor(
    public readonly limit: number,
    public readonly record: UsageRecord,
  ) {
    super('Monthly character quota exceeded');
    this.name = 'QuotaExceededError';
  }
}
