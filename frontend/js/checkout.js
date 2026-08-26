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

  // Registration requirement per SRS: user should register before placing an order
  if (!isLoggedIn()) {
    document.getElementById('notLoggedInNotice').style.display = 'block';
  } else {
    const user = getUser();
    document.getElementById('customerName').value = user.name || '';
  }

  renderCheckoutSummary();
  renderUpiQr();

  document.querySelectorAll('.radio-card').forEach(card => {
    card.addEventListener('click', () => {
      document.querySelectorAll('.radio-card').forEach(c => c.classList.remove('selected'));
      card.classList.add('selected');
      card.querySelector('input').checked = true;
      document.getElementById('upiBox').style.display = card.dataset.method === 'UPI' ? 'block' : 'none';
    });
  });

  document.getElementById('checkoutForm').addEventListener('submit', placeOrder);
});

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
  `;
}

// Builds a real upi:// deep link for the current cart total and renders it as a scannable QR code
function renderUpiQr() {
  const total = cartTotal().toFixed(2);
  const upiId = '8459662016@upi';
  const upiLink = `upi://pay?pa=${upiId}&pn=CafePoint&am=${total}&cu=INR&tn=CafePointOrder`;

  const qrImg = document.getElementById('upiQrImg');
  const payLink = document.getElementById('upiPayLink');
  const amountLabel = document.getElementById('upiAmountLabel');
  if (qrImg) qrImg.src = `https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=${encodeURIComponent(upiLink)}`;
  if (payLink) payLink.href = upiLink;
  if (amountLabel) amountLabel.textContent = formatMoney(total);
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
  const payment_method = document.querySelector('input[name="payMethod"]:checked').value;

  const cart = getCart();
  const items = cart.map(i => ({ menu_item_id: i.id, quantity: i.quantity, note: i.note || '' }));

  btn.disabled = true; btn.textContent = 'Placing order...';
  try {
    const data = await api('/orders', {
      method: 'POST',
      auth: true,
      body: { customer_name, phone, address, items, payment_method, special_instructions }
    });

    clearCart(); // empty the cart so it's fresh next time

    // clear the sensitive input fields on this page too
    document.getElementById('checkoutForm').reset();

    window.location.href = `order-confirmation.html?orderId=${data.orderId}`;
  } catch (err) {
    alertBox.className = 'form-alert error';
    alertBox.textContent = err.message;
    btn.disabled = false; btn.textContent = 'Place Order';
  }
}
