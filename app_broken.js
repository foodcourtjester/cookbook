let allCatalog = [];
let selectedCategories = new Set(['all']);
let wakeLock = null;

const recipeGrid = document.getElementById('recipeGrid');
const tagsContainer = document.getElementById('tagsContainer');
const modal = document.getElementById('recipeModal');
const closeModalBtn = document.getElementById('closeModal');
const wakeLockBtn = document.getElementById('wakeLockBtn');

const hamburgerBtn = document.getElementById('hamburgerBtn');
const sideDrawer = document.getElementById('sideDrawer');
const navOverlay = document.getElementById('navOverlay');
const closeDrawerBtn = document.getElementById('closeDrawerBtn');

const themeToggle = document.getElementById('themeToggle');

let currentActiveRecipeId = null;

// Initialize Application
document.addEventListener('DOMContentLoaded', () => {
  initApp();
  setupEventListeners();
});

// Fetch catalog index on load
async function initApp() {
  try {
    const response = await fetch('./recipes/index.json');
    allCatalog = await response.json();
    renderGrid();
  } catch (error) {
    console.error('Error loading recipe index:', error);
  }
}

// Event Listeners Setup
function setupEventListeners() {

  // Open / Close Side Drawer
hamburgerBtn.addEventListener('click', openDrawer);
closeDrawerBtn.addEventListener('click', closeDrawer);
navOverlay.addEventListener('click', closeDrawer);

function openDrawer() {
  sideDrawer.classList.add('active');
  navOverlay.classList.add('active');
}

function closeDrawer() {
  sideDrawer.classList.remove('active');
  navOverlay.classList.remove('active');
}

// Page View Navigation
document.querySelectorAll('.nav-links .nav-item').forEach(link => {
  link.addEventListener('click', (e) => {
    e.preventDefault();
    const targetPage = link.getAttribute('data-page');

    // Update active state on nav links
    document.querySelectorAll('.nav-links .nav-item').forEach(item => item.classList.remove('active'));
    link.classList.add('active');

    // Toggle active section
    document.querySelectorAll('.page-view').forEach(page => page.classList.remove('active-page'));
    
    if (targetPage === 'home') {
      document.getElementById('homePage').classList.add('active-page');
    } else if (targetPage === 'about') {
      document.getElementById('aboutPage').classList.add('active-page');
    }

    closeDrawer();
  });
});
  
  // Category Tag Multi-Select
  if (tagsContainer) {
    tagsContainer.addEventListener('click', (e) => {
      if (!e.target.classList.contains('tag')) return;

      const category = e.target.getAttribute('data-category');

      if (category === 'all') {
        selectedCategories.clear();
        selectedCategories.add('all');
        document.querySelectorAll('.tag').forEach(t => t.classList.remove('active'));
        e.target.classList.add('active');
      } else {
        if (selectedCategories.has('all')) {
          selectedCategories.delete('all');
          const allBtn = document.querySelector('.tag[data-category="all"]');
          if (allBtn) allBtn.classList.remove('active');
        }

        if (selectedCategories.has(category)) {
          selectedCategories.delete(category);
          e.target.classList.remove('active');
        } else {
          selectedCategories.add(category);
          e.target.classList.add('active');
        }

        if (selectedCategories.size === 0) {
          selectedCategories.add('all');
          const allBtn = document.querySelector('.tag[data-category="all"]');
          if (allBtn) allBtn.classList.add('active');
        }
      }

      renderGrid();
    });
  }

  // Wake Lock Button Listener
  if (wakeLockBtn) {
    wakeLockBtn.addEventListener('click', toggleWakeLock);
  }

  // Modal Close Listeners
  if (closeModalBtn) {
    closeModalBtn.addEventListener('click', closeModal);
  }

  if (modal) {
    modal.addEventListener('click', (e) => {
      if (e.target === modal) closeModal();
    });
  }

  window.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && modal && modal.classList.contains('active')) {
      closeModal();
    }
  });
}

// Render Card Grid
function renderGrid() {
  if (!recipeGrid) return;
  recipeGrid.innerHTML = '';

  const filtered = selectedCategories.has('all')
    ? allCatalog
    : allCatalog.filter(item => {
        if (!item.categories) return false;
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

function renderRecipeModal(recipe) {
  const modalContent = document.getElementById('modalContent');
  if (!modalContent) return;

  currentActiveRecipeId = recipe.id;

  // 1. Generate Equipment List HTML (optional checklist or simple list)
  const equipmentHTML = recipe.equipment && recipe.equipment.length > 0
    ? `
      <h3>Equipment Needed</h3>
      <ul class="checklist">
        ${recipe.equipment.map((item, index) => `
          <li class="checklist-item">
            <input type="checkbox" id="eq-${index}" aria-label="${item}" />
            <label for="eq-${index}" class="checklist-label">${item}</label>
          </li>
        `).join('')}
      </ul>
    `
    : '';

  // 2. Generate Ingredients Checklist
  const ingredientsHTML = recipe.ingredients
    .map((item, index) => `
      <li class="checklist-item">
        <input type="checkbox" id="ing-${index}" aria-label="${item}" />
        <label for="ing-${index}" class="checklist-label">${item}</label>
      </li>
    `)
    .join('');

  // 3. Generate Instructions Checklist
  const instructionsHTML = recipe.instructions
    .map((step, index) => `
      <li class="checklist-item">
        <input type="checkbox" id="step-${index}" aria-label="Step ${index + 1}: ${step}" />
        <label for="step-${index}" class="checklist-label">
          <strong>Step ${index + 1}:</strong> ${step}
        </label>
      </li>
    `)
    .join('');

  // Inject into Modal
  modalContent.innerHTML = `
    <h2>${recipe.title}</h2>
    
    ${equipmentHTML}

    <h3>Ingredients</h3>
    <ul class="checklist">
      ${ingredientsHTML}
    </ul>

    <h3>Instructions</h3>
    <ul class="checklist">
      ${instructionsHTML}
    </ul>
  `;

  restoreChecklistState(recipe.id);
  openModal();
}
// Screen Wake Lock Handler
async function toggleWakeLock() {
  if (!('wakeLock' in navigator)) {
    alert('Screen Wake Lock is not supported on this browser.');
    return;
  }

  try {
    if (!wakeLock) {
      wakeLock = await navigator.wakeLock.request('screen');
      if (wakeLockBtn) {
        wakeLockBtn.classList.add('active');
        wakeLockBtn.innerHTML = '🔓 Screen Stay-On Active';
      }

      wakeLock.addEventListener('release', () => {
        wakeLock = null;
        if (wakeLockBtn) {
          wakeLockBtn.classList.remove('active');
          wakeLockBtn.innerHTML = '🔒 Keep Screen On';
        }
      });
    } else {
      await wakeLock.release();
      wakeLock = null;
      if (wakeLockBtn) {
        wakeLockBtn.classList.remove('active');
        wakeLockBtn.innerHTML = '🔒 Keep Screen On';
      }
    }
  } catch (err) {
    console.error(`Wake Lock error: ${err.name}, ${err.message}`);
  }
}

// Close Modal Handler
function closeModal() {
  if (modal) modal.classList.remove('active');
  
  // Auto-release screen lock when closing modal
  if (wakeLock) {
    wakeLock.release().then(() => {
      wakeLock = null;
      if (wakeLockBtn) {
        wakeLockBtn.classList.remove('active');
        wakeLockBtn.innerHTML = '🔒 Keep Screen On';
      }
    });
  }
}

// Register Service Worker & Updates
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

// Theme Toggle Setup

// Check saved theme or system default on load
function initTheme() {
  const savedTheme = localStorage.getItem('theme');
  const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;

  if (savedTheme === 'dark' || (!savedTheme && prefersDark)) {
    document.documentElement.setAttribute('data-theme', 'dark');
    if (themeToggle) themeToggle.checked = true;
  } else {
    document.documentElement.setAttribute('data-theme', 'light');
    if (themeToggle) themeToggle.checked = false;
  }
}

// Event listener for toggle switch
if (themeToggle) {
  themeToggle.addEventListener('change', (e) => {
    if (e.target.checked) {
      document.documentElement.setAttribute('data-theme', 'dark');
      localStorage.setItem('theme', 'dark');
    } else {
      document.documentElement.setAttribute('data-theme', 'light');
      localStorage.setItem('theme', 'light');
    }
  });
}

// Call initTheme at script initialization
initTheme();
