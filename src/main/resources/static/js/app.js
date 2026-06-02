// ═══════════════════════════════════════════════════════════════════════
// Bootstrap — initialise Auth0 client, handle redirect callback,
//             set up UI state, and navigate to the correct page.
// ═══════════════════════════════════════════════════════════════════════

(async () => {
  try {
    // Feature 1: Init Auth0 client (Universal Login)
    window.client = await auth0.createAuth0Client({
      domain:   AUTH0_DOMAIN,
      clientId: AUTH0_CLIENT_ID,
      authorizationParams: {
        redirect_uri: location.origin,
        audience: AUTH0_AUDIENCE,
        scope: 'openid profile email place:order offline_access'
      },
      cacheLocation: 'localstorage',
      useRefreshTokens: true
    });

    // Handle ?error= query params (e.g. user declined consent)
    if (location.search.includes('error=')) {
      const p     = new URLSearchParams(location.search);
      const error = p.get('error');
      history.replaceState({}, '', location.pathname);

      if (error === 'access_denied') {
        // Clear the Auth0 session so consent screen won't auto-appear next time.
        await client.logout({ logoutParams: { returnTo: location.origin + '?declined=1' } });
        return;
      }
    }

    // Show a friendly message if they declined consent on a previous visit
    if (location.search.includes('declined=1')) {
      history.replaceState({}, '', location.pathname);
      show('auth-error-banner');
      html('auth-error-banner', `
        <div class="auth-error-box">
          <div>
            <strong>You declined the authorisation.</strong><br>
            <span>No problem — browse the menu freely. Sign in whenever you're ready to order.</span>
          </div>
          <div style="display:flex; gap:0.5rem; flex-shrink:0;">
            <button class="btn-signup" style="color:#7c5000; border-color:#f59e0b;" onclick="client.loginWithRedirect({authorizationParams:{screen_hint:'signup'}})">Sign Up</button>
            <button class="btn-login"  onclick="client.loginWithRedirect()">Sign In</button>
          </div>
        </div>`);
    }

    // Handle redirect callback after login / MFA
    let postLoginPage  = null;
    let stepUpJustDone = false;
    if (location.search.includes('code=') && location.search.includes('state=')) {
      try {
        const result   = await client.handleRedirectCallback();
        postLoginPage  = result.appState?.targetUrl  || null;
        stepUpJustDone = result.appState?.stepUpDone || false;
        if (stepUpJustDone) mfaVerified = true;
      } catch (callbackErr) {
        // Invalid state errors happen after email-verification redirects —
        // Auth0 sends the user back with its own state that doesn't match the SDK.
        // Safe to ignore: just clean the URL and continue loading normally.
        console.warn('Redirect callback error (likely email verification redirect):', callbackErr.message);
      }
      history.replaceState({}, '', location.pathname);
    }

    if (await client.isAuthenticated()) {
      currentUser   = await client.getUser();
      idTokenClaims = await client.getIdTokenClaims();

      // Clear cart if a different user has logged in
      const _storedCartUser = sessionStorage.getItem('pizza42_cart_user');
      if (_storedCartUser && _storedCartUser !== currentUser.sub) {
        cart = {};
        sessionStorage.removeItem('pizza42_cart');
        renderCart();
      }
      sessionStorage.setItem('pizza42_cart_user', currentUser.sub);

      // Count browser sessions per user — drives progressive profiling reliably,
      // independent of token login_count quirks (e.g. signup auto-login). The
      // sessionStorage flag resets each browser session, so this increments
      // exactly once per session (not on in-session reloads).
      if (!sessionStorage.getItem('pizza42_session_active')) {
        sessionStorage.setItem('pizza42_session_active', '1');
        const _sk = `pizza42_session_count_${currentUser.sub}`;
        localStorage.setItem(_sk, String((parseInt(localStorage.getItem(_sk)) || 0) + 1));
      }

      // user_metadata (saved address / card / prefs), order history, segment
      // and loyalty status all arrive as ID token claims set by the Post-Login
      // Action (auth0-actions/post-login-pizza42.js) — no extra fetch needed.
      // Mid-session writes update idTokenClaims locally; next login re-syncs.

      hide('btn-signin');
      hide('btn-signup');
      show('btn-signout');
      show('nav-dashboard');
      hide('hero-signin-btn');
      hide('login-banner');
    } else {
      show('btn-signup');
      show('btn-signin');
      show('hero-signin-btn');
      show('login-banner');
    }

    renderMenu();
    renderCart();
    renderWelcomeBack().catch(console.error);

    // After login redirect → go to intended page (e.g. payment)
    if (postLoginPage && ['cart', 'payment', 'dashboard'].includes(postLoginPage)) {
      showPage(postLoginPage, false);
      // If returning from Step-Up MFA, show verified notice on payment page
      if (stepUpJustDone && postLoginPage === 'payment') {
        html('pay-feedback',
          `<div class="alert alert-success">🛡️ <strong>MFA verified!</strong> Your identity is confirmed — please review your order and click Confirm &amp; Pay.</div>`);
      }
    } else {
      // Navigate to the page in the URL hash (e.g. localhost:8080/#cart)
      const initPage = location.hash.replace('#', '') || 'menu';
      if (['cart', 'payment', 'dashboard'].includes(initPage)) showPage(initPage, false);
    }

  } catch (err) {
    document.body.innerHTML = `
      <div style="max-width:500px; margin:4rem auto; padding:2rem; font-family:sans-serif; text-align:center;">
        <div style="font-size:3rem; margin-bottom:1rem">⚠️</div>
        <h2 style="color:#c0392b">Initialisation error</h2>
        <p style="color:#777; margin-top:0.5rem">${err.message}</p>
      </div>`;
  }
})();
