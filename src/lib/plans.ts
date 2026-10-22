export function canAddAssets(count: number, limit: number, adding = 1) {
  return count + adding <= limit;
}

export function usagePercent(count: number, limit: number) {
  if (limit <= 0) return 100;
  return Math.min(100, Math.round((count / limit) * 100));
}

export function limitMessage(count: number, limit: number, planName: string) {
  if (canAddAssets(count, limit)) return null;
  return `The ${planName} plan tracks up to ${limit} active assets. You are using ${count}. Archive a tool or upgrade to add more.`;
}
