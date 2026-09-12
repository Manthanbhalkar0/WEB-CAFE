document.addEventListener('DOMContentLoaded', () => {
  const user = getUser();
  const role = String(user?.role || '').toUpperCase();
  if (!isLoggedIn() || !user || role !== 'ADMIN') {
    toast('Admin login required.', 'error');
    setTimeout(() => (window.location.href = 'login.html'), 800);
    return;
  }
  document.getElementById('adminName').textContent = user.name;

  document.querySelectorAll('.tab-btn[data-tab]').forEach(btn => {
    btn.addEventListener('click', () => switchTab(btn.dataset.tab));
  });
  document.getElementById('adminLogoutBtn').addEventListener('click', () => {
    clearSession();
    window.location.href = 'index.html';
  });

  document.getElementById('orderStatusFilter').addEventListener('change', loadOrders);
  document.getElementById('addProductBtn').addEventListener('click', () => openProductModal());
  document.getElementById('closeProductModal').addEventListener('click', closeProductModal);
  document.getElementById('productForm').addEventListener('submit', saveProduct);
  document.querySelectorAll('[data-range]').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('[data-range]').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      loadReport(btn.dataset.range);
    });
  });

  loadDashboard();
});

const PANEL_TITLES = {
  dashboard: 'Dashboard', orders: 'Orders', menu: 'Menu Management',
  bookings: 'Table Bookings', customers: 'Customers', reports: 'Sales Reports', feedback: 'Customer Feedback'
};

function switchTab(tab) {
  document.querySelectorAll('.tab-btn[data-tab]').forEach(b => b.classList.toggle('active', b.dataset.tab === tab));
  document.querySelectorAll('.admin-panel').forEach(p => p.classList.remove('active'));
  document.getElementById(`panel-${tab}`).classList.add('active');
  document.getElementById('panelTitle').textContent = PANEL_TITLES[tab];

  if (tab === 'dashboard') loadDashboard();
  if (tab === 'orders') loadOrders();
  if (tab === 'menu') loadMenuAdmin();
  if (tab === 'bookings') loadBookingsAdmin();
  if (tab === 'customers') loadCustomers();
  if (tab === 'reports') loadReport('weekly');
  if (tab === 'feedback') loadFeedbackAdmin();
}

/* ==================== DASHBOARD ==================== */
async function loadDashboard() {
  const el = document.getElementById('statCards');
  try {
    const s = await api('/admin/dashboard', { auth: true });
    el.innerHTML = `
      <div class="stat-card"><div class="label">Today's Orders</div><div class="value">${s.todayOrders}</div></div>
      <div class="stat-card"><div class="label">Today's Revenue</div><div class="value">₹${Number(s.todayRevenue).toFixed(0)}</div></div>
      <div class="stat-card"><div class="label">Pending Orders</div><div class="value">${s.pendingOrders}</div></div>
      <div class="stat-card"><div class="label">Total Orders</div><div class="value">${s.totalOrders}</div></div>
      <div class="stat-card"><div class="label">Total Customers</div><div class="value">${s.totalCustomers}</div></div>
      <div class="stat-card"><div class="label">Pending Bookings</div><div class="value">${s.pendingBookings}</div></div>
      <div class="stat-card"><div class="label">Menu Items</div><div class="value">${s.totalMenuItems}</div></div>
    `;
  } catch (err) {
    el.innerHTML = `<p class="text-muted">${err.message}</p>`;
  }
}

/* ==================== ORDERS ==================== */
async function loadOrders() {
  const tbody = document.querySelector('#ordersTable tbody');
  tbody.innerHTML = `<tr><td colspan="8">Loading...</td></tr>`;
  try {
    const status = document.getElementById('orderStatusFilter').value;
    const orders = await api(`/orders${status ? `?status=${status}` : ''}`, { auth: true });
    if (!orders.length) { tbody.innerHTML = `<tr><td colspan="8">No orders found.</td></tr>`; return; }

    tbody.innerHTML = orders.map(o => `
      <tr>
        <td>#${o.id}</td>
        <td>${o.customer_name}</td>
        <td>${o.phone}</td>
        <td>${o.items.map(i => `${i.item_name}×${i.quantity}`).join(', ')}</td>
        <td>₹${Number(o.total).toFixed(2)}</td>
        <td>
          <select onchange="updatePayment(${o.id}, this.value)">
            <option value="PENDING" ${o.payment_status === 'PENDING' ? 'selected' : ''}>Pending</option>
            <option value="PAID" ${o.payment_status === 'PAID' ? 'selected' : ''}>Paid</option>
            <option value="FAILED" ${o.payment_status === 'FAILED' ? 'selected' : ''}>Failed</option>
          </select>
          <div style="font-size:11px;color:#999;">${o.payment_method}</div>
        </td>
        <td>
          <select onchange="updateOrderStatus(${o.id}, this.value)">
            ${['RECEIVED','PREPARING','READY','COMPLETED','CANCELLED'].map(s => `<option value="${s}" ${o.status === s ? 'selected' : ''}>${s}</option>`).join('')}
          </select>
        </td>
        <td><a class="icon-btn" href="/api/orders/${o.id}/bill" target="_blank" title="Download Bill">🧾</a></td>
      </tr>
    `).join('');
  } catch (err) {
    tbody.innerHTML = `<tr><td colspan="8">${err.message}</td></tr>`;
  }
}

async function updateOrderStatus(id, status) {
  try {
    await api(`/orders/${id}/status`, { method: 'PUT', auth: true, body: { status } });
    toast('Order status updated', 'success');
    loadDashboard();
  } catch (err) { toast(err.message, 'error'); }
}
async function updatePayment(id, payment_status) {
  try {
    await api(`/orders/${id}/payment`, { method: 'PUT', auth: true, body: { payment_status } });
    toast('Payment status updated', 'success');
  } catch (err) { toast(err.message, 'error'); }
}

/* ==================== MENU MANAGEMENT ==================== */
async function loadMenuAdmin() {
  const tbody = document.querySelector('#menuTable tbody');
  tbody.innerHTML = `<tr><td colspan="6">Loading...</td></tr>`;
  try {
    const items = await api('/menu/admin/all', { auth: true });
    if (!items.length) { tbody.innerHTML = `<tr><td colspan="6">No products yet.</td></tr>`; return; }
    tbody.innerHTML = items.map(i => `
      <tr>
        <td class="flex gap-10"><span class="emoji-badge" style="width:34px;height:34px;"><img src="${i.image || 'https://images.unsplash.com/photo-1495474472287-4d71bcdd2085?w=100&q=80'}" alt=""></span> ${i.name}</td>
        <td>${i.category}</td>
        <td><input type="number" value="${i.price}" style="width:90px;padding:6px 8px;" onchange="quickPriceChange(${i.id}, this.value)"></td>
        <td>${i.is_veg ? '🟢' : '🔴'}</td>
        <td>${i.is_available ? '✅' : '⛔'}</td>
        <td>
          <button class="icon-btn" title="Edit" onclick='openProductModal(${JSON.stringify(i).replace(/'/g, "&apos;")})'>✏️</button>
          <button class="icon-btn" title="Delete" onclick="deleteProduct(${i.id}, '${i.name.replace(/'/g, "\\'")}')">🗑️</button>
        </td>
      </tr>
    `).join('');
  } catch (err) {
    tbody.innerHTML = `<tr><td colspan="6">${err.message}</td></tr>`;
  }
}

async function quickPriceChange(id, price) {
  try {
    await api(`/menu/${id}/price`, { method: 'PATCH', auth: true, body: { price } });
    toast('Price updated', 'success');
  } catch (err) { toast(err.message, 'error'); }
}

function openProductModal(item) {
  document.getElementById('productModalTitle').textContent = item ? 'Edit Product' : 'Add Product';
  document.getElementById('pId').value = item ? item.id : '';
  document.getElementById('pName').value = item ? item.name : '';
  document.getElementById('pCategory').value = item ? item.category : '';
  document.getElementById('pDescription').value = item ? item.description : '';
  document.getElementById('pPrice').value = item ? item.price : '';
  document.getElementById('pImage').value = item ? item.image : '';
  document.getElementById('pVeg').checked = item ? !!item.is_veg : true;
  document.getElementById('pAvailable').checked = item ? !!item.is_available : true;
  document.getElementById('productModal').classList.add('open');
}
function closeProductModal() { document.getElementById('productModal').classList.remove('open'); }

async function saveProduct(e) {
  e.preventDefault();
  const id = document.getElementById('pId').value;
  const body = {
    name: document.getElementById('pName').value.trim(),
    category: document.getElementById('pCategory').value.trim(),
    description: document.getElementById('pDescription').value.trim(),
    price: document.getElementById('pPrice').value,
    image: document.getElementById('pImage').value.trim() || '☕',
    is_veg: document.getElementById('pVeg').checked,
    is_available: document.getElementById('pAvailable').checked
  };
  try {
    if (id) {
      await api(`/menu/${id}`, { method: 'PUT', auth: true, body });
      toast('Product updated', 'success');
    } else {
      await api('/menu', { method: 'POST', auth: true, body });
      toast('Product added', 'success');
    }
    closeProductModal();
    loadMenuAdmin();
    loadDashboard();
  } catch (err) { toast(err.message, 'error'); }
}

async function deleteProduct(id, name) {
  if (!confirm(`Remove "${name}" from the menu?`)) return;
  try {
    await api(`/menu/${id}`, { method: 'DELETE', auth: true });
    toast('Product removed', 'success');
    loadMenuAdmin();
  } catch (err) { toast(err.message, 'error'); }
}

/* ==================== BOOKINGS ==================== */
async function loadBookingsAdmin() {
  const tbody = document.querySelector('#bookingsTable tbody');
  tbody.innerHTML = `<tr><td colspan="8">Loading...</td></tr>`;
  try {
    const bookings = await api('/bookings', { auth: true });
    if (!bookings.length) { tbody.innerHTML = `<tr><td colspan="8">No bookings yet.</td></tr>`; return; }
    tbody.innerHTML = bookings.map(b => `
      <tr>
        <td>#${b.id}</td><td>${b.name}</td><td>${b.phone}</td><td>${b.guests}</td><td>${b.date}</td><td>${b.time}</td>
        <td><span class="badge badge-${b.status.toLowerCase()}">${b.status}</span></td>
        <td>
          <select onchange="updateBookingStatus(${b.id}, this.value)">
            ${['PENDING','CONFIRMED','CANCELLED'].map(s => `<option value="${s}" ${b.status === s ? 'selected' : ''}>${s}</option>`).join('')}
          </select>
        </td>
      </tr>
    `).join('');
  } catch (err) {
    tbody.innerHTML = `<tr><td colspan="8">${err.message}</td></tr>`;
  }
}
async function updateBookingStatus(id, status) {
  try {
    await api(`/bookings/${id}/status`, { method: 'PUT', auth: true, body: { status } });
    toast('Booking updated', 'success');
    loadDashboard();
  } catch (err) { toast(err.message, 'error'); }
}

/* ==================== CUSTOMERS ==================== */
async function loadCustomers() {
  const tbody = document.querySelector('#customersTable tbody');
  tbody.innerHTML = `<tr><td colspan="5">Loading...</td></tr>`;
  try {
    const customers = await api('/admin/customers', { auth: true });
    if (!customers.length) { tbody.innerHTML = `<tr><td colspan="5">No customers yet.</td></tr>`; return; }
    tbody.innerHTML = customers.map(c => `
      <tr><td>${c.name}</td><td>${c.email}</td><td><a href="tel:${c.phone}">${c.phone}</a></td><td>${c.address || '—'}</td><td>${new Date(c.created_at).toLocaleDateString()}</td></tr>
    `).join('');
  } catch (err) {
    tbody.innerHTML = `<tr><td colspan="5">${err.message}</td></tr>`;
  }
}

document.getElementById('createAdminForm')?.addEventListener('submit', async (e) => {
  e.preventDefault();
  const alertBox = document.getElementById('createAdminAlert');
  const btn = document.getElementById('createAdminBtn');
  alertBox.className = 'form-alert';

  const name = document.getElementById('adminNewName').value.trim();
  const email = document.getElementById('adminNewEmail').value.trim();
  const phone = document.getElementById('adminNewPhone').value.trim();
  const password = document.getElementById('adminNewPassword').value;

  const clientError = validateRegisterForm({ name, email, phone, password, confirmPassword: password });
  if (clientError) {
    alertBox.className = 'form-alert error';
    alertBox.textContent = clientError;
    return;
  }

  btn.disabled = true;
  try {
    const data = await api('/admin/admins', {
      method: 'POST',
      auth: true,
      body: { name, email, phone, password }
    });
    alertBox.className = 'form-alert success';
    alertBox.textContent = data.message || 'Admin created.';
    document.getElementById('createAdminForm').reset();
    toast('Admin account created', 'success');
  } catch (err) {
    alertBox.className = 'form-alert error';
    alertBox.textContent = err.message;
  } finally {
    btn.disabled = false;
  }
});

/* ==================== REPORTS ==================== */
async function loadReport(range) {
  const body = document.getElementById('reportBody');
  body.innerHTML = `<div class="loader"></div>`;
  try {
    const r = await api(`/admin/reports?range=${range}`, { auth: true });
    const maxRevenue = Math.max(...r.daily.map(d => Number(d.revenue)), 1);

    body.innerHTML = `
      <div class="grid grid-3" style="margin-bottom:26px;">
        <div class="stat-card"><div class="label">Orders (${r.period.start} → ${r.period.end})</div><div class="value">${r.summary.orderCount}</div></div>
        <div class="stat-card"><div class="label">Revenue</div><div class="value">₹${Number(r.summary.revenue).toFixed(0)}</div></div>
        <div class="stat-card"><div class="label">Avg Order Value</div><div class="value">₹${Number(r.summary.avgOrderValue).toFixed(0)}</div></div>
      </div>

      <div class="card mt-20">
        <h4 style="margin-bottom:16px;">Daily Revenue</h4>
        <div style="display:flex;align-items:flex-end;gap:10px;height:160px;">
          ${r.daily.map(d => `
            <div style="flex:1;text-align:center;">
              <div style="background:var(--gold-500);border-radius:6px 6px 0 0;height:${Math.max((d.revenue / maxRevenue) * 130, 4)}px;" title="₹${d.revenue}"></div>
              <div style="font-size:10px;margin-top:6px;color:var(--muted);">${d.day.slice(5)}</div>
            </div>
          `).join('') || '<p class="text-muted">No sales in this period.</p>'}
        </div>
      </div>

      <div class="grid grid-2 mt-20">
        <div class="card">
          <h4 style="margin-bottom:14px;">Top Selling Items</h4>
          ${r.topItems.map(t => `<div class="flex between mt-10"><span>${t.item_name}</span><span>${t.totalQty} sold</span></div>`).join('') || '<p class="text-muted">No data yet.</p>'}
        </div>
        <div class="card">
          <h4 style="margin-bottom:14px;">Payment Method Breakdown</h4>
          ${r.paymentBreakdown.map(p => `<div class="flex between mt-10"><span>${p.payment_method}</span><span>${p.count} orders • ₹${Number(p.revenue).toFixed(0)}</span></div>`).join('') || '<p class="text-muted">No data yet.</p>'}
        </div>
      </div>
    `;
  } catch (err) {
    body.innerHTML = `<p class="text-muted">${err.message}</p>`;
  }
}

/* ==================== FEEDBACK ==================== */
async function loadFeedbackAdmin() {
  const grid = document.getElementById('feedbackAdminGrid');
  grid.innerHTML = `<div class="loader"></div>`;
  try {
    const feedback = await api('/feedback/all', { auth: true });
    if (!feedback.length) { grid.innerHTML = `<p class="text-muted">No feedback yet.</p>`; return; }
    grid.innerHTML = feedback.map(f => `
      <div class="card">
        <div style="color:var(--gold-500);">${'★'.repeat(f.rating)}${'☆'.repeat(5 - f.rating)}</div>
        <p class="mt-10">"${f.message}"</p>
        <p class="text-muted mt-10" style="font-size:13px;">— ${f.name} ${f.email ? `(${f.email})` : ''} • ${new Date(f.created_at).toLocaleDateString()}</p>
      </div>
    `).join('');
  } catch (err) {
    grid.innerHTML = `<p class="text-muted">${err.message}</p>`;
  }
}
