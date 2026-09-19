let allCatalog = [];

const recipeGrid = document.getElementById('recipeGrid');
const chipsContainer = document.getElementById('chipsContainer');
const modal = document.getElementById('recipeModal');
const closeModalBtn = document.getElementById('closeModal');

// 1. Fetch initial index catalog to render cards
async function initApp() {
  try {
    const response = await fetch('./recipes/index.json');
    allCatalog = await response.json();
    renderGrid('all');
  } catch (error) {
    console.error('Error loading recipe catalog:', error);
  }
}

// 2. Render Card Grid
function renderGrid(category) {
  recipeGrid.innerHTML = '';

  const filtered = category === 'all' 
    ? allCatalog 
    : allCatalog.filter(item => item.category === category);

  filtered.forEach(item => {
    const card = document.createElement('article');
    card.className = 'recipe-card';
    card.innerHTML = `
      <img class="card-image" src="${item.img}" alt="${item.title}" loading="lazy">
      <div class="card-content">
        <h2 class="card-title">${item.title}</h2>
      </div>
    `;

    // Fetch individual JSON file on tap
    card.addEventListener('click', () => loadAndOpenRecipe(item.id));
    recipeGrid.appendChild(card);
  });
}

// 3. Dynamic Fetch for specific JSON file
async function loadAndOpenRecipe(recipeId) {
  try {
    const response = await fetch(`./recipes/${recipeId}.json`);
    const recipe = await response.json();
    
    document.getElementById('modalTitle').textContent = recipe.title;
    document.getElementById('modalImage').src = recipe.img;
    
    document.getElementById('modalIngredients').innerHTML = recipe.ingredients
      .map(ing => `<li>${ing}</li>`).join('');
      
    document.getElementById('modalInstructions').innerHTML = recipe.instructions
      .map(inst => `<li>${inst}</li>`).join('');

    modal.classList.add('active');
  } catch (error) {
    console.error(`Failed to load recipe: ${recipeId}`, error);
  }
}

// 4. Chip Event Listener
chipsContainer.addEventListener('click', (e) => {
  if (!e.target.classList.contains('chip')) return;

  document.querySelectorAll('.chip').forEach(c => c.classList.remove('active'));
  e.target.classList.add('active');

  const category = e.target.getAttribute('data-category');
  renderGrid(category);
});

// Modal Close Handlers
closeModalBtn.addEventListener('click', () => modal.classList.remove('active'));
modal.addEventListener('click', (e) => {
  if (e.target === modal) modal.classList.remove('active');
});

// Register Service Worker for PWA / Offline capabilities
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('./sw.js')
      .then((registration) => {
        console.log('ServiceWorker registered with scope:', registration.scope);
      })
      .catch((error) => {
        console.error('ServiceWorker registration failed:', error);
      });
  });
}

// Register Service Worker & handle automatic update prompts
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('./sw.js').then((registration) => {
      
      // Check for updates periodically or on page load
      registration.addEventListener('updatefound', () => {
        const newWorker = registration.installing;
        
        newWorker.addEventListener('statechange', () => {
          if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
            // New content is available; show update notification to user
            showUpdateToast();
          }
        });
      });

    }).catch((error) => console.error('SW registration failed:', error));

    // Reload page once the new Service Worker takes over
    let refreshing = false;
    navigator.serviceWorker.addEventListener('controllerchange', () => {
      if (!refreshing) {
        refreshing = true;
        window.location.reload();
      }
    });
  });
}

// Banner/Toast notifying user to reload for new recipes
function showUpdateToast() {
  const toast = document.createElement('div');
  toast.id = 'update-toast';
  toast.style.cssText = `
    position: fixed;
    bottom: 20px;
    left: 50%;
    transform: translateX(-50%);
    background: #e05638;
    color: white;
    padding: 12px 20px;
    border-radius: 25px;
    box-shadow: 0 4px 12px rgba(0,0,0,0.2);
    display: flex;
    align-items: center;
    gap: 12px;
    z-index: 1000;
  `;
  toast.innerHTML = `
    <span>New recipes available!</span>
    <button id="reloadBtn" style="background:white; color:#e05638; border:none; padding:6px 12px; border-radius:15px; font-weight:bold; cursor:pointer;">Update</button>
  `;
  
  document.body.appendChild(toast);

  document.getElementById('reloadBtn').addEventListener('click', () => {
    // Tell the waiting Service Worker to activate immediately
    navigator.serviceWorker.ready.then((registration) => {
      if (registration.waiting) {
        registration.waiting.postMessage({ type: 'SKIP_WAITING' });
      } else {
        window.location.reload();
      }
    });
  });
}

// Run App
initApp();