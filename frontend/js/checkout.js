document.addEventListener('DOMContentLoaded', () => {
  initAuthArea();
  updateCartBadge();

  const cart = getCart();
  if (!cart.length) {
    document.getElementById('checkoutBody').innerHTML = `
      <div class="empty-state" style="grid-column:1/-1;">
        <div class="big-icon">🛒</div><p>Your cart is empty — add something tasty first!</p>
        <a href="menu.html" class="btn btn-primary mt-20">Browse Menu</a>
      </div>`;
    return;
  }

  if (!isLoggedIn()) {
    document.getElementById('notLoggedInNotice').style.display = 'block';
  } else {
    autofillCheckoutDetails();
  }

  renderCheckoutSummary();

  document.querySelectorAll('.radio-card').forEach(card => {
    card.addEventListener('click', () => {
      document.querySelectorAll('.radio-card').forEach(c => c.classList.remove('selected'));
      card.classList.add('selected');
      card.querySelector('input').checked = true;
    });
  });

  document.getElementById('checkoutForm').addEventListener('submit', placeOrder);
});

function fillCheckoutFields({ name, phone, address }) {
  const nameEl = document.getElementById('customerName');
  const phoneEl = document.getElementById('customerPhone');
  const addressEl = document.getElementById('customerAddress');
  if (nameEl && name) nameEl.value = name;
  if (phoneEl && phone) phoneEl.value = phone;
  if (addressEl && address) addressEl.value = address;
}

async function autofillCheckoutDetails() {
  const user = getUser() || {};
  fillCheckoutFields({
    name: user.name,
    phone: user.phone,
    address: user.address
  });

  try {
    const profile = await api('/auth/me', { auth: true });
    fillCheckoutFields({
      name: profile.name,
      phone: profile.phone,
      address: profile.address
    });
    setSession(getToken(), {
      id: profile.id,
      name: profile.name,
      email: profile.email,
      phone: profile.phone,
      address: profile.address,
      role: profile.role
    });
  } catch (err) {
    // keep whatever we filled from the local session
  }
}

function renderCheckoutSummary() {
  const cart = getCart();
  const total = cartTotal();
  const summary = document.getElementById('checkoutSummary');
  summary.innerHTML = `
    <h3 style="margin-bottom:18px;">Order Summary</h3>
    ${cart.map(i => `
      <div class="summary-row"><span>${i.name} × ${i.quantity}</span><span>${formatMoney(i.price * i.quantity)}</span></div>
    `).join('')}
    <div class="summary-row total"><span>Total</span><span>${formatMoney(total)}</span></div>
    <p class="text-muted" style="font-size:13px;margin-top:14px;">No online payment required right now. Place your order and pay at the cafe / on delivery.</p>
  `;
}

async function placeOrder(e) {
  e.preventDefault();
  if (requireLoginRedirect('Please log in or register first so we can contact you about your order.')) return;

  const alertBox = document.getElementById('checkoutAlert');
  const btn = document.getElementById('placeOrderBtn');
  alertBox.className = 'form-alert';

  const customer_name = document.getElementById('customerName').value.trim();
  const phone = document.getElementById('customerPhone').value.trim();
  const address = document.getElementById('customerAddress').value.trim();
  const special_instructions = document.getElementById('specialInstructions').value.trim();
  const payment_method = document.querySelector('input[name="payMethod"]:checked')?.value || 'COD';

  if (!customer_name) {
    alertBox.className = 'form-alert error';
    alertBox.textContent = 'Please enter your full name.';
    return;
  }
  if (!isValidPhoneClient(phone)) {
    alertBox.className = 'form-alert error';
    alertBox.textContent = AUTH_PHONE_HINT;
    return;
  }

  const cart = getCart();
  if (!cart.length) {
    alertBox.className = 'form-alert error';
    alertBox.textContent = 'Your cart is empty. Add items from the menu first.';
    return;
  }

  const items = cart.map(i => ({ menu_item_id: i.id, quantity: i.quantity, note: i.note || '' }));

  btn.disabled = true;
  btn.textContent = 'Placing order...';
  try {
    // Places the order immediately — no money transfer / payment gateway step
    const data = await api('/orders', {
      method: 'POST',
      auth: true,
      body: { customer_name, phone, address, items, payment_method, special_instructions }
    });

    // Clear cart so ordered items are gone
    clearCart();
    updateCartBadge();

    window.location.href = `order-confirmation.html?orderId=${data.orderId}`;
  } catch (err) {
    alertBox.className = 'form-alert error';
    alertBox.textContent = err.message;
    btn.disabled = false;
    btn.textContent = 'Place Order';
  }
}
