let allMenuItems = [];
let activeCategory = '';

document.addEventListener('DOMContentLoaded', async () => {
  await loadCategories();
  await loadMenu();

  document.getElementById('searchInput').addEventListener('input', debounce(renderMenu, 250));
  document.getElementById('vegOnly').addEventListener('change', renderMenu);
});

async function loadCategories() {
  try {
    const cats = await api('/menu/categories');
    const wrap = document.getElementById('categoryPills');
    cats.forEach(cat => {
      const btn = document.createElement('button');
      btn.className = 'category-pill';
      btn.dataset.cat = cat;
      btn.textContent = cat;
      btn.addEventListener('click', () => setCategory(cat, btn));
      wrap.appendChild(btn);
    });
    wrap.querySelector('[data-cat=""]').addEventListener('click', () => setCategory('', wrap.querySelector('[data-cat=""]')));
  } catch (err) {
    toast('Could not load categories', 'error');
  }
}

function setCategory(cat, btnEl) {
  activeCategory = cat;
  document.querySelectorAll('.category-pill').forEach(p => p.classList.remove('active'));
  btnEl.classList.add('active');
  renderMenu();
}

async function loadMenu() {
  try {
    allMenuItems = await api('/menu');
    renderMenu();
  } catch (err) {
    document.getElementById('menuGrid').innerHTML = `<p class="text-muted">Could not load the menu. Please try again later.</p>`;
  }
}

function renderMenu() {
  const grid = document.getElementById('menuGrid');
  const search = document.getElementById('searchInput').value.trim().toLowerCase();
  const vegOnly = document.getElementById('vegOnly').checked;

  let items = allMenuItems;
  if (activeCategory) items = items.filter(i => i.category === activeCategory);
  if (vegOnly) items = items.filter(i => i.is_veg);
  if (search) items = items.filter(i => i.name.toLowerCase().includes(search) || (i.description || '').toLowerCase().includes(search));

  if (!items.length) {
    grid.innerHTML = `<div class="empty-state" style="grid-column:1/-1;"><div class="big-icon">🍽️</div><p>No items match your filters.</p></div>`;
    return;
  }

  grid.innerHTML = items.map(item => `
    <div class="card menu-card reveal visible">
      <img class="photo" src="${escapeHTML(item.image) || 'https://images.unsplash.com/photo-1495474472287-4d71bcdd2085?w=600&q=80'}" alt="${escapeHTML(item.name)}" loading="lazy" onerror="this.src='https://images.unsplash.com/photo-1495474472287-4d71bcdd2085?w=600&q=80'">
      <div class="body-pad">
        <div class="flex between">
          <h4>${escapeHTML(item.name)}</h4>
          <span class="veg-dot ${item.is_veg ? '' : 'non-veg'}" title="${item.is_veg ? 'Veg' : 'Non-Veg'}"></span>
        </div>
        <p class="desc">${escapeHTML(item.description || '')}</p>
        <div class="row">
          <span class="price-tag">${formatMoney(item.price)}</span>
          <button class="btn btn-primary btn-sm" onclick='addToCart(${JSON.stringify({ id: item.id, name: item.name, price: Number(item.price), image: item.image }).replace(/'/g, "&apos;")})'>Add +</button>
        </div>
      </div>
    </div>
  `).join('');
}

function debounce(fn, delay) {
  let t;
  return (...args) => { clearTimeout(t); t = setTimeout(() => fn(...args), delay); };
}

function escapeHTML(str) {
  const div = document.createElement('div');
  div.textContent = str || '';
  return div.innerHTML;
}
