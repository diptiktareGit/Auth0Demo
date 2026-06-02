// ═══════════════════════════════════════════════════════════════════════
// Cart — add, remove, quantity control, render
// ═══════════════════════════════════════════════════════════════════════

function addToCart(id) {
  const qtyInput = $(`qty-${id}`);
  const qty = Math.max(1, parseInt(qtyInput?.value) || 1);
  const card = qtyInput?.closest('.pizza-card');
  const toppings = [...(card?.querySelectorAll('.topping-cb:checked') || [])].map(cb => cb.value);

  if (cart[id]) {
    cart[id].qty += qty;
    toppings.forEach(t => { if (!cart[id].toppings.includes(t)) cart[id].toppings.push(t); });
  } else {
    cart[id] = { qty, toppings };
  }

  if (qtyInput) qtyInput.value = 1;
  card?.querySelectorAll('.topping-cb:checked').forEach(cb => cb.checked = false);
  renderCart();
  const btn = card?.querySelector('.btn-add-cart');
  if (btn) { btn.textContent = '✓ Added!'; setTimeout(() => btn.textContent = 'Add to Cart', 1200); }
}

function changeQty(id, delta) {
  if (!cart[id]) return;
  cart[id].qty = (cart[id].qty || 0) + delta;
  if (cart[id].qty <= 0) delete cart[id];
  renderCart();
}

function getQty(id)      { return cart[id]?.qty      || 0; }
function getToppings(id) { return cart[id]?.toppings || []; }

function renderCart() {
  sessionStorage.setItem('pizza42_cart', JSON.stringify(cart));
  const ids = Object.keys(cart).map(Number);
  const total = ids.reduce((s, id) => s + MENU.find(m => m.id === id).price * getQty(id), 0);
  $('cart-count').textContent = ids.reduce((s, id) => s + getQty(id), 0);

  if (ids.length === 0) {
    html('cart-items-wrap', `
      <div class="cart-empty">
        <div class="ce-icon">🛒</div>
        <p>Your cart is empty — go pick some pizzas!</p>
      </div>`);
    hide('order-summary-box');
    return;
  }

  html('cart-items-wrap', ids.map(id => {
    const p = MENU.find(m => m.id === id);
    const qty = getQty(id);
    const toppings = getToppings(id);
    const isFree = p.loyalty || cart[id]?.free;
    const sub = isFree ? '0.00' : (p.price * qty).toFixed(2);
    const imgHtml = isFree
      ? `<div style="width:52px;height:52px;border-radius:8px;background:#fef3c7;display:flex;align-items:center;justify-content:center;font-size:1.8rem;flex-shrink:0;">🧄</div>`
      : `<img src="${p.img}" style="width:52px;height:52px;border-radius:8px;object-fit:cover;flex-shrink:0;" alt="${p.name}"/>`;
    return `
      <div class="cart-item">
        ${imgHtml}
        <div class="ci-details">
          <span class="ci-name">${p.name}${isFree ? '<span class="free-badge">FREE</span>' : ''}</span>
          ${toppings.length > 0
            ? `<span class="ci-toppings">+ ${toppings.join(' · ')}</span>`
            : isFree ? '<span class="ci-toppings" style="color:#16a34a">🎁 Loyalty reward</span>'
                     : '<span class="ci-toppings" style="color:#bbb">No extra toppings</span>'}
        </div>
        <div class="qty-ctrl">
          ${isFree
            ? `<button class="qty-btn" onclick="changeQty(${id},-1)" style="opacity:0.4" title="Remove">×</button>
               <span style="font-weight:600; min-width:20px; text-align:center">${qty}</span>
               <span style="width:28px"></span>`
            : `<button class="qty-btn" onclick="changeQty(${id},-1)">−</button>
               <span style="font-weight:600; min-width:20px; text-align:center">${qty}</span>
               <button class="qty-btn" onclick="changeQty(${id},+1)">+</button>`}
        </div>
        <span class="ci-price" style="${isFree ? 'color:#16a34a;' : ''}">$${sub}</span>
      </div>`;
  }).join(''));

  $('cart-total').textContent   = total.toFixed(2);
  $('subtotal-val').textContent = '$' + total.toFixed(2);
  show('order-summary-box');
}
