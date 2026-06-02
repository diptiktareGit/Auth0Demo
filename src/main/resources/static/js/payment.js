// ═══════════════════════════════════════════════════════════════════════
// Payment page — render, card toggle, card input formatting
// ═══════════════════════════════════════════════════════════════════════

const STEPUP_THRESHOLD = 30; // orders over $30 require Step-Up MFA

// ── MFA check: was MFA used in the current Auth0 session? ───────────
function hasMfa() {
  // Primary: flag set after our own Step-Up MFA redirect completes
  if (mfaVerified) return true;
  // Fallback: check amr claim if Auth0 includes it
  const amr = idTokenClaims?.amr || [];
  return Array.isArray(amr) ? amr.includes('mfa') : amr === 'mfa';
}

// ── Render payment page with pre-filled Auth0 profile data ──────────
function renderPaymentPage() {
  const ids = Object.keys(cart).map(Number);
  const total = ids.reduce((s, id) => s + MENU.find(m => m.id === id).price * getQty(id), 0);

  // Order summary on left
  html('pay-items', ids.map(id => {
    const p = MENU.find(m => m.id === id);
    const toppings = getToppings(id);
    return `
      <div class="pay-summary-item">
        <div>
          <div>${p.name} ×${getQty(id)}</div>
          ${toppings.length ? `<div class="pay-item-detail">+ ${toppings.join(', ')}</div>` : ''}
        </div>
        <strong>$${(p.price * getQty(id)).toFixed(2)}</strong>
      </div>`;
  }).join(''));
  $('pay-total').textContent = total.toFixed(2);

  // Pre-fill name & email from Auth0 ID token
  if (currentUser) {
    $('pay-name').value  = currentUser.name  || '';
    $('pay-email').value = currentUser.email || '';
  }

  // Pre-fill address + card from saved user_metadata (Auth0 feature)
  const meta = idTokenClaims?.['https://pizza42.com/user_metadata'] || {};
  if (meta.saved_address) {
    if (meta.saved_address.street) $('pay-street').value = meta.saved_address.street;
    if (meta.saved_address.city)   $('pay-city').value   = meta.saved_address.city;
    if (meta.saved_address.zip)    $('pay-zip').value    = meta.saved_address.zip;
  }

  // Render card section — masked display + toggle if saved card exists
  if (meta.saved_card_last4) {
    html('pay-card-section', `
      <div class="card-choice-wrap">
        <div class="card-choice-opts">
          <label class="card-choice-opt selected" id="opt-saved" onclick="selectCardOption('saved')">
            <input type="radio" name="card-choice" value="saved" checked/>
            💳 Use saved card
          </label>
          <label class="card-choice-opt" id="opt-new" onclick="selectCardOption('new')">
            <input type="radio" name="card-choice" value="new"/>
            ➕ Enter new card
          </label>
        </div>
        <div id="card-saved-display">
          <div class="masked-card-display">
            💳 •••• •••• •••• ${meta.saved_card_last4}
            <span style="font-size:0.75rem;font-weight:400;letter-spacing:0;color:#888;margin-left:auto;">Auth0 saved card</span>
          </div>
        </div>
        <div id="card-new-fields" hidden>
          <div class="pay-field">
            <label>Card Number</label>
            <input type="text" id="pay-card-input" placeholder="4242 4242 4242 4242" maxlength="19"
                   autocomplete="off" oninput="formatCard(this);$('pay-card').value=this.value;"/>
          </div>
          <div class="pay-field-row">
            <div class="pay-field">
              <label>Expiry</label>
              <input type="text" id="pay-expiry-input" placeholder="MM / YY" maxlength="7"
                     autocomplete="off" oninput="formatExpiry(this);$('pay-expiry').value=this.value;"/>
            </div>
            <div class="pay-field" style="max-width:120px;">
              <label>CVV</label>
              <input type="text" id="pay-cvv-input" placeholder="•••" maxlength="4"
                     autocomplete="off" oninput="this.value=this.value.replace(/\\D/g,'');$('pay-cvv').value=this.value;"/>
            </div>
          </div>
        </div>
      </div>`);
    // Pre-load hidden inputs with saved card values (used by submitOrder)
    $('pay-card').value   = `4242424242420000${meta.saved_card_last4}`.slice(-16);
    $('pay-expiry').value = '12/99';
    $('pay-cvv').value    = '999';
  } else {
    // No saved card — show standard input fields
    html('pay-card-section', `
      <div class="pay-field">
        <label>Card Number</label>
        <input type="text" id="pay-card-input" placeholder="4242 4242 4242 4242" maxlength="19"
               autocomplete="off" oninput="formatCard(this);$('pay-card').value=this.value;"/>
      </div>
      <div class="pay-field-row">
        <div class="pay-field">
          <label>Expiry</label>
          <input type="text" id="pay-expiry-input" placeholder="MM / YY" maxlength="7"
                 autocomplete="off" oninput="formatExpiry(this);$('pay-expiry').value=this.value;"/>
        </div>
        <div class="pay-field" style="max-width:120px;">
          <label>CVV</label>
          <input type="text" id="pay-cvv-input" placeholder="•••" maxlength="4"
                 autocomplete="off" oninput="this.value=this.value.replace(/\\D/g,'');$('pay-cvv').value=this.value;"/>
        </div>
      </div>`);
    $('pay-card').value = ''; $('pay-expiry').value = ''; $('pay-cvv').value = '';
  }

  // Restore form state saved before MFA redirect (overrides user_metadata pre-fill)
  const _pending = JSON.parse(sessionStorage.getItem('pizza42_pending_payment') || 'null');
  if (_pending) {
    if (_pending.name)   $('pay-name').value   = _pending.name;
    if (_pending.street) $('pay-street').value = _pending.street;
    if (_pending.city)   $('pay-city').value   = _pending.city;
    if (_pending.zip)    $('pay-zip').value    = _pending.zip;
    if (_pending.card)   { $('pay-card').value = _pending.card; const ci = $('pay-card-input'); if (ci) ci.value = _pending.card; }
    if (_pending.expiry) { $('pay-expiry').value = _pending.expiry; const ei = $('pay-expiry-input'); if (ei) ei.value = _pending.expiry; }
    if (_pending.cvv)    { $('pay-cvv').value = _pending.cvv; const vi = $('pay-cvv-input'); if (vi) vi.value = _pending.cvv; }
    sessionStorage.removeItem('pizza42_pending_payment');
  }

  // Step-Up MFA notice — warn if total exceeds threshold and MFA not yet done
  if (total >= STEPUP_THRESHOLD && !hasMfa()) {
    html('pay-stepup-notice',
      `<div class="stepup-notice">
        🛡️ <div><strong>Step-Up MFA required</strong> — this order is $${total.toFixed(2)}.
        Orders over $${STEPUP_THRESHOLD} require an extra identity check via Auth0 MFA before payment is processed.</div>
      </div>`);
  } else if (total >= STEPUP_THRESHOLD && hasMfa()) {
    html('pay-stepup-notice',
      `<div class="stepup-notice verified">
        ✅ <strong>MFA verified</strong> — you're cleared for high-value checkout.
      </div>`);
  } else {
    html('pay-stepup-notice', '');
  }

  html('pay-feedback', '');
  const btn = $('pay-submit-btn');
  if (btn) { btn.disabled = false; btn.innerHTML = '🔒 Confirm &amp; Pay'; }
}

// Switch between saved card and new card entry
function selectCardOption(choice) {
  const savedDisplay = $('card-saved-display');
  const newFields    = $('card-new-fields');
  const optSaved     = $('opt-saved');
  const optNew       = $('opt-new');
  const meta         = idTokenClaims?.['https://pizza42.com/user_metadata'] || {};

  if (choice === 'saved') {
    savedDisplay.hidden = false;
    newFields.hidden    = true;
    optSaved?.classList.add('selected');
    optNew?.classList.remove('selected');
    // Restore saved card values to hidden inputs
    $('pay-card').value   = `4242424242420000${meta.saved_card_last4}`.slice(-16);
    $('pay-expiry').value = '12/99';
    $('pay-cvv').value    = '999';
  } else {
    savedDisplay.hidden = true;
    newFields.hidden    = false;
    optSaved?.classList.remove('selected');
    optNew?.classList.add('selected');
    // Clear hidden inputs — user must type new values
    $('pay-card').value = ''; $('pay-expiry').value = ''; $('pay-cvv').value = '';
    $('pay-card-input')?.focus();
  }
}

// Card number formatter — groups digits into blocks of 4
function formatCard(el) {
  let v = el.value.replace(/\D/g, '').substring(0, 16);
  el.value = v.match(/.{1,4}/g)?.join(' ') || v;
}

// Expiry formatter — inserts " / " after MM
function formatExpiry(el) {
  let v = el.value.replace(/\D/g, '').substring(0, 4);
  if (v.length >= 3) v = v.substring(0, 2) + ' / ' + v.substring(2);
  el.value = v;
}
