let allCatalog = [];
// Store active categories in a Set
let selectedCategories = new Set(['all']);

const recipeGrid = document.getElementById('recipeGrid');
const tagsContainer = document.getElementById('tagsContainer');
const modal = document.getElementById('recipeModal');
const closeModalBtn = document.getElementById('closeModal');

// Fetch catalog
async function initApp() {
  try {
    const response = await fetch('./recipes/index.json');
    allCatalog = await response.json();
    renderGrid();
  } catch (error) {
    console.error('Error loading recipe index:', error);
  }
}

// Render Card Grid (Supports Multiple Active Tags)
function renderGrid() {
  recipeGrid.innerHTML = '';

  const filtered = selectedCategories.has('all')
    ? allCatalog
    : allCatalog.filter(item => {
        if (!item.categories) return false;
        // MATCH ANY SELECTED TAG (OR logic):
        // return Array.from(selectedCategories).some(cat => item.categories.includes(cat));

        // MATCH ALL SELECTED TAGS (AND logic):
        return Array.from(selectedCategories).every(cat => item.categories.includes(cat));
      });

  filtered.forEach(item => {
    const card = document.createElement('article');
    card.className = 'recipe-card';
    card.innerHTML = `
      <img class="card-image" src="${item.img}" alt="${item.title}" loading="lazy">
      <div class="card-content">
        <h2 class="card-title">${item.title}</h2>
      </div>
    `;

    card.addEventListener('click', () => loadAndOpenRecipe(item.id));
    recipeGrid.appendChild(card);
  });
}

// Multi-Select Category Tag Listener
tagsContainer.addEventListener('click', (e) => {
  if (!e.target.classList.contains('tag')) return;

  const category = e.target.getAttribute('data-category');

  if (category === 'all') {
    // If 'All' is clicked, clear all specific filters
    selectedCategories.clear();
    selectedCategories.add('all');
    document.querySelectorAll('.tag').forEach(t => t.classList.remove('active'));
    e.target.classList.add('active');
  } else {
    // Remove 'All' when selecting specific tags
    if (selectedCategories.has('all')) {
      selectedCategories.delete('all');
      document.querySelector('.tag[data-category="all"]').classList.remove('active');
    }

    // Toggle the clicked tag
    if (selectedCategories.has(category)) {
      selectedCategories.delete(category);
      e.target.classList.remove('active');
    } else {
      selectedCategories.add(category);
      e.target.classList.add('active');
    }

    // If all specific tags are deselected, fall back to 'All'
    if (selectedCategories.size === 0) {
      selectedCategories.add('all');
      document.querySelector('.tag[data-category="all"]').classList.add('active');
    }
  }

  renderGrid();
});

// Modal Close Listeners
closeModalBtn.addEventListener('click', () => modal.classList.remove('active'));
modal.addEventListener('click', (e) => {
  if (e.target === modal) modal.classList.remove('active');
});

// Run App
initApp();

// 5. Register Service Worker & Handle Updates
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('./sw.js').then((registration) => {
      registration.addEventListener('updatefound', () => {
        const newWorker = registration.installing;
        newWorker.addEventListener('statechange', () => {
          if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
            showUpdateToast();
          }
        });
      });
    }).catch(err => console.error('SW Registration Failed:', err));

    let refreshing = false;
    navigator.serviceWorker.addEventListener('controllerchange', () => {
      if (!refreshing) {
        refreshing = true;
        window.location.reload();
      }
    });
  });
}

function showUpdateToast() {
  const toast = document.createElement('div');
  toast.style.cssText = `
    position: fixed; bottom: 20px; left: 50%; transform: translateX(-50%);
    background: #e05638; color: white; padding: 12px 20px; border-radius: 25px;
    box-shadow: 0 4px 12px rgba(0,0,0,0.2); display: flex; align-items: center;
    gap: 12px; z-index: 1000;
  `;
  toast.innerHTML = `
    <span>New recipes available!</span>
    <button id="reloadBtn" style="background:white; color:#e05638; border:none; padding:6px 12px; border-radius:15px; font-weight:bold; cursor:pointer;">Update</button>
  `;
  document.body.appendChild(toast);

  document.getElementById('reloadBtn').addEventListener('click', () => {
    navigator.serviceWorker.ready.then((reg) => {
      if (reg.waiting) reg.waiting.postMessage({ type: 'SKIP_WAITING' });
      else window.location.reload();
    });
  });
}
