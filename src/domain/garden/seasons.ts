const trailingYearPattern = /\b(19|20)\d{2}\b(?!.*\b(19|20)\d{2}\b)/;
const trailingCopyPattern = /\s+Copy$/i;

export const deriveNextSeasonTag = (
  seasonTag: string | null,
  fallbackYear = new Date().getFullYear() + 1,
) => {
  if (!seasonTag) {
    return String(fallbackYear);
  }

  const trimmed = seasonTag.trim();
  const yearMatch = trimmed.match(trailingYearPattern);

  if (!yearMatch) {
    return String(fallbackYear);
  }

  const currentYear = Number.parseInt(yearMatch[0], 10);
  return trimmed.replace(trailingYearPattern, String(currentYear + 1));
};

export const formatSeasonDuplicateName = (
  planName: string,
  seasonTag: string,
) => {
  const normalizedName = planName.trim().replace(trailingCopyPattern, '');

  if (trailingYearPattern.test(normalizedName)) {
    return normalizedName.replace(trailingYearPattern, seasonTag);
  }

  return `${normalizedName} ${seasonTag}`.trim();
};
