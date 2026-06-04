
exports.onExecutePostLogin = async (event, api) => {
  const NS = 'https://pizza42.com/';

  // ── Source data (Auth0 is the system of record) ──────────────────────
  const userMeta = event.user.user_metadata || {};
  const appMeta  = event.user.app_metadata  || {};
  const orders   = Array.isArray(userMeta.orders) ? userMeta.orders : [];
  const orderCount = orders.length;

  // ── Login tracking (persisted to app_metadata so it survives sessions) ─
  const loginCount = (appMeta.login_count || 0) + 1;
  const firstLogin = appMeta.first_login || new Date().toISOString();
  api.user.setAppMetadata('login_count', loginCount);
  if (!appMeta.first_login) api.user.setAppMetadata('first_login', firstLogin);

  // ── Customer segment (aligned with the 3-order loyalty threshold) ─────
  const segment = orderCount >= 3 ? 'loyal'
                : orderCount >= 1 ? 'regular'
                : 'new';

  // ── Loyalty reward: free garlic bread after 3 orders since last claim ──
  // baseCount is the order count captured the last time the reward was claimed.
  const baseCount = userMeta.garlic_bread_base_count || 0;

  // Retroactively detect a past redemption by finding the most recent order
  // that contained garlic bread (handles users who claimed before baseCount
  // tracking existed). lastGBCount = order count up to & including that order.
  let lastGBCount = 0;
  for (let i = orders.length - 1; i >= 0; i--) {
    const items = orders[i].items || [];
    if (items.some(it => it.id === 99 || it.name === 'Garlic Bread')) {
      lastGBCount = i + 1;
      break;
    }
  }

  const effectiveBase     = Math.max(baseCount, lastGBCount);
  const ordersSinceReward = orderCount - effectiveBase;
  const freeGarlicBread   = ordersSinceReward >= 3;
  const ordersUntilReward = freeGarlicBread ? 0 : Math.max(0, 3 - ordersSinceReward);

  // ── Expose everything as ID token claims ──────────────────────────────
  api.idToken.setCustomClaim(NS + 'orders',              orders);
  api.idToken.setCustomClaim(NS + 'user_metadata',       userMeta);
  api.idToken.setCustomClaim(NS + 'login_count',         loginCount);
  api.idToken.setCustomClaim(NS + 'first_login',         firstLogin);
  api.idToken.setCustomClaim(NS + 'segment',             segment);
  api.idToken.setCustomClaim(NS + 'free_garlic_bread',   freeGarlicBread);
  api.idToken.setCustomClaim(NS + 'orders_until_reward', ordersUntilReward);

  // Keep the access token LEAN — it rides on EVERY API request. Expose only
  // small, decision-driving signals; the full order history is intentionally NOT
  // included here (the API reads it from GET /api/orders / its own store when
  // needed). The ID token still carries the detailed list for the SPA to render.
  api.accessToken.setCustomClaim(NS + 'segment',     segment);
  api.accessToken.setCustomClaim(NS + 'order_count', orderCount);
};
