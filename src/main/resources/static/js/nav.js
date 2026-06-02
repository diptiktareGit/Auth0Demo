// ═══════════════════════════════════════════════════════════════════════
// Navigation — page switching and browser history support
// ═══════════════════════════════════════════════════════════════════════

function showPage(name, pushHistory = true) {
  ['menu', 'cart', 'payment', 'dashboard'].forEach(p => $(`page-${p}`).hidden = p !== name);
  ['nav-menu', 'cart-btn', 'nav-dashboard'].forEach(b => $(b)?.classList.remove('active'));

  if (name === 'menu')      { $('nav-menu').classList.add('active'); renderWelcomeBack().catch(console.error); }
  if (name === 'cart')      { $('cart-btn').classList.add('active'); }
  if (name === 'dashboard') { $('nav-dashboard').classList.add('active'); renderDashboard().catch(console.error); }
  if (name === 'payment')   { renderPaymentPage(); }

  if (pushHistory) location.hash = name === 'menu' ? '' : name;
}

// Handle browser back / forward
window.addEventListener('hashchange', () => {
  const page = location.hash.replace('#', '') || 'menu';
  if (['menu', 'cart', 'payment', 'dashboard'].includes(page)) showPage(page, false);
});
