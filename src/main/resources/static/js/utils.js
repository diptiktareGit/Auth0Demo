// ═══════════════════════════════════════════════════════════════════════
// DOM helpers
// ═══════════════════════════════════════════════════════════════════════
const $    = id => document.getElementById(id);
const show = id => $(id).hidden = false;
const hide = id => $(id).hidden = true;
const html = (id, h) => $(id).innerHTML = h;
