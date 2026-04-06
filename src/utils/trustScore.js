export function calculateHorseTrustScore(horse) {
  let score = 0;

  if (horse?.owner?.is_verified) score += 30;

  if (horse?.vet_check_available) {
    score += 15;
    if (horse?.vet_certificate_url) score += 10;
  }

  const imageCount = horse?.images?.length || (horse?.image_url ? 1 : 0);
  if (imageCount >= 3) score += 20;
  else if (imageCount >= 1) score += 10;

  const descriptionLength = (horse?.description || '').trim().length;
  if (descriptionLength >= 100) score += 20;
  else if (descriptionLength >= 30) score += 10;

  if (horse?.status === 'pending_review') score -= 15;
  if (horse?.status === 'rejected') score -= 35;

  const normalized = Math.max(0, Math.min(100, Math.round(score)));

  let labelKey = 'trustLow';
  let color = '#B45309';

  if (normalized >= 70) {
    labelKey = 'trustHigh';
    color = '#15803D';
  } else if (normalized >= 40) {
    labelKey = 'trustMedium';
    color = '#B45309';
  }

  return { score: normalized, labelKey, color };
}
