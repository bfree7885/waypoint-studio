/**
 * Ambient entitlement policy (Phase 2).
 *
 * Grant paid Ambient (local history + change detection) only when Stripe
 * subscription status is `active`.
 *
 * Denied (documented):
 *   past_due, unpaid, incomplete, incomplete_expired, canceled, paused, none
 *
 * cancel_at_period_end with status still `active` remains entitled until Stripe
 * actually ends the period (status leaves active / subscription.deleted).
 *
 * No trials in Phase 2. `trialing` is denied if it appears.
 */

export const ENTITLED_STATUSES = Object.freeze(["active"]);

export function isEntitledStatus(status) {
  return ENTITLED_STATUSES.indexOf(String(status || "").toLowerCase()) >= 0;
}

export function publicAmbientState(subscription) {
  const status = String((subscription && subscription.status) || "none").toLowerCase();
  const entitled = isEntitledStatus(status);
  let surface = "none";
  if (entitled) surface = "active";
  else if (status && status !== "none" && status !== "incomplete") surface = "inactive";
  return {
    entitled: entitled,
    status: status || "none",
    surface: surface,
    periodEnd: (subscription && subscription.current_period_end) || null,
    cancelAtPeriodEnd: !!(subscription && subscription.cancel_at_period_end)
  };
}

export function sessionView(account, subscription) {
  if (!account) {
    return {
      auth: "anonymous",
      email: null,
      accountId: null,
      ambient: { entitled: false, status: "none", surface: "none", periodEnd: null }
    };
  }
  const ambient = publicAmbientState(subscription);
  return {
    auth: "authenticated",
    email: account.email,
    accountId: account.id,
    ambient: ambient
  };
}
