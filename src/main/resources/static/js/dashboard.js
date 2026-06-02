// ═══════════════════════════════════════════════════════════════════════
// Dashboard — profile card, marketing insights, order history
// ═══════════════════════════════════════════════════════════════════════

async function renderDashboard() {
  if (!currentUser) return;

  const verBadge = currentUser.email_verified
    ? '<span class="badge badge-verified">✓ Verified</span>'
    : '<span class="badge badge-unverified">⚠ Not Verified</span>';

  const avatar = currentUser.picture
    ? `<img src="${currentUser.picture}" class="profile-avatar" alt="avatar"/>`
    : `<div class="avatar-placeholder">${(currentUser.name || currentUser.email)[0].toUpperCase()}</div>`;

  html('profile-card', `
    ${avatar}
    <div class="profile-name">${currentUser.name || 'Pizza Fan'}</div>
    <div class="profile-email">${currentUser.email}</div>
    ${verBadge}
  `);

  // Marketing Insights from Auth0 app_metadata claims
  const loginCount = idTokenClaims?.['https://pizza42.com/login_count'] || 1;
  const meta       = idTokenClaims?.['https://pizza42.com/user_metadata'] || {};

  const prefLine = meta.fav_pizza
    ? `<div class="pref-row">🍕 Favourite: <span>${meta.fav_pizza}</span>${meta.birthday ? `&nbsp;·&nbsp; 🎂 Birthday: <span>${meta.birthday}</span>` : ''}&nbsp;<a href="#" onclick="openProfilingModal();return false;" style="font-size:0.78rem;color:#b45309;margin-left:0.5rem;">✏️ Update</a></div>`
    : `<div class="pref-row" style="opacity:0.7">No preferences saved yet — <a href="#" onclick="openProfilingModal();return false;" style="color:#b45309;">add them now</a></div>`;

  html('marketing-insights', prefLine);

  // Progressive profiling: prompt on 2nd login if no preferences saved yet
  if (loginCount === 2 && !meta.fav_pizza) {
    setTimeout(() => openProfilingModal(), 800);
  }

  // Fetch live orders from API
  html('order-history', `<div style="color:var(--muted); font-size:0.85rem">Loading orders…</div>`);
  let apiOrders = [];
  try {
    const token = await client.getTokenSilently({
      authorizationParams: { audience: AUTH0_AUDIENCE, scope: 'place:order' }
    });
    const res = await fetch('/api/orders', {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    if (res.ok) apiOrders = await res.json();
  } catch (e) { /* silent — fall back to ID token */ }

  // Feature 4: Also check ID token custom claim (Post-Login Action)
  const tokenOrders = idTokenClaims?.['https://pizza42.com/orders'] || [];

  // Merge: API orders are live; token orders are from last login
  const orders = apiOrders.length > 0 ? apiOrders : tokenOrders;

  if (orders.length === 0) {
    html('order-history', `
      <div style="color:var(--muted); padding: 1.5rem 0; text-align:center">
        <div style="font-size:2.5rem; margin-bottom:0.5rem">📭</div>
        No orders yet — place one from the cart!
      </div>`);
  } else {
    html('order-history', [...orders].reverse().map(o => `
      <div class="order-card">
        <div class="order-card-header">
          <span class="order-id">Order #${o.id}</span>
          <span class="order-date">${new Date(o.placedAt).toLocaleString()}</span>
        </div>
        <div class="order-items-text">
          ${(o.items || []).map(i => `${i.name} ×${i.qty}`).join(' &nbsp;·&nbsp; ')}
        </div>
        <div class="order-total-row">Total: $${Number(o.total).toFixed(2)}</div>
      </div>`).join(''));
  }
}
