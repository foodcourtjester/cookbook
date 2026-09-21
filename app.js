let allCatalog = [];

const recipeGrid = document.getElementById('recipeGrid');
const tagsContainer = document.getElementById('tagsContainer');
const modal = document.getElementById('recipeModal');
const closeModalBtn = document.getElementById('closeModal');

// 1. Fetch initial catalog index
async function initApp() {
  try {
    const response = await fetch('./recipes/index.json');
    allCatalog = await response.json();
    renderGrid('all');
  } catch (error) {
    console.error('Error loading recipe index:', error);
  }
}

// 2. Render Card Grid (Photo + Name)
// Render Card Grid (Supports Multiple Categories)
function renderGrid(category) {
  recipeGrid.innerHTML = '';

  // Check if item's categories array includes the selected tag
  const filtered = category === 'all' 
    ? allCatalog 
    : allCatalog.filter(item => item.categories && item.categories.includes(category));

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

// 3. Fetch detailed JSON file when recipe card is clicked
async function loadAndOpenRecipe(recipeId) {
  try {
    const response = await fetch(`./recipes/${recipeId}.json`);
    const recipe = await response.json();
    
    document.getElementById('modalTitle').textContent = recipe.title;
    document.getElementById('modalImage').src = recipe.img;
    
    // Render Equipment (if present in JSON)
    const equipmentList = document.getElementById('modalEquipment');
    if (recipe.equipment && recipe.equipment.length > 0) {
      equipmentList.parentElement.querySelector('h3').style.display = 'block'; // Show section header
      equipmentList.innerHTML = recipe.equipment.map(item => `<li>${item}</li>`).join('');
    } else {
      equipmentList.parentElement.querySelector('h3').style.display = 'none'; // Hide if omitted
      equipmentList.innerHTML = '';
    }

    // Render Ingredients
    document.getElementById('modalIngredients').innerHTML = recipe.ingredients
      .map(ing => `<li>${ing}</li>`).join('');
      
    // Render Instructions
    document.getElementById('modalInstructions').innerHTML = recipe.instructions
      .map(inst => `<li>${inst}</li>`).join('');

    modal.classList.add('active');
  } catch (error) {
    console.error(`Failed to load recipe detail: ${recipeId}`, error);
  }
}
// 4. Category Tag Filtering Listener
tagsContainer.addEventListener('click', (e) => {
  if (!e.target.classList.contains('tag')) return;

  document.querySelectorAll('.tag').forEach(t => t.classList.remove('active'));
  e.target.classList.add('active');

  const category = e.target.getAttribute('data-category');
  renderGrid(category);
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
