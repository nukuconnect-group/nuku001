/**
 * Returns the display name for a profile.
 * Producers and trainers (entreprises) show their business_name (entered at signup).
 * Buyers, learners, drivers and other individuals show their full_name.
 */
export function getProfileDisplayName(
  profile?: {
    user_type?: string | null;
    business_name?: string | null;
    full_name?: string | null;
  } | null,
  fallback = "Mon compte",
): string {
  if (!profile) return fallback;
  const isCompany =
    profile.user_type === "producer" || profile.user_type === "trainer";
  if (isCompany) {
    return (
      (profile.business_name && profile.business_name.trim()) ||
      (profile.full_name && profile.full_name.trim()) ||
      fallback
    );
  }
  return (
    (profile.full_name && profile.full_name.trim()) ||
    (profile.business_name && profile.business_name.trim()) ||
    fallback
  );
}
