// ═══════════════════════════════════════════════════════════════════════
// Progressive Profiling modal — collect preferences on 2nd login
// ═══════════════════════════════════════════════════════════════════════

function openProfilingModal() {
  const meta = idTokenClaims?.['https://pizza42.com/user_metadata'] || {};
  if (meta.fav_pizza) $('prof-fav-pizza').value = meta.fav_pizza;
  if (meta.birthday)  $('prof-birthday').value  = meta.birthday;
  if (meta.marketing_consent !== undefined)
    $('prof-marketing').checked = meta.marketing_consent;
  html('prof-feedback', '');
  $('profiling-modal').hidden = false;
}

function closeProfilingModal() {
  $('profiling-modal').hidden = true;
}

async function saveProfilingData() {
  const favPizza  = $('prof-fav-pizza').value;
  const birthday  = $('prof-birthday').value;
  const marketing = $('prof-marketing').checked;

  if (!favPizza) {
    html('prof-feedback', '<div class="alert alert-error" style="margin-top:0.5rem;">❌ Please select your favourite pizza style.</div>');
    return;
  }

  try {
    const token = await client.getTokenSilently({
      authorizationParams: { audience: AUTH0_AUDIENCE, scope: 'place:order' }
    });
    const res = await fetch('/api/user/metadata', {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        address:           idTokenClaims?.['https://pizza42.com/user_metadata']?.saved_address   || {},
        cardLast4:         idTokenClaims?.['https://pizza42.com/user_metadata']?.saved_card_last4 || '',
        fav_pizza:         favPizza,
        birthday:          birthday,
        marketing_consent: marketing
      })
    });
    if (!res.ok) throw new Error('Save failed');

    html('prof-feedback', '<div class="alert alert-success" style="margin-top:0.5rem;">✅ Preferences saved to your Auth0 profile!</div>');

    // Update local ID token cache so renderDashboard shows preferences immediately
    if (!idTokenClaims['https://pizza42.com/user_metadata']) {
      idTokenClaims['https://pizza42.com/user_metadata'] = {};
    }
    idTokenClaims['https://pizza42.com/user_metadata'].fav_pizza         = favPizza;
    idTokenClaims['https://pizza42.com/user_metadata'].birthday          = birthday;
    idTokenClaims['https://pizza42.com/user_metadata'].marketing_consent = marketing;

    setTimeout(() => { closeProfilingModal(); renderDashboard(); }, 1500);
  } catch (e) {
    html('prof-feedback', '<div class="alert alert-error" style="margin-top:0.5rem;">❌ Could not save. Try again.</div>');
  }
}
