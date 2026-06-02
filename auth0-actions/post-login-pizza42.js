/**
 * Pizza 42 — Consolidated Post-Login Action
 * ─────────────────────────────────────────────────────────────────────────
 * This single Action runs on every login and pushes ALL personalisation +
 * business logic into the ID token as custom claims. The frontend then just
 * reads claims — no client-side loyalty math, no extra metadata round-trips.
 *
 * Claims set (namespace must be a URL you control — Auth0 requirement):
 *   https://pizza42.com/orders               full order history (array)
 *   https://pizza42.com/user_metadata        saved address / card / prefs (object)
 *   https://pizza42.com/login_count          number of logins (this one included)
 *   https://pizza42.com/first_login          ISO timestamp of first ever login
 *   https://pizza42.com/segment              'new' | 'regular' | 'loyal'
 *   https://pizza42.com/free_garlic_bread    boolean — loyalty reward unlocked?
 *   https://pizza42.com/orders_until_reward  number of orders left until reward
 *
 * How to deploy:
 *   1. Auth0 Dashboard → Actions → Library → Create Action
 *   2. Trigger: "Login / Post Login"
 *   3. Paste this code, click Deploy
 *   4. Auth0 Dashboard → Actions → Flows → Login → drag this action into the flow
 *   5. (Remove any older single-purpose action so claims aren't set twice.)
 */
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

  // Surface a couple of claims in the access token too, so the API can make
  // server-side decisions (e.g. segment-based pricing) without a DB lookup.
  api.accessToken.setCustomClaim(NS + 'segment', segment);
  api.accessToken.setCustomClaim(NS + 'orders',  orders);
};
