// PlantCare - Plants & Care Logs Module

window.PlantCarePlants = (() => {
  const { apiRequest, isAuthenticated, resolveMediaUrl } = window.PlantCareAPI;
  const FALLBACK_IMAGE =
    'https://images.unsplash.com/photo-1466781783364-36c955e42a7f?auto=format&fit=crop&w=800&q=80';

  let plantsCache = [];
  let editingPlantId = null;

  function getPlants() {
    return plantsCache;
  }

  async function fetchPlants() {
    if (!isAuthenticated()) {
      plantsCache = [];
      return [];
    }
    plantsCache = await apiRequest('/api/plants/', { method: 'GET' });
    return plantsCache;
  }

  async function createPlant(formData) {
    return apiRequest('/api/plants/', { method: 'POST', body: formData });
  }

  async function updatePlant(plantId, formData) {
    return apiRequest(`/api/plants/${plantId}/`, { method: 'PATCH', body: formData });
  }

  async function deletePlant(plantId) {
    return apiRequest(`/api/plants/${plantId}/`, { method: 'DELETE' });
  }

  async function createCareLog(plantId, careType = 'watering', description = 'Watered from My Garden') {
    return apiRequest('/api/plants/care-logs/', {
      method: 'POST',
      body: {
        plant: plantId,
        care_type: careType,
        description,
        care_date: new Date().toISOString(),
      },
    });
  }

  function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text ?? '';
    return div.innerHTML;
  }

  function renderGardenPlants() {
    const gardenGridEl = document.getElementById('gardenGrid');
    const gardenCountBadge = document.getElementById('gardenCountBadge');
    if (!gardenGridEl) return;

    if (!isAuthenticated()) {
      if (gardenCountBadge) gardenCountBadge.textContent = 'Sign In';
      gardenGridEl.innerHTML = `
        <div style="grid-column: 1 / -1; text-align: center; padding: 40px 20px; background: rgba(255,255,255,0.25); border-radius: 20px; border: 1px dashed var(--leaf-green-400);">
          <i class="fa-solid fa-lock" style="font-size: 2.2rem; color: var(--leaf-green-500); margin-bottom: 10px; display: block;"></i>
          <h3>Sign in to manage your personal garden</h3>
          <p style="color: var(--text-muted); margin: 8px 0 18px;">Create an account or log in to save plants, upload photos, and track care reminders.</p>
          <button class="btn-leaf btn-leaf-sm" id="gardenPromptLoginBtn">
            <i class="fa-solid fa-right-to-bracket"></i> Login / Register
          </button>
        </div>
      `;
      const promptBtn = document.getElementById('gardenPromptLoginBtn');
      if (promptBtn) {
        promptBtn.addEventListener('click', () => window.PlantCareAuth.openAuthModal('login'));
      }
      return;
    }

    if (gardenCountBadge) {
      gardenCountBadge.textContent = `${plantsCache.length} Plant${plantsCache.length === 1 ? '' : 's'}`;
    }

    if (plantsCache.length === 0) {
      gardenGridEl.innerHTML = `
        <div style="grid-column: 1 / -1; text-align: center; padding: 40px 20px; background: rgba(255,255,255,0.25); border-radius: 20px; border: 1px dashed var(--leaf-green-400);">
          <i class="fa-solid fa-seedling" style="font-size: 2.2rem; color: var(--leaf-green-400); margin-bottom: 10px; display: block;"></i>
          <h3>Your Garden is currently empty!</h3>
          <p style="color: var(--text-muted); margin-top: 6px;">Click "Add Plant" above or track a plant from the Plant Encyclopedia.</p>
        </div>
      `;
      return;
    }

    gardenGridEl.innerHTML = plantsCache
      .map((plant) => {
        const imgSrc = resolveMediaUrl(plant.plant_image) || FALLBACK_IMAGE;
        const sci = plant.scientific_name ? `<div style="font-size:0.78rem;font-style:italic;color:var(--text-muted);">${escapeHtml(plant.scientific_name)}</div>` : '';
        const typeLabel = plant.plant_type ? escapeHtml(plant.plant_type) : 'General';
        const locLabel = plant.location ? escapeHtml(plant.location) : 'Unspecified';
        const statusLabel = escapeHtml(plant.health_status || 'unknown');

        return `
          <div class="glass-card garden-plant-item" data-plant-id="${plant.id}">
            <div class="garden-plant-thumb">
              <img src="${imgSrc}" alt="${escapeHtml(plant.plant_name)}">
            </div>
            <div class="garden-plant-details">
              <h4>${escapeHtml(plant.plant_name)}</h4>
              ${sci}
              <div class="garden-location"><i class="fa-solid fa-location-dot"></i> ${locLabel} • ${typeLabel}</div>
              <div class="water-status-bar">
                <div class="water-status-labels">
                  <span>Status: <strong style="text-transform:capitalize;">${statusLabel}</strong></span>
                  <span>ID #${plant.id}</span>
                </div>
              </div>
              <div class="garden-item-footer">
                <button class="action-water-btn" data-action="waterBackendPlant" data-plant-id="${plant.id}">
                  <i class="fa-solid fa-droplet"></i> Log Water
                </button>
                <button class="btn-glass" style="padding: 4px 10px; font-size: 0.78rem;" data-action="editBackendPlant" data-plant-id="${plant.id}" title="Edit plant">
                  <i class="fa-solid fa-pen"></i> Edit
                </button>
                <button class="btn-glass" style="padding: 4px 10px; font-size: 0.78rem; color: #ff7675" data-action="deleteBackendPlant" data-plant-id="${plant.id}" title="Delete plant">
                  <i class="fa-solid fa-trash-can"></i>
                </button>
              </div>
            </div>
          </div>
        `;
      })
      .join('');
  }

  function openPlantFormModal(plant = null) {
    if (!isAuthenticated()) {
      window.PlantCareAuth.openAuthModal('login');
      return;
    }

    const modal = document.getElementById('plantFormModal');
    const titleEl = document.getElementById('plantFormModalTitle');
    const errorBox = document.getElementById('plantFormErrorMsg');
    const form = document.getElementById('plantForm');
    if (!modal || !form) return;

    form.reset();
    if (errorBox) errorBox.textContent = '';

    if (plant) {
      editingPlantId = plant.id;
      if (titleEl) titleEl.textContent = 'Edit Plant';
      document.getElementById('plantNameInput').value = plant.plant_name || '';
      document.getElementById('plantScientificInput').value = plant.scientific_name || '';
      document.getElementById('plantTypeInput').value = plant.plant_type || '';
      document.getElementById('plantLocationInput').value = plant.location || '';
      document.getElementById('plantHealthStatusInput').value = plant.health_status || 'unknown';
    } else {
      editingPlantId = null;
      if (titleEl) titleEl.textContent = 'Add New Plant';
    }

    modal.classList.add('active');
  }

  function closePlantFormModal() {
    const modal = document.getElementById('plantFormModal');
    if (modal) modal.classList.remove('active');
    editingPlantId = null;
  }

  async function refreshPlantsAndNotify(onAfterChange) {
    await fetchPlants();
    renderGardenPlants();
    if (onAfterChange) onAfterChange(plantsCache);
  }

  function initPlantEvents(onToast, onPlantsUpdated) {
    const addPlantBtn = document.getElementById('openAddPlantModalBtn');
    const closeBtn = document.getElementById('plantFormCloseBtn');
    const modal = document.getElementById('plantFormModal');
    const form = document.getElementById('plantForm');
    const gardenGridEl = document.getElementById('gardenGrid');
    const errorBox = document.getElementById('plantFormErrorMsg');

    if (addPlantBtn) {
      addPlantBtn.addEventListener('click', () => openPlantFormModal(null));
    }
    if (closeBtn) closeBtn.addEventListener('click', closePlantFormModal);
    if (modal) {
      modal.addEventListener('click', (e) => {
        if (e.target === modal) closePlantFormModal();
      });
    }

    if (form) {
      form.addEventListener('submit', async (e) => {
        e.preventDefault();
        if (errorBox) errorBox.textContent = '';

        const submitBtn = form.querySelector('button[type="submit"]');
        const formData = new FormData();
        formData.append('plant_name', document.getElementById('plantNameInput').value.trim());
        formData.append('scientific_name', document.getElementById('plantScientificInput').value.trim());
        formData.append('plant_type', document.getElementById('plantTypeInput').value.trim());
        formData.append('location', document.getElementById('plantLocationInput').value.trim());
        formData.append('health_status', document.getElementById('plantHealthStatusInput').value);

        const imageInput = document.getElementById('plantImageInput');
        if (imageInput && imageInput.files && imageInput.files[0]) {
          formData.append('plant_image', imageInput.files[0]);
        }

        submitBtn.disabled = true;
        try {
          if (editingPlantId) {
            await updatePlant(editingPlantId, formData);
            if (onToast) onToast('Plant updated successfully!', '🪴');
          } else {
            await createPlant(formData);
            if (onToast) onToast('Plant added to your garden!', '🌱');
          }
          closePlantFormModal();
          await refreshPlantsAndNotify(onPlantsUpdated);
        } catch (err) {
          if (errorBox) errorBox.textContent = err.message;
        } finally {
          submitBtn.disabled = false;
        }
      });
    }

    if (gardenGridEl) {
      gardenGridEl.addEventListener('click', async (e) => {
        const waterBtn = e.target.closest('[data-action="waterBackendPlant"]');
        const editBtn = e.target.closest('[data-action="editBackendPlant"]');
        const deleteBtn = e.target.closest('[data-action="deleteBackendPlant"]');

        if (waterBtn) {
          const plantId = Number(waterBtn.getAttribute('data-plant-id'));
          try {
            await createCareLog(plantId, 'watering', 'Watered plant');
            if (onToast) onToast('Watering care log saved!', '💧');
          } catch (err) {
            if (onToast) onToast(err.message, '⚠️');
          }
          return;
        }

        if (editBtn) {
          const plantId = Number(editBtn.getAttribute('data-plant-id'));
          const plant = plantsCache.find((p) => p.id === plantId);
          if (plant) openPlantFormModal(plant);
          return;
        }

        if (deleteBtn) {
          const plantId = Number(deleteBtn.getAttribute('data-plant-id'));
          try {
            await deletePlant(plantId);
            await refreshPlantsAndNotify(onPlantsUpdated);
            if (onToast) onToast('Plant deleted from your garden.', '🗑️');
          } catch (err) {
            if (onToast) onToast(err.message, '⚠️');
          }
        }
      });
    }
  }

  return {
    getPlants,
    fetchPlants,
    createPlant,
    updatePlant,
    deletePlant,
    renderGardenPlants,
    refreshPlantsAndNotify,
    initPlantEvents,
  };
})();
