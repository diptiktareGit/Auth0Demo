// ═══════════════════════════════════════════════════════════════════════
// Orders — proceed to checkout and submit order to the backend API
// ═══════════════════════════════════════════════════════════════════════

// Feature 2: Proceed to Checkout (email check → payment page)
async function placeOrder() {
  if (!currentUser) {
    await client.loginWithRedirect({ appState: { targetUrl: 'payment' } });
    return;
  }

  // Feature 2: Email Verification Guard
  if (!currentUser.email_verified) {
    hide('email-warn');
    html('order-feedback', '<div class="alert alert-warn">⏳ Checking your verification status…</div>');
    try {
      await client.getTokenSilently({ cacheMode: 'off' }); // re-issue tokens from Auth0
      currentUser   = await client.getUser();              // re-read updated profile
      idTokenClaims = await client.getIdTokenClaims();
    } catch (e) {
      console.warn('Could not refresh verification status:', e);
    }
  }

  if (!currentUser.email_verified) {
    show('email-warn');
    html('order-feedback', '');
    return;
  }
  hide('email-warn');
  html('order-feedback', '');
  showPage('payment');
}

// Feature 3: Submit Order — calls API with place:order scoped token
async function submitOrder() {
  // Basic validation
  const name   = $('pay-name').value.trim();
  const street = $('pay-street').value.trim();
  const city   = $('pay-city').value.trim();
  const card   = $('pay-card').value.replace(/\s/g, '');
  const expiry = $('pay-expiry').value.trim();
  const cvv    = $('pay-cvv').value.trim();

  if (!name || !street || !city) {
    html('pay-feedback', '<div class="alert alert-error">❌ Please fill in your delivery address.</div>');
    return;
  }
  if (card.length < 16 || expiry.length < 5 || cvv.length < 3) {
    html('pay-feedback', '<div class="alert alert-error">❌ Please enter valid payment details.</div>');
    return;
  }

  // Feature 4: Step-Up MFA for high-value orders
  const preTotal = Object.keys(cart).map(Number)
    .reduce((s, id) => s + MENU.find(m => m.id === id).price * getQty(id), 0);

  if (preTotal >= STEPUP_THRESHOLD && !hasMfa()) {
    // Save the form so it can be restored after the MFA redirect
    sessionStorage.setItem('pizza42_pending_payment', JSON.stringify({
      name:   $('pay-name').value,
      street: $('pay-street').value,
      city:   $('pay-city').value,
      zip:    $('pay-zip').value,
      card:   $('pay-card').value,   // hidden input always has the real value
      expiry: $('pay-expiry').value,
      cvv:    $('pay-cvv').value
    }));
    html('pay-feedback',
      `<div class="alert alert-error">🛡️ This order requires MFA verification. Redirecting to Auth0…</div>`);
    setTimeout(async () => {
      await client.loginWithRedirect({
        appState: { targetUrl: 'payment', stepUpDone: true },
        authorizationParams: {
          acr_values: 'http://schemas.openid.net/pep/claims/acr/values/mfa'
        }
      });
    }, 1200);
    return;
  }

  const btn = $('pay-submit-btn');
  btn.disabled = true; btn.textContent = '⏳ Processing…';
  html('pay-feedback', '');

  try {
    // Feature 3: Access token with place:order scope
    const token = await client.getTokenSilently({
      authorizationParams: { audience: AUTH0_AUDIENCE, scope: 'place:order' }
    });

    const items = Object.keys(cart).map(Number).map(id => {
      const p = MENU.find(m => m.id === id);
      return { id: p.id, name: p.name, qty: getQty(id), toppings: getToppings(id), price: p.price };
    });
    const total    = items.reduce((s, i) => s + i.price * i.qty, 0);
    const delivery = { name, street, city, zip: $('pay-zip').value.trim() };

    const res = await fetch('/api/orders', {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ items, total, delivery })
    });
    if (!res.ok) {
      let msg = `Order failed (${res.status})`;
      try { const e = await res.json(); if (e.message) msg = e.message; } catch (_) {}
      throw new Error(msg);
    }

    const order = await res.json();

    // Keep the local orders claim cache fresh so the claim-driven welcome view
    // reflects this order this session. (The Action re-syncs it on next login.)
    const _cachedOrders = idTokenClaims['https://pizza42.com/orders'] || [];
    _cachedOrders.push(order);
    idTokenClaims['https://pizza42.com/orders'] = _cachedOrders;

    // Save address + card to Auth0 user_metadata (only if checkbox ticked)
    const saveAddress = $('pay-save-address')?.checked !== false;
    if (saveAddress) {
      const zip   = $('pay-zip').value.trim();
      const last4 = card.slice(-4);
      try {
        await fetch('/api/user/metadata', {
          method: 'POST',
          headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
          body: JSON.stringify({ address: { street, city, zip }, cardLast4: last4 })
        });
        // Update local cache so the next payment page visit pre-fills immediately
        if (!idTokenClaims['https://pizza42.com/user_metadata']) {
          idTokenClaims['https://pizza42.com/user_metadata'] = {};
        }
        idTokenClaims['https://pizza42.com/user_metadata'].saved_address    = { street, city, zip };
        idTokenClaims['https://pizza42.com/user_metadata'].saved_card_last4 = last4;
      } catch (e) {
        console.warn('Could not save user metadata:', e);
      }
    }

    cart = {};
    sessionStorage.removeItem('pizza42_cart');
    renderCart();

    // Show success and redirect to dashboard
    html('pay-feedback', `
      <div class="alert alert-success">
        ✅ <strong>Order #${order.id} confirmed!</strong> Total: $${Number(order.total).toFixed(2)}<br>
        <small>Delivering to ${delivery.street}, ${delivery.city}. Check <strong>My Profile</strong> for order history.</small>
      </div>`);
    setTimeout(() => showPage('dashboard'), 2500);

  } catch (err) {
    html('pay-feedback', `<div class="alert alert-error">❌ ${err.message}</div>`);
    btn.disabled = false; btn.innerHTML = '🔒 Confirm &amp; Pay';
  }
}
