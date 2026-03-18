export const normalizeWorkDays = (
  days: readonly string[] | null | undefined,
  options?: {
    availableDays?: readonly string[] | null | undefined;
  }
): string[] => {
  const available = options?.availableDays;
  const availableSet = new Set(
    (available || [])
      .map((d) => (typeof d === 'string' ? d.trim() : ''))
      .filter((d) => /^\d{4}-\d{2}-\d{2}$/.test(d))
  );

  const unique = new Set<string>();
  for (const raw of days || []) {
    if (typeof raw !== 'string') continue;
    const trimmed = raw.trim();
    if (!trimmed) continue;

    const dateOnly = trimmed.includes('T') ? trimmed.split('T')[0] : trimmed;
    if (!/^\d{4}-\d{2}-\d{2}$/.test(dateOnly)) continue;

    if (availableSet.size > 0 && !availableSet.has(dateOnly)) continue;
    unique.add(dateOnly);
  }

  return Array.from(unique).sort((a, b) => a.localeCompare(b));
};
