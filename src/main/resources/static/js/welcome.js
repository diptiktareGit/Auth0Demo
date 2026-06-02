// ═══════════════════════════════════════════════════════════════════════
// Welcome Back — greet returning users and show past orders + loyalty.
//
// 100% claim-driven: the Post-Login Action (auth0-actions/post-login-pizza42.js)
// computes login_count, segment, order history, and loyalty eligibility at
// login and delivers them as ID token claims. This view just reads them.
// ═══════════════════════════════════════════════════════════════════════

const PIZZA42_NS = 'https://pizza42.com/';

function renderPastOrderCards(orders) {
  return [...orders].reverse().slice(0, 3).map(o => {
    const itemsText = (o.items || []).map(i => `${i.name} ×${i.qty}`).join(', ');
    const date = new Date(o.placedAt).toLocaleDateString('en-US', { month:'short', day:'numeric', year:'numeric' });
    const itemsJson = encodeURIComponent(JSON.stringify(o.items || []));
    return `
      <div class="past-order-card">
        <div class="poc-header">
          <span class="poc-id">Order #${o.id}</span>
          <span class="poc-date">${date}</span>
        </div>
        <div class="poc-items">${itemsText}</div>
        <div class="poc-footer">
          <span class="poc-total">$${Number(o.total).toFixed(2)}</span>
          <button class="btn-reorder" onclick="reorder(decodeAndReorder('${itemsJson}'))">🔄 Reorder</button>
        </div>
      </div>`;
  }).join('');
}

async function renderWelcomeBack() {
  if (!currentUser) { hide('welcome-back'); return; }

  // All values come straight from Auth0 ID token claims set by the Action.
  const c           = idTokenClaims || {};
  const loginCount  = c[PIZZA42_NS + 'login_count'] || 1;
  const segment     = c[PIZZA42_NS + 'segment']     || '';
  const orders      = c[PIZZA42_NS + 'orders']      || [];
  const eligible    = c[PIZZA42_NS + 'free_garlic_bread'] === true;
  const untilReward = c[PIZZA42_NS + 'orders_until_reward'];
  const firstName   = (currentUser.given_name || currentUser.name || currentUser.email || '').split(' ')[0];

  // Greeting
  html('welcome-greeting-text', loginCount <= 1
    ? `Welcome, ${firstName}! 🍕`
    : `Welcome back, ${firstName}! 👋`);

  // Segment badge (only for returning users)
  if (segment && loginCount > 1) { html('welcome-segment', segment); show('welcome-segment'); }
  else                           { hide('welcome-segment'); }

  // ── Loyalty reward unlocked (computed by the Auth0 Action) ───────────
  if (eligible) {
    const alreadyInCart = !!cart[99];
    const loyaltyHtml = `
      <div class="loyalty-banner">
        <div class="loyalty-banner-left">
          <div class="loyalty-icon">🎁</div>
          <div class="loyalty-text">
            <h4>Loyalty Reward — Free Garlic Bread!</h4>
            <p>Auth0 tracks your order history and automatically unlocks this reward after 3 orders. Your identity, your perks.</p>
          </div>
        </div>
        <button class="btn-claim" id="btn-claim-gb" onclick="claimGarlicBread()" ${alreadyInCart ? 'disabled' : ''}>
          ${alreadyInCart ? '✓ Added to Cart' : '🧄 Claim Free Garlic Bread'}
        </button>
      </div>`;
    const cards = orders.length
      ? renderPastOrderCards(orders)
      : `<p style="color:#888;font-size:0.88rem;margin-top:0.5rem;">No past orders yet — pick something from the menu below.</p>`;
    html('past-orders-row', loyaltyHtml + cards);

  // ── No orders yet ────────────────────────────────────────────────────
  } else if (orders.length === 0) {
    html('past-orders-row', loginCount <= 1
      ? `<p style="color:#888;font-size:0.88rem;">Browse the menu below and place your first order!</p>`
      : `<p style="color:#888;font-size:0.88rem;margin-bottom:0.25rem;">No past orders yet — pick something from the menu below.</p>
         <p style="color:#aaa;font-size:0.78rem;">💡 Place 3 orders to unlock a free Garlic Bread loyalty reward.</p>`);

  // ── Has orders, reward not yet unlocked → show progress ──────────────
  } else {
    const remaining = (typeof untilReward === 'number') ? untilReward : 3;
    const progressHtml = remaining > 0
      ? `<p style="color:#aaa;font-size:0.78rem;margin-bottom:0.75rem;">💡 ${remaining} more order${remaining > 1 ? 's' : ''} to unlock free Garlic Bread 🧄</p>`
      : '';
    html('past-orders-row', progressHtml + renderPastOrderCards(orders));
  }

  show('welcome-back');
}

function decodeAndReorder(encoded) {
  try { return JSON.parse(decodeURIComponent(encoded)); } catch { return []; }
}

function reorder(items) {
  if (!items || !items.length) return;
  items.forEach(item => {
    const menuItem = MENU.find(m => m.id === item.id);
    if (!menuItem || menuItem.loyalty) return; // skip loyalty-only items
    if (cart[item.id]) {
      cart[item.id].qty += (item.qty || 1);
    } else {
      cart[item.id] = { qty: item.qty || 1, toppings: item.toppings || [] };
    }
  });
  renderCart();
  showPage('cart');
}
