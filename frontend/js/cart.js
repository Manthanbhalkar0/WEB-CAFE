/* ============================================================
   Cafe Point — Cart (stored in localStorage, cleared after order)
   Cart item shape: { id, name, price, image, quantity, note }
   ============================================================ */

function getCart() {
  try { return JSON.parse(localStorage.getItem('cp_cart')) || []; } catch (e) { return []; }
}
function saveCart(cart) {
  localStorage.setItem('cp_cart', JSON.stringify(cart));
  updateCartBadge();
}
function clearCart() {
  localStorage.removeItem('cp_cart');
  updateCartBadge();
}
function cartCount() {
  return getCart().reduce((sum, i) => sum + i.quantity, 0);
}
function cartTotal() {
  return getCart().reduce((sum, i) => sum + i.price * i.quantity, 0);
}
function addToCart(item) {
  const cart = getCart();
  const existing = cart.find(i => i.id === item.id);
  if (existing) {
    existing.quantity += 1;
  } else {
    cart.push({ ...item, quantity: 1, note: '' });
  }
  saveCart(cart);
  toast(`${item.name} added to cart`, 'success');
}
function changeQuantity(id, delta) {
  const cart = getCart();
  const item = cart.find(i => i.id === id);
  if (!item) return;
  item.quantity += delta;
  const updated = item.quantity > 0 ? cart : cart.filter(i => i.id !== id);
  saveCart(updated);
  if (typeof renderCartPage === 'function') renderCartPage();
}
function removeFromCart(id) {
  saveCart(getCart().filter(i => i.id !== id));
  if (typeof renderCartPage === 'function') renderCartPage();
}
function setItemNote(id, note) {
  const cart = getCart();
  const item = cart.find(i => i.id === id);
  if (item) { item.note = note; saveCart(cart); }
}
function updateCartBadge() {
  document.querySelectorAll('.cart-badge').forEach(b => {
    const count = cartCount();
    b.textContent = count;
    b.style.display = count > 0 ? 'flex' : 'none';
  });
}
document.addEventListener('DOMContentLoaded', updateCartBadge);
