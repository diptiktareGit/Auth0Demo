/**
 * Task 10 — Auth0 Post-Login Action
 * Adds the user's order history (from app_metadata) to the ID token as a custom claim.
 *
 * How to deploy:
 *   1. Auth0 Dashboard → Actions → Library → Create Action
 *   2. Trigger: "Login / Post Login"
 *   3. Paste this code, click Deploy
 *   4. Auth0 Dashboard → Actions → Flows → Login → drag this action into the flow
 *
 * The frontend reads: idTokenClaims['https://pizza42.com/orders']
 */
exports.onExecutePostLogin = async (event, api) => {
  const orders = event.user.app_metadata?.orders ?? [];

  // Custom claim namespace must be a URL you control (Auth0 requirement)
  api.idToken.setCustomClaim('https://pizza42.com/orders', orders);

  // Optionally surface it in the access token too (useful for API-side decisions)
  api.accessToken.setCustomClaim('https://pizza42.com/orders', orders);
};
