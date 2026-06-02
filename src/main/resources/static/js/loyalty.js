// ═══════════════════════════════════════════════════════════════════════
// Loyalty rewards — claim the free garlic bread the Auth0 Action unlocked.
//
// Eligibility is decided by the Post-Login Action (free_garlic_bread claim).
// Here we just add it to the cart and record the redemption point in Auth0
// so the next reward requires 3 NEW orders.
// ═══════════════════════════════════════════════════════════════════════

async function claimGarlicBread() {
  cart[99] = { qty: 1, toppings: [], free: true };
  renderCart();
  const btn = $('btn-claim-gb');
  if (btn) { btn.disabled = true; btn.textContent = '✓ Added to Cart'; }

  try {
    const token = await client.getTokenSilently({
      authorizationParams: { audience: AUTH0_AUDIENCE, scope: 'place:order' }
    });

    // Order count comes from the claim — no extra API round-trip needed.
    const currentOrderCount = (idTokenClaims?.['https://pizza42.com/orders'] || []).length;

    await fetch('/api/user/metadata', {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ garlic_bread_base_count: currentOrderCount })
    });

    // Update local claim cache so the banner hides immediately this session.
    // (On next login the Action recomputes these from Auth0.)
    if (!idTokenClaims['https://pizza42.com/user_metadata']) {
      idTokenClaims['https://pizza42.com/user_metadata'] = {};
    }
    idTokenClaims['https://pizza42.com/user_metadata'].garlic_bread_base_count = currentOrderCount;
    idTokenClaims['https://pizza42.com/free_garlic_bread']   = false;
    idTokenClaims['https://pizza42.com/orders_until_reward'] = 3;
  } catch (e) {
    console.warn('Could not save garlic bread redemption:', e);
  }

  showPage('cart');
}
