document.addEventListener('DOMContentLoaded', () => {
  loadFeaturedMenu();
  loadTestimonials();
  const form = document.getElementById('feedbackForm');
  if (form) form.addEventListener('submit', submitFeedback);
  setupFeedbackImagePicker();
});

async function loadFeaturedMenu() {
  const grid = document.getElementById('featuredMenu');
  if (!grid) return;
  try {
    const items = await api('/menu');
    // Pick one highlight per category so Fan Favourites feels varied
    const byCategory = new Map();
    for (const item of items) {
      if (!byCategory.has(item.category)) byCategory.set(item.category, item);
    }
    const featured = [...byCategory.values()].slice(0, 4);
    const fallback = items.slice(0, 4);
    const picks = featured.length >= 4 ? featured : (featured.length ? featured : fallback);
    grid.innerHTML = picks.map(menuCardHTML).join('') || `<p class="text-muted">Menu coming soon!</p>`;
  } catch (err) {
    grid.innerHTML = `<p class="text-muted">Could not load the menu right now.</p>`;
  }
}

function menuCardHTML(item) {
  // Use "visible" so cards show immediately — they are injected after initScrollReveal runs
  return `
    <div class="card menu-card reveal visible">
      <img class="photo" src="${escapeHTML(item.image) || 'https://images.unsplash.com/photo-1495474472287-4d71bcdd2085?w=600&q=80'}" alt="${escapeHTML(item.name)}" loading="lazy" onerror="this.src='https://images.unsplash.com/photo-1495474472287-4d71bcdd2085?w=600&q=80'">
      <div class="body-pad">
        <div class="flex between">
          <h4>${escapeHTML(item.name)}</h4>
          <span class="veg-dot ${item.is_veg ? '' : 'non-veg'}" title="${item.is_veg ? 'Veg' : 'Non-Veg'}"></span>
        </div>
        <p class="desc">${escapeHTML(item.description || '')}</p>
        <div class="row menu-actions">
          <span class="price-tag">${formatMoney(item.price)}</span>
          <div class="menu-btns">
            <button type="button" class="btn btn-outline btn-sm" onclick='addToCart(${JSON.stringify({ id: item.id, name: item.name, price: Number(item.price), image: item.image }).replace(/'/g, "&apos;")})'>Add</button>
            <button type="button" class="btn btn-primary btn-sm" onclick='orderNow(${JSON.stringify({ id: item.id, name: item.name, price: Number(item.price), image: item.image }).replace(/'/g, "&apos;")})'>Order Now</button>
          </div>
        </div>
      </div>
    </div>`;
}

function feedbackTypeLabel(type) {
  const t = String(type || 'CAFE').toUpperCase();
  if (t === 'PRODUCT') return 'Product';
  if (t === 'BOTH') return 'Cafe & Product';
  return 'Cafe';
}

async function loadTestimonials() {
  const grid = document.getElementById('testimonialGrid');
  if (!grid) return;
  try {
    const feedback = await api('/feedback');
    if (!feedback.length) {
      grid.innerHTML = `<p class="text-muted">Be the first to leave a review below!</p>`;
      return;
    }
    grid.innerHTML = feedback.slice(0, 6).map(f => `
      <div class="testimonial-card reveal visible">
        <div class="flex between" style="align-items:flex-start;gap:8px;">
          <div class="stars">${'★'.repeat(f.rating)}${'☆'.repeat(5 - f.rating)}</div>
          <span class="fb-type-chip">${feedbackTypeLabel(f.feedback_type)}</span>
        </div>
        ${f.image ? `<img class="fb-review-photo" src="${escapeHTML(f.image)}" alt="Guest photo" loading="lazy">` : ''}
        <p>"${escapeHTML(f.message)}"</p>
        <div class="who">
          <div class="avatar-circle">${f.name.charAt(0).toUpperCase()}</div>
          <div><strong>${escapeHTML(f.name)}</strong><br><small class="text-muted">${new Date(f.created_at).toLocaleDateString()}</small></div>
        </div>
      </div>
    `).join('');
  } catch (err) {
    grid.innerHTML = `<p class="text-muted">Could not load reviews right now.</p>`;
  }
}

function setupFeedbackImagePicker() {
  const input = document.getElementById('fbImage');
  const pickBtn = document.getElementById('fbPickBtn');
  const removeBtn = document.getElementById('fbRemoveImg');
  const zone = document.getElementById('fbUploadZone');
  if (!input || !pickBtn) return;

  pickBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    input.click();
  });
  zone?.addEventListener('click', (e) => {
    if (document.getElementById('fbUploadPreview') && !document.getElementById('fbUploadPreview').hidden) return;
    if (e.target.closest('#fbUploadIdle') || e.target === zone) input.click();
  });

  input.addEventListener('change', () => {
    const file = input.files && input.files[0];
    if (!file) { clearFeedbackImage(); return; }
    if (file.size > 3 * 1024 * 1024) {
      toast('Please choose an image under 3 MB.', 'error');
      clearFeedbackImage();
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      document.getElementById('fbPreviewImg').src = reader.result;
      document.getElementById('fbFileName').textContent = file.name;
      document.getElementById('fbUploadIdle').hidden = true;
      document.getElementById('fbUploadPreview').hidden = false;
    };
    reader.readAsDataURL(file);
  });

  removeBtn?.addEventListener('click', (e) => {
    e.stopPropagation();
    clearFeedbackImage();
  });
}

function clearFeedbackImage() {
  const input = document.getElementById('fbImage');
  if (input) input.value = '';
  const preview = document.getElementById('fbUploadPreview');
  const idle = document.getElementById('fbUploadIdle');
  if (preview) preview.hidden = true;
  if (idle) idle.hidden = false;
  const img = document.getElementById('fbPreviewImg');
  if (img) img.removeAttribute('src');
}

async function submitFeedback(e) {
  e.preventDefault();
  const alertBox = document.getElementById('feedbackAlert');
  const btn = document.getElementById('fbSubmitBtn');
  alertBox.className = 'form-alert';
  alertBox.textContent = '';

  const name = document.getElementById('fbName').value.trim();
  const email = document.getElementById('fbEmail').value.trim();
  const rating = document.getElementById('fbRating').value;
  const message = document.getElementById('fbMessage').value.trim();
  const feedbackType = document.getElementById('fbType').value;
  const imageFile = document.getElementById('fbImage').files[0];

  if (!name || !message) {
    alertBox.className = 'form-alert error';
    alertBox.textContent = 'Please enter your name and a message.';
    return;
  }

  const fd = new FormData();
  fd.append('name', name);
  fd.append('email', email);
  fd.append('rating', rating);
  fd.append('message', message);
  fd.append('feedback_type', feedbackType);
  if (imageFile) fd.append('image', imageFile);

  btn.disabled = true;
  btn.textContent = 'Sending...';
  try {
    await api('/feedback', { method: 'POST', formData: fd, auth: isLoggedIn() });
    alertBox.className = 'form-alert success';
    alertBox.textContent = 'Thank you! Your feedback has been submitted.';
    document.getElementById('feedbackForm').reset();
    clearFeedbackImage();
    loadTestimonials();
  } catch (err) {
    alertBox.className = 'form-alert error';
    alertBox.textContent = err.message;
  } finally {
    btn.disabled = false;
    btn.textContent = 'Submit Feedback';
  }
}

function escapeHTML(str) {
  const div = document.createElement('div');
  div.textContent = str || '';
  return div.innerHTML;
}
