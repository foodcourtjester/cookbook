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

// Run App
initApp();