// ═══════════════════════════════════════════════════════════════════════
// Auth helpers — sign out clears local cart state
// ═══════════════════════════════════════════════════════════════════════

function signOut() {
  cart = {};
  mfaVerified = false;
  sessionStorage.removeItem('pizza42_cart');
  sessionStorage.removeItem('pizza42_cart_user');
  sessionStorage.removeItem('pizza42_pending_payment');
  sessionStorage.removeItem('pizza42_session_active');
  renderCart();
  client.logout({ logoutParams: { returnTo: location.origin } });
}
