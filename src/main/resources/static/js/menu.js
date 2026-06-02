// ═══════════════════════════════════════════════════════════════════════
// Menu rendering
// ═══════════════════════════════════════════════════════════════════════

function renderMenu() {
  html('pizza-grid', MENU.filter(p => !p.loyalty).map(p => `
    <div class="pizza-card">
      <img class="pizza-card-photo" src="${p.img}" alt="${p.name}" loading="lazy"/>
      <div class="pizza-card-body">
        <div class="pizza-card-header-row">
          <h3>${p.name}</h3>
          <span class="pizza-price">$${p.price.toFixed(2)}</span>
        </div>
        <p class="desc">${p.desc}</p>
        <div class="toppings">
          ${TOPPINGS.map(t => `
            <label class="topping-label">
              <input type="checkbox" class="topping-cb" value="${t}"/> ${t}
            </label>`).join('')}
        </div>
        <div class="card-actions">
          <div class="card-qty">
            <button onclick="adjustQty(${p.id},-1)">−</button>
            <input type="number" id="qty-${p.id}" value="1" min="1" max="10"/>
            <button onclick="adjustQty(${p.id},+1)">+</button>
          </div>
          <button class="btn-add-cart" onclick="addToCart(${p.id})">Add to Cart</button>
        </div>
      </div>
    </div>
  `).join(''));
}

function adjustQty(id, delta) {
  const input = $(`qty-${id}`);
  input.value = Math.min(10, Math.max(1, +input.value + delta));
}
