document.addEventListener('DOMContentLoaded', () => {
  loadFeaturedMenu();
  loadTestimonials();
  const form = document.getElementById('feedbackForm');
  if (form) form.addEventListener('submit', submitFeedback);
});

async function loadFeaturedMenu() {
  const grid = document.getElementById('featuredMenu');
  if (!grid) return;
  try {
    const items = await api('/menu');
    const featured = items.slice(0, 4);
    grid.innerHTML = featured.map(menuCardHTML).join('') || `<p class="text-muted">Menu coming soon!</p>`;
  } catch (err) {
    grid.innerHTML = `<p class="text-muted">Could not load the menu right now.</p>`;
  }
}

function menuCardHTML(item) {
  return `
    <div class="card menu-card reveal">
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
    </div>`;
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
      <div class="testimonial-card reveal">
        <div class="stars">${'★'.repeat(f.rating)}${'☆'.repeat(5 - f.rating)}</div>
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

  if (!name || !message) {
    alertBox.className = 'form-alert error';
    alertBox.textContent = 'Please enter your name and a message.';
    return;
  }

  btn.disabled = true;
  btn.textContent = 'Sending...';
  try {
    await api('/feedback', { method: 'POST', body: { name, email, rating, message }, auth: isLoggedIn() });
    alertBox.className = 'form-alert success';
    alertBox.textContent = 'Thank you! Your feedback has been submitted.';
    document.getElementById('feedbackForm').reset(); // clear form so it's ready to fill again
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
