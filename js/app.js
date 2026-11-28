// PlantCare - Core Application Controller, Routing, Scanner, Garden, Calendar & AI Botanist

document.addEventListener('DOMContentLoaded', () => {
  const API_BASE = window.PlantCareAPI?.API_BASE_URL || 'http://127.0.0.1:8000';
  const DIAGNOSIS_API_URL = `${API_BASE}/api/diagnosis/analyze/`;
  const CHATBOT_ASK_URL = `${API_BASE}/api/chatbot/ask/`;
  const FALLBACK_PLANT_IMG =
    'https://images.unsplash.com/photo-1466781783364-36c955e42a7f?auto=format&fit=crop&w=800&q=80';

  const STORAGE_KEYS = {
    garden: 'plantcare_my_garden',
    bookmarks: 'plantcare_bookmarks',
    reminders: 'plantcare_local_reminders',
    chat: 'plantcare_chat_history',
  };

  const state = {
    currentView: 'home',
    searchQuery: '',
    selectedCategory: 'All',
    selectedDifficulty: 'All',
    selectedSunlight: 'All',
    selectedWatering: 'All',
    gardenSearch: '',
    gardenHealthFilter: 'All',
    myGarden: loadJsonStorage(STORAGE_KEYS.garden, []),
    localReminders: loadJsonStorage(STORAGE_KEYS.reminders, []),
    backendPlants: [],
    backendReminders: [],
    chatMessages: loadJsonStorage(STORAGE_KEYS.chat, []),
    savedBookmarks: new Set(loadJsonStorage(STORAGE_KEYS.bookmarks, [])),
    activeScanSample: null,
    uploadedFile: null,
    isScanning: false,
    isChatLoading: false,
    cameraStream: null,
    activeDetailPlantId: null,
    editingLocalPlantId: null,
  };

  // ----------------------------------------------------
  // Utilities & XSS-Safe Helpers
  // ----------------------------------------------------
  function loadJsonStorage(key, fallback) {
    try {
      const raw = localStorage.getItem(key);
      return raw ? JSON.parse(raw) : fallback;
    } catch {
      return fallback;
    }
  }

  function saveJsonStorage(key, value) {
    localStorage.setItem(key, JSON.stringify(value));
  }

  function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text ?? '';
    return div.innerHTML;
  }

  function formatSafeMarkdown(text) {
    const escaped = escapeHtml(text);
    return escaped
      .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
      .replace(/\*(.*?)\*/g, '<em>$1</em>')
      .replace(/\n/g, '<br>');
  }

  function isUserLoggedIn() {
    return Boolean(window.PlantCareAPI && window.PlantCareAPI.isAuthenticated());
  }

  function showToast(message, icon = '🌱') {
    let container = document.getElementById('toastContainer');
    if (!container) {
      container = document.createElement('div');
      container.id = 'toastContainer';
      container.className = 'toast-container';
      document.body.appendChild(container);
    }
    const toast = document.createElement('div');
    toast.className = 'toast';
    toast.innerHTML = `<span>${escapeHtml(icon)}</span> <span>${escapeHtml(message)}</span>`;
    container.appendChild(toast);

    setTimeout(() => {
      toast.style.opacity = '0';
      toast.style.transform = 'translateY(10px)';
      toast.style.transition = 'all 0.3s ease';
      setTimeout(() => toast.remove(), 300);
    }, 3200);
  }

  function daysUntil(isoDate) {
    if (!isoDate) return 0;
    const diffMs = new Date(isoDate).getTime() - Date.now();
    return Math.ceil(diffMs / (1000 * 60 * 60 * 24));
  }

  // ----------------------------------------------------
  // View Router (Dedicated Pages)
  // ----------------------------------------------------
  const VALID_VIEWS = new Set([
    'home',
    'encyclopedia',
    'scanner',
    'garden',
    'calendar',
    'botanist',
    'settings',
  ]);

  function navigateTo(viewName, { updateHash = true } = {}) {
    const target = VALID_VIEWS.has(viewName) ? viewName : 'home';
    state.currentView = target;

    document.querySelectorAll('.app-view').forEach((sec) => {
      sec.classList.toggle('active', sec.getAttribute('data-view') === target);
    });

    document.querySelectorAll('.nav-link[data-route]').forEach((link) => {
      link.classList.toggle('active', link.getAttribute('data-route') === target);
    });

    const navLinks = document.getElementById('navLinks');
    if (navLinks) navLinks.classList.remove('open');

    if (updateHash && window.location.hash !== `#${target}`) {
      history.replaceState(null, '', `#${target}`);
    }

    if (target === 'home') renderHomeDashboard();
    if (target === 'garden') renderMyGarden();
    if (target === 'calendar') renderCareCalendar();
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  document.addEventListener('click', (e) => {
    const routeEl = e.target.closest('[data-route], [data-nav-target]');
    if (!routeEl) return;
    const target = routeEl.getAttribute('data-route') || routeEl.getAttribute('data-nav-target');
    if (target && VALID_VIEWS.has(target)) {
      e.preventDefault();
      navigateTo(target);
    }
  });

  window.addEventListener('hashchange', () => {
    const hash = window.location.hash.replace('#', '').trim();
    if (VALID_VIEWS.has(hash)) {
      navigateTo(hash, { updateHash: false });
    }
  });

  const mobileToggle = document.getElementById('mobileMenuToggle');
  const navLinksEl = document.getElementById('navLinks');
  if (mobileToggle && navLinksEl) {
    mobileToggle.addEventListener('click', () => navLinksEl.classList.toggle('open'));
    document.addEventListener('click', (e) => {
      if (navLinksEl.classList.contains('open')) {
        if (!navLinksEl.contains(e.target) && !mobileToggle.contains(e.target)) {
          navLinksEl.classList.remove('open');
        }
      }
    });
  }

  // ----------------------------------------------------
  // Active Data Accessors (Backend when authenticated, Local when guest)
  // ----------------------------------------------------
  function getActiveGardenPlants() {
    if (isUserLoggedIn()) {
      return state.backendPlants.map((p) => ({
        id: String(p.id),
        isBackend: true,
        plantName: p.plant_name,
        scientificName: p.scientific_name || '',
        plantType: p.plant_type || 'General',
        location: p.location || 'Unspecified',
        healthStatus: p.health_status || 'unknown',
        image: window.PlantCareAPI.resolveMediaUrl(p.plant_image) || FALLBACK_PLANT_IMG,
        waterFrequencyDays: 7,
        daysUntilWater: p.health_status === 'unhealthy' || p.health_status === 'critical' ? 0 : 4,
        streakDays: 1,
        careHistory: [],
        dateAdded: p.date_added,
      }));
    }
    return state.myGarden;
  }

  function getActiveReminders() {
    if (isUserLoggedIn()) {
      return state.backendReminders;
    }
    return state.localReminders;
  }

  // ----------------------------------------------------
  // View 1: Home Dashboard (Real Computed Stats)
  // ----------------------------------------------------
  function renderHomeDashboard() {
    const plants = getActiveGardenPlants();
    const reminders = getActiveReminders();
    const now = Date.now();

    const totalPlants = plants.length;
    const attentionPlants = plants.filter(
      (p) =>
        (typeof p.daysUntilWater === 'number' && p.daysUntilWater <= 0) ||
        p.healthStatus === 'unhealthy' ||
        p.healthStatus === 'critical'
    ).length;

    const upcomingTasks = reminders.filter(
      (r) => !r.is_completed && new Date(r.reminder_date).getTime() >= now
    ).length;

    const bestStreak = plants.reduce((max, p) => Math.max(max, p.streakDays || 0), 0);

    const setElText = (id, val) => {
      const el = document.getElementById(id);
      if (el) el.textContent = val;
    };

    setElText('statTotalPlants', String(totalPlants));
    setElText('statAttentionPlants', String(attentionPlants));
    setElText('statUpcomingTasks', String(upcomingTasks));
    setElText('statBestStreak', `${bestStreak}d`);
    setElText(
      'heroGardenHealthPill',
      totalPlants === 0
        ? 'No Plants Tracked Yet'
        : attentionPlants > 0
          ? `${attentionPlants} Need Attention`
          : 'All Plants Healthy'
    );

    const recentEl = document.getElementById('homeRecentPlantsList');
    if (recentEl) {
      if (plants.length === 0) {
        recentEl.innerHTML = `<p style="color:var(--text-muted); font-size:0.88rem;">Your garden is empty. Add plants from the Encyclopedia or My Garden.</p>`;
      } else {
        recentEl.innerHTML = plants
          .slice(0, 4)
          .map(
            (p) => `
          <div class="home-list-item">
            <div>
              <strong>${escapeHtml(p.nickname || p.plantName)}</strong>
              <div style="font-size:0.78rem; color:var(--text-muted);">${escapeHtml(p.location || 'Garden')}</div>
            </div>
            <button type="button" class="btn-glass btn-leaf-sm" data-nav-target="garden">View</button>
          </div>`
          )
          .join('');
      }
    }

    const upcomingEl = document.getElementById('homeUpcomingCareList');
    if (upcomingEl) {
      const pending = reminders
        .filter((r) => !r.is_completed)
        .sort((a, b) => new Date(a.reminder_date) - new Date(b.reminder_date))
        .slice(0, 4);

      if (pending.length === 0) {
        upcomingEl.innerHTML = `<p style="color:var(--text-muted); font-size:0.88rem;">No pending care tasks. Schedule watering or fertilizing in Care Calendar.</p>`;
      } else {
        upcomingEl.innerHTML = pending
          .map(
            (r) => `
          <div class="home-list-item">
            <div>
              <strong>${escapeHtml(r.title)}</strong>
              <div style="font-size:0.78rem; color:var(--text-muted);">${escapeHtml(r.plant_name || 'Plant')} • ${new Date(r.reminder_date).toLocaleDateString()}</div>
            </div>
            <span class="pc-type-pill">${escapeHtml(r.reminder_type)}</span>
          </div>`
          )
          .join('');
      }
    }

    const recEl = document.getElementById('homeRecommendedPlantsList');
    if (recEl) {
      recEl.innerHTML = PLANT_DATABASE.slice(0, 3)
        .map(
          (p) => `
        <div class="home-list-item">
          <div>
            <strong>${escapeHtml(p.name)}</strong>
            <div style="font-size:0.78rem; color:var(--text-muted);">${escapeHtml(p.light)} • Every ${p.waterFrequencyDays}d</div>
          </div>
          <button type="button" class="btn-glass btn-leaf-sm" data-home-view-plant="${p.id}">Details</button>
        </div>`
        )
        .join('');

      recEl.querySelectorAll('[data-home-view-plant]').forEach((btn) => {
        btn.addEventListener('click', () => {
          openPlantModal(btn.getAttribute('data-home-view-plant'));
        });
      });
    }
  }

  // ----------------------------------------------------
  // View 2: Plant Encyclopedia & Multi-Filters
  // ----------------------------------------------------
  const plantGridEl = document.getElementById('plantGrid');
  const heroSearchInput = document.getElementById('heroSearchInput');
  const heroSearchBtn = document.getElementById('heroSearchBtn');
  const gallerySearchInput = document.getElementById('gallerySearchInput');
  const categoryTabsEl = document.getElementById('categoryTabs');
  const filterDifficultyEl = document.getElementById('filterDifficulty');
  const filterSunlightEl = document.getElementById('filterSunlight');
  const filterWateringEl = document.getElementById('filterWatering');
  const resetFiltersBtn = document.getElementById('resetEncyclopediaFiltersBtn');

  function renderPlantGallery() {
    if (!plantGridEl) return;

    const query = state.searchQuery.trim().toLowerCase();
    const filtered = PLANT_DATABASE.filter((plant) => {
      const matchesSearch =
        !query ||
        plant.name.toLowerCase().includes(query) ||
        plant.scientificName.toLowerCase().includes(query) ||
        plant.description.toLowerCase().includes(query);

      let matchesCategory = true;
      if (state.selectedCategory === 'Favorites') {
        matchesCategory = state.savedBookmarks.has(plant.id);
      } else if (state.selectedCategory === 'Pet Friendly') {
        matchesCategory = Boolean(plant.petFriendly);
      } else if (state.selectedCategory !== 'All') {
        matchesCategory = plant.category.toLowerCase() === state.selectedCategory.toLowerCase();
      }

      const matchesDifficulty =
        state.selectedDifficulty === 'All' || plant.difficulty === state.selectedDifficulty;

      const matchesSunlight =
        state.selectedSunlight === 'All' || plant.sunlightGroup === state.selectedSunlight;

      let matchesWatering = true;
      if (state.selectedWatering === 'frequent') matchesWatering = plant.waterFrequencyDays <= 4;
      if (state.selectedWatering === 'moderate')
        matchesWatering = plant.waterFrequencyDays >= 5 && plant.waterFrequencyDays <= 10;
      if (state.selectedWatering === 'sparse') matchesWatering = plant.waterFrequencyDays >= 11;

      return matchesSearch && matchesCategory && matchesDifficulty && matchesSunlight && matchesWatering;
    });

    if (filtered.length === 0) {
      plantGridEl.innerHTML = `
        <div style="grid-column: 1 / -1; text-align: center; padding: 40px 20px; color: var(--text-muted);">
          <i class="fa-solid fa-leaf" style="font-size: 2.5rem; color: var(--leaf-green-400); margin-bottom: 12px; display: block;"></i>
          <h3>No matching plants found</h3>
          <p style="margin-top: 6px;">Try clearing your search query or adjusting the category, sunlight, and watering filters.</p>
        </div>
      `;
      return;
    }

    const activePlants = getActiveGardenPlants();

    plantGridEl.innerHTML = filtered
      .map((plant) => {
        const isSaved = state.savedBookmarks.has(plant.id);
        const isInGarden = activePlants.some(
          (g) => g.plantId === plant.id || g.plantName.toLowerCase() === plant.name.toLowerCase()
        );

        return `
        <article class="glass-card plant-card" data-plant-id="${plant.id}">
          <div class="plant-card-media">
            <img src="${plant.image}" alt="${escapeHtml(plant.name)}" loading="lazy">
            <span class="plant-badge-top">${escapeHtml(plant.badge)}</span>
            <button type="button" class="plant-bookmark-btn ${isSaved ? 'saved' : ''}" data-action="bookmark" data-id="${plant.id}" aria-label="Toggle favorite">
              <i class="${isSaved ? 'fa-solid' : 'fa-regular'} fa-heart"></i>
            </button>
          </div>
          <div class="plant-card-body">
            <div class="plant-title-row">
              <h3>${escapeHtml(plant.name)}</h3>
              <div class="plant-scientific">${escapeHtml(plant.scientificName)}</div>
            </div>
            <div class="plant-tags">
              <span class="plant-tag-pill"><i class="fa-solid fa-droplet"></i> ${plant.waterFrequencyDays}d</span>
              <span class="plant-tag-pill"><i class="fa-solid fa-sun"></i> ${escapeHtml(plant.light)}</span>
              ${plant.petFriendly ? '<span class="plant-tag-pill" style="color:#27ae60"><i class="fa-solid fa-paw"></i> Pet Safe</span>' : ''}
            </div>
            <div class="plant-meta-specs">
              <div class="spec-item"><i class="fa-solid fa-gauge-simple"></i> Care: <strong>${escapeHtml(plant.difficulty)}</strong></div>
              <div class="spec-item"><i class="fa-solid fa-seedling"></i> Family: <strong>${escapeHtml(plant.family)}</strong></div>
            </div>
            <div class="plant-card-actions">
              <button type="button" class="btn-leaf btn-leaf-sm" data-action="addToGarden" data-id="${plant.id}">
                <i class="fa-solid ${isInGarden ? 'fa-check' : 'fa-plus'}"></i>
                ${isInGarden ? 'In Garden' : 'Add to Garden'}
              </button>
              <button type="button" class="btn-glass" data-action="viewDetails" data-id="${plant.id}" title="View full details">
                <i class="fa-solid fa-circle-info"></i>
              </button>
              <button type="button" class="btn-glass" data-action="askAiAbout" data-name="${escapeHtml(plant.name)}" title="Ask AI Botanist">
                <i class="fa-solid fa-wand-magic-sparkles" style="color: #ffbe3b"></i>
              </button>
            </div>
          </div>
        </article>`;
      })
      .join('');
  }

  function syncCategoryTabUI() {
    document.querySelectorAll('#categoryTabs .tab-btn').forEach((b) => {
      b.classList.toggle('active', b.getAttribute('data-category') === state.selectedCategory);
    });
  }

  if (heroSearchInput) {
    heroSearchInput.addEventListener('input', (e) => {
      state.searchQuery = e.target.value;
      if (gallerySearchInput) gallerySearchInput.value = state.searchQuery;
      renderPlantGallery();
    });
    heroSearchInput.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') navigateTo('encyclopedia');
    });
  }

  if (heroSearchBtn) {
    heroSearchBtn.addEventListener('click', () => navigateTo('encyclopedia'));
  }

  if (gallerySearchInput) {
    gallerySearchInput.addEventListener('input', (e) => {
      state.searchQuery = e.target.value;
      if (heroSearchInput) heroSearchInput.value = state.searchQuery;
      renderPlantGallery();
    });
  }

  if (categoryTabsEl) {
    categoryTabsEl.addEventListener('click', (e) => {
      const btn = e.target.closest('.tab-btn');
      if (!btn) return;
      state.selectedCategory = btn.getAttribute('data-category');
      syncCategoryTabUI();
      renderPlantGallery();
    });
  }

  document.querySelectorAll('.hero-quick-chips .filter-chip').forEach((chip) => {
    chip.addEventListener('click', () => {
      state.selectedCategory = chip.getAttribute('data-filter');
      syncCategoryTabUI();
      renderPlantGallery();
      navigateTo('encyclopedia');
    });
  });

  if (filterDifficultyEl) {
    filterDifficultyEl.addEventListener('change', (e) => {
      state.selectedDifficulty = e.target.value;
      renderPlantGallery();
    });
  }
  if (filterSunlightEl) {
    filterSunlightEl.addEventListener('change', (e) => {
      state.selectedSunlight = e.target.value;
      renderPlantGallery();
    });
  }
  if (filterWateringEl) {
    filterWateringEl.addEventListener('change', (e) => {
      state.selectedWatering = e.target.value;
      renderPlantGallery();
    });
  }
  if (resetFiltersBtn) {
    resetFiltersBtn.addEventListener('click', () => {
      state.searchQuery = '';
      state.selectedCategory = 'All';
      state.selectedDifficulty = 'All';
      state.selectedSunlight = 'All';
      state.selectedWatering = 'All';
      if (heroSearchInput) heroSearchInput.value = '';
      if (gallerySearchInput) gallerySearchInput.value = '';
      if (filterDifficultyEl) filterDifficultyEl.value = 'All';
      if (filterSunlightEl) filterSunlightEl.value = 'All';
      if (filterWateringEl) filterWateringEl.value = 'All';
      syncCategoryTabUI();
      renderPlantGallery();
    });
  }

  // Encyclopedia Card Actions
  if (plantGridEl) {
    plantGridEl.addEventListener('click', async (e) => {
      const bookmarkBtn = e.target.closest('[data-action="bookmark"]');
      const detailsBtn = e.target.closest('[data-action="viewDetails"]');
      const addGardenBtn = e.target.closest('[data-action="addToGarden"]');
      const askAiBtn = e.target.closest('[data-action="askAiAbout"]');

      if (bookmarkBtn) {
        const id = bookmarkBtn.getAttribute('data-id');
        if (state.savedBookmarks.has(id)) {
          state.savedBookmarks.delete(id);
          showToast('Removed from favorites', '💔');
        } else {
          state.savedBookmarks.add(id);
          showToast('Saved to favorites!', '❤️');
        }
        saveJsonStorage(STORAGE_KEYS.bookmarks, [...state.savedBookmarks]);
        renderPlantGallery();
        return;
      }

      if (detailsBtn) {
        openPlantModal(detailsBtn.getAttribute('data-id'));
        return;
      }

      if (addGardenBtn) {
        const plant = PLANT_DATABASE.find((p) => p.id === addGardenBtn.getAttribute('data-id'));
        if (plant) await addPlantToGarden(plant);
        return;
      }

      if (askAiBtn) {
        const name = askAiBtn.getAttribute('data-name');
        navigateTo('botanist');
        handleUserChatMessage(`Give me practical care tips for growing ${name}.`);
      }
    });
  }

  // Encyclopedia Modal
  const plantModal = document.getElementById('plantDetailModal');
  let activeModalPlantId = null;

  function openPlantModal(plantId) {
    const plant = PLANT_DATABASE.find((p) => p.id === plantId);
    if (!plant || !plantModal) return;
    activeModalPlantId = plant.id;

    document.getElementById('modalImg').src = plant.image;
    document.getElementById('modalName').textContent = plant.name;
    document.getElementById('modalScientific').textContent = plant.scientificName;
    document.getElementById('modalFamily').textContent = `Family: ${plant.family}`;
    document.getElementById('modalBadge').textContent = plant.badge;
    document.getElementById('modalDesc').textContent = plant.description;
    document.getElementById('modalWater').textContent = `Every ${plant.waterFrequencyDays}d (${plant.waterAmount})`;
    document.getElementById('modalLight').textContent = plant.light;
    document.getElementById('modalDifficulty').textContent = plant.difficulty;
    document.getElementById('modalHumidity').textContent = plant.humidity;
    document.getElementById('modalTemp').textContent = plant.temperature;
    document.getElementById('modalPet').textContent = plant.petFriendly ? 'Pet Safe 🐾' : 'Toxic if ingested ⚠️';
    document.getElementById('modalSoil').textContent = plant.soil;
    document.getElementById('modalFertilizer').textContent = plant.fertilizer;
    document.getElementById('modalCareTip').textContent = `${plant.propagation}. ${plant.careTip}`;
    document.getElementById('modalProblems').textContent = plant.commonProblems;
    plantModal.classList.add('active');
  }

  function closePlantModal() {
    if (plantModal) plantModal.classList.remove('active');
    activeModalPlantId = null;
  }

  document.getElementById('modalCloseBtn')?.addEventListener('click', closePlantModal);
  plantModal?.addEventListener('click', (e) => {
    if (e.target === plantModal) closePlantModal();
  });
  document.getElementById('modalAddGardenBtn')?.addEventListener('click', async () => {
    const plant = PLANT_DATABASE.find((p) => p.id === activeModalPlantId);
    if (plant) await addPlantToGarden(plant);
    closePlantModal();
  });
  document.getElementById('modalAskAiBtn')?.addEventListener('click', () => {
    const plant = PLANT_DATABASE.find((p) => p.id === activeModalPlantId);
    closePlantModal();
    if (plant) {
      navigateTo('botanist');
      handleUserChatMessage(`How should I care for ${plant.name} (${plant.scientificName})?`);
    }
  });

  // ----------------------------------------------------
  // View 3: AI Plant Scanner (Upload, Camera, Replace, Real HF Vision)
  // ----------------------------------------------------
  const scanImgEl = document.getElementById('scanViewportImg');
  const cameraVideoEl = document.getElementById('cameraPreviewVideo');
  const cameraControlsRow = document.getElementById('cameraControlsRow');
  const openCameraBtn = document.getElementById('openCameraBtn');
  const capturePhotoBtn = document.getElementById('capturePhotoBtn');
  const closeCameraBtn = document.getElementById('closeCameraBtn');
  const clearScanImageBtn = document.getElementById('clearScanImageBtn');
  const scanLaserEl = document.getElementById('scanLaser');
  const fileUploadInput = document.getElementById('plantPhotoUpload');
  const triggerScanBtn = document.getElementById('triggerScanBtn');
  const sampleThumbsContainer = document.getElementById('sampleThumbsContainer');

  const INITIAL_SCANNER_STATE = {
    id: null,
    isAnalyzed: false,
    title: 'Ready to Scan',
    image: 'https://images.unsplash.com/photo-1614594975525-e45190c55d0b?auto=format&fit=crop&w=800&q=80',
    plantName: 'Upload or Capture a Photo',
    confidence: 'Ready',
    uncertaintyNote: 'Visual AI analysis is assistive. Root-level issues, soil pathogens, and microscopic pests cannot be confirmed from a photo alone.',
    healthStatus: 'Awaiting Plant Photo 🌿',
    healthScore: 0,
    diagnosis: 'Select or capture a clear photo of leaves, stems, flowers, or fruit above. The hosted Hugging Face Vision model will analyze species, visual health, and care advice.',
    symptoms: 'No photo selected yet.',
    qwenAdvice: [
      'Take photos in bright, natural light without harsh shadows.',
      'Frame both affected leaves and healthy parts for contrast.',
      'Ensure the subject is in focus before analyzing.'
    ]
  };

  function resetScannerToReadyState() {
    stopCamera();
    state.uploadedFile = null;
    if (fileUploadInput) fileUploadInput.value = '';
    if (clearScanImageBtn) clearScanImageBtn.style.display = 'none';
    document.querySelectorAll('.sample-thumb-btn').forEach((b) => b.classList.remove('active'));
    applyScanData(INITIAL_SCANNER_STATE);
  }

  function renderSampleThumbnails() {
    if (!sampleThumbsContainer) return;
    sampleThumbsContainer.innerHTML = SCAN_SAMPLES.map(
      (sample) => `
      <button type="button" class="sample-thumb-btn" data-sample-id="${sample.id}">
        <img src="${sample.image}" alt="${escapeHtml(sample.title)}">
        <span>${escapeHtml(sample.title)}</span>
      </button>`
    ).join('');
  }

  function applyScanData(sampleData) {
    if (!sampleData) return;
    state.activeScanSample = sampleData;

    if (scanImgEl && sampleData.image) scanImgEl.src = sampleData.image;
    document.getElementById('scanPlantName').textContent = sampleData.plantName || 'Unknown Species';
    document.getElementById('scanConfidence').textContent = sampleData.confidence || '—';
    document.getElementById('scanHealthStatus').textContent = sampleData.healthStatus || 'Assessed';
    document.getElementById('scanDiagnosis').textContent = sampleData.diagnosis || '';
    document.getElementById('scanSymptoms').textContent = sampleData.symptoms
      ? `Observed symptoms: ${sampleData.symptoms}`
      : '';

    const uncertaintyEl = document.getElementById('scanUncertaintyNote');
    if (uncertaintyEl && sampleData.uncertaintyNote) {
      uncertaintyEl.innerHTML = `<i class="fa-solid fa-circle-info"></i> <strong>Scientific Limitation:</strong> ${escapeHtml(sampleData.uncertaintyNote)}`;
    }

    const adviceList = document.getElementById('scanAdviceList');
    if (adviceList) {
      adviceList.innerHTML = (sampleData.qwenAdvice || [])
        .map((a) => `<li><i class="fa-solid fa-circle-check"></i> <span>${escapeHtml(a)}</span></li>`)
        .join('');
    }
  }

  function setScannerBusy(busy) {
    state.isScanning = busy;
    scanLaserEl?.classList.toggle('scanning', busy);
    if (triggerScanBtn) {
      triggerScanBtn.disabled = busy;
      triggerScanBtn.innerHTML = busy
        ? `<i class="fa-solid fa-spinner fa-spin"></i> Analyzing Photo...`
        : `<i class="fa-solid fa-magnifying-glass-chart"></i> Analyze Photo`;
    }
  }

  async function analyzeUploadedImage(file, previewUrl) {
    if (!file || state.isScanning) return;
    setScannerBusy(true);

    const formData = new FormData();
    formData.append('image', file);

    try {
      const response = await fetch(DIAGNOSIS_API_URL, {
        method: 'POST',
        body: formData,
      });
      const data = await response.json().catch(() => ({}));

      if (!response.ok) {
        throw new Error(data.detail || data.image?.[0] || `Server error (${response.status})`);
      }

      applyScanData({
        id: 'ai-' + Date.now(),
        isAnalyzed: true,
        title: file.name,
        image: previewUrl,
        plantName: data.plant_name,
        confidence: data.confidence || 'Moderate',
        uncertaintyNote: data.uncertainty_note,
        healthStatus: data.health_status || 'Assessed 🌿',
        healthScore: data.health_score ?? 85,
        diagnosis: data.diagnosis || 'Visual analysis complete.',
        symptoms: data.symptoms || '',
        qwenAdvice: Array.isArray(data.qwen_advice) ? data.qwen_advice : [],
      });
      showToast(`Identified: ${data.plant_name}`, '✨');
    } catch (error) {
      const message =
        error.message === 'Failed to fetch'
          ? 'Cannot reach the PlantCare backend at http://127.0.0.1:8000. Start the Django server and configure HF_TOKEN in backend/.env.'
          : error.message;

      applyScanData({
        id: 'error-' + Date.now(),
        title: file.name,
        image: previewUrl,
        plantName: 'Analysis Unavailable',
        confidence: 'Failed',
        uncertaintyNote: 'No diagnosis was generated because the hosted Vision AI request failed.',
        healthStatus: 'AI Request Failed ⚠️',
        healthScore: 0,
        diagnosis: message,
        symptoms: '',
        qwenAdvice: [
          'Verify the Django backend is running on http://127.0.0.1:8000.',
          'Verify HF_TOKEN is configured in backend/.env with Inference Providers permission.',
        ],
      });
      showToast(message, '⚠️');
    } finally {
      setScannerBusy(false);
    }
  }

  function stopCamera() {
    if (state.cameraStream) {
      state.cameraStream.getTracks().forEach((t) => t.stop());
      state.cameraStream = null;
    }
    if (cameraVideoEl) {
      cameraVideoEl.srcObject = null;
      cameraVideoEl.classList.remove('active');
    }
    if (scanImgEl) scanImgEl.style.display = 'block';
    if (cameraControlsRow) cameraControlsRow.style.display = 'none';
  }

  openCameraBtn?.addEventListener('click', async () => {
    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      showToast('Camera capture is not supported in this browser. Please upload an image instead.', '⚠️');
      return;
    }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'environment' },
      });
      state.cameraStream = stream;
      cameraVideoEl.srcObject = stream;
      cameraVideoEl.classList.add('active');
      scanImgEl.style.display = 'none';
      cameraControlsRow.style.display = 'flex';
    } catch {
      showToast('Camera permission denied or unavailable. You can still upload a photo.', '⚠️');
    }
  });

  closeCameraBtn?.addEventListener('click', stopCamera);

  capturePhotoBtn?.addEventListener('click', () => {
    if (!cameraVideoEl || !state.cameraStream) return;
    const canvas = document.createElement('canvas');
    canvas.width = cameraVideoEl.videoWidth || 800;
    canvas.height = cameraVideoEl.videoHeight || 600;
    canvas.getContext('2d').drawImage(cameraVideoEl, 0, 0, canvas.width, canvas.height);

    canvas.toBlob(
      (blob) => {
        if (!blob) return;
        const file = new File([blob], `camera-scan-${Date.now()}.jpg`, { type: 'image/jpeg' });
        const previewUrl = canvas.toDataURL('image/jpeg', 0.9);
        state.uploadedFile = file;
        stopCamera();
        scanImgEl.src = previewUrl;
        if (clearScanImageBtn) clearScanImageBtn.style.display = 'inline-flex';
        analyzeUploadedImage(file, previewUrl);
      },
      'image/jpeg',
      0.9
    );
  });

  fileUploadInput?.addEventListener('change', (e) => {
    const file = e.target.files && e.target.files[0];
    if (!file) return;
    stopCamera();
    state.uploadedFile = file;
    if (clearScanImageBtn) clearScanImageBtn.style.display = 'inline-flex';
    document.querySelectorAll('.sample-thumb-btn').forEach((b) => b.classList.remove('active'));

    const reader = new FileReader();
    reader.onload = (ev) => {
      scanImgEl.src = ev.target.result;
      analyzeUploadedImage(file, ev.target.result);
    };
    reader.readAsDataURL(file);
  });

  clearScanImageBtn?.addEventListener('click', () => {
    resetScannerToReadyState();
  });

  sampleThumbsContainer?.addEventListener('click', (e) => {
    const btn = e.target.closest('.sample-thumb-btn');
    if (!btn) return;
    const found = SCAN_SAMPLES.find((s) => s.id === btn.getAttribute('data-sample-id'));
    if (!found) return;
    stopCamera();
    state.uploadedFile = null;
    if (clearScanImageBtn) clearScanImageBtn.style.display = 'inline-flex';
    document.querySelectorAll('.sample-thumb-btn').forEach((b) => b.classList.remove('active'));
    btn.classList.add('active');
    applyScanData({
      ...found,
      isAnalyzed: false,
      confidence: 'Reference Sample (Offline)',
      uncertaintyNote: 'Pre-loaded reference preview. Upload or capture your own photo above to execute live Hugging Face Vision AI.',
    });
    showToast('Loaded reference sample. Upload your own photo to run live Vision AI.', 'ℹ️');
  });

  triggerScanBtn?.addEventListener('click', () => {
    if (state.uploadedFile) {
      analyzeUploadedImage(state.uploadedFile, scanImgEl.src);
    } else {
      showToast('Please select or capture a plant photo to analyze.', '📷');
      fileUploadInput?.click();
    }
  });

  document.getElementById('addScannedToGardenBtn')?.addEventListener('click', async () => {
    const sample = state.activeScanSample;
    if (!sample || !sample.isAnalyzed || sample.plantName === 'Analysis Unavailable' || !sample.plantName) {
      showToast('Please upload and analyze a real plant photo first.', '⚠️');
      return;
    }
    const cleanName = sample.plantName.split('(')[0].trim();
    const sciName = sample.plantName.includes('(') ? sample.plantName.split('(')[1].replace(')', '').trim() : '';
    await addPlantToGarden({
      id: 'scanned-' + Date.now(),
      name: cleanName,
      scientificName: sciName,
      category: 'Scanned',
      image: sample.image,
      waterFrequencyDays: 7,
      healthScore: sample.healthScore || 85,
    });
    navigateTo('garden');
  });

  document.getElementById('askBotanistFromScanBtn')?.addEventListener('click', () => {
    const plantName = document.getElementById('scanPlantName')?.textContent || 'my plant';
    const diag = document.getElementById('scanDiagnosis')?.textContent || '';
    navigateTo('botanist');
    handleUserChatMessage(`I scanned ${plantName}. Visual assessment: "${diag}". What next steps do you recommend?`);
  });

  // ----------------------------------------------------
  // View 4: My Garden (Dual-Mode: Backend + Local-First) & Plant Details
  // ----------------------------------------------------
  const gardenGridEl = document.getElementById('gardenGrid');
  const gardenSearchInput = document.getElementById('gardenSearchInput');
  const gardenHealthFilter = document.getElementById('gardenHealthFilter');

  async function addPlantToGarden(plant) {
    if (isUserLoggedIn() && window.PlantCarePlants) {
      try {
        const fd = new FormData();
        fd.append('plant_name', plant.name);
        if (plant.scientificName) fd.append('scientific_name', plant.scientificName);
        if (plant.category) fd.append('plant_type', plant.category);
        fd.append('location', 'Home Garden');
        fd.append('health_status', 'healthy');
        await window.PlantCarePlants.createPlant(fd);
        state.backendPlants = await window.PlantCarePlants.fetchPlants();
        renderMyGarden();
        renderPlantGallery();
        renderHomeDashboard();
        showToast(`Saved ${plant.name} to your account garden!`, '🪴');
      } catch (err) {
        showToast(err.message, '⚠️');
      }
      return;
    }

    const freq = plant.waterFrequencyDays || 7;
    const now = new Date();
    const nextDue = new Date(now.getTime() + freq * 24 * 60 * 60 * 1000);
    const newItem = {
      id: 'mg-' + Date.now(),
      plantId: plant.id || 'custom-' + Date.now(),
      nickname: plant.name,
      plantName: plant.name,
      scientificName: plant.scientificName || '',
      plantType: plant.category || 'Garden',
      image: plant.image || FALLBACK_PLANT_IMG,
      location: 'Indoor / Patio',
      healthStatus: 'healthy',
      waterFrequencyDays: freq,
      lastWateredAt: now.toISOString(),
      nextWaterDueAt: nextDue.toISOString(),
      streakDays: 1,
      careHistory: [
        { type: 'added', date: now.toISOString(), notes: 'Added to My Garden' },
      ],
    };

    state.myGarden.unshift(newItem);
    saveJsonStorage(STORAGE_KEYS.garden, state.myGarden);
    renderMyGarden();
    renderPlantGallery();
    renderHomeDashboard();
    populateReminderPlantSelects();
    showToast(`Added ${plant.name} to My Garden!`, '🪴');
  }

  function renderMyGarden() {
    if (!gardenGridEl) return;

    if (isUserLoggedIn() && window.PlantCarePlants) {
      state.backendPlants = window.PlantCarePlants.getPlants();
    }

    const plants = getActiveGardenPlants();
    const badge = document.getElementById('gardenCountBadge');
    const streakEl = document.getElementById('currentStreakCount');
    if (badge) badge.textContent = `${plants.length} Plant${plants.length === 1 ? '' : 's'}`;
    if (streakEl) {
      const topStreak = plants.reduce((m, p) => Math.max(m, p.streakDays || 0), 0);
      streakEl.textContent = `${topStreak}-Day Streak`;
    }

    const q = state.gardenSearch.trim().toLowerCase();
    const filtered = plants.filter((p) => {
      const matchesQ =
        !q ||
        (p.nickname || p.plantName).toLowerCase().includes(q) ||
        (p.location || '').toLowerCase().includes(q);
      const needsWater = p.isBackend
        ? p.healthStatus === 'unhealthy' || p.healthStatus === 'critical'
        : daysUntil(p.nextWaterDueAt) <= 0;

      if (state.gardenHealthFilter === 'needs_water') return matchesQ && needsWater;
      if (state.gardenHealthFilter === 'healthy') return matchesQ && !needsWater;
      return matchesQ;
    });

    if (filtered.length === 0) {
      gardenGridEl.innerHTML = `
        <div style="grid-column: 1 / -1; text-align: center; padding: 40px 20px; background: rgba(255,255,255,0.25); border-radius: 20px; border: 1px dashed var(--leaf-green-400);">
          <i class="fa-solid fa-seedling" style="font-size: 2.2rem; color: var(--leaf-green-400); margin-bottom: 10px; display: block;"></i>
          <h3>${plants.length === 0 ? 'Your Garden is empty' : 'No plants match your filter'}</h3>
          <p style="color: var(--text-muted); margin-top: 6px;">Click "+ Add Plant" above or add species from the Plant Encyclopedia.</p>
        </div>`;
      return;
    }

    gardenGridEl.innerHTML = filtered
      .map((item) => {
        const remaining = item.isBackend ? item.daysUntilWater : daysUntil(item.nextWaterDueAt);
        const freq = item.waterFrequencyDays || 7;
        const pct = Math.max(8, Math.min(100, Math.round(((freq - Math.max(0, remaining)) / freq) * 100)));
        const waterLabel = remaining <= 0 ? 'Water Due Today' : `Water in ${remaining}d`;

        return `
        <div class="glass-card garden-plant-item" data-garden-id="${item.id}">
          <div class="garden-plant-thumb">
            <img src="${item.image || FALLBACK_PLANT_IMG}" alt="${escapeHtml(item.nickname || item.plantName)}">
          </div>
          <div class="garden-plant-details">
            <h4>${escapeHtml(item.nickname || item.plantName)}</h4>
            <div class="garden-location"><i class="fa-solid fa-location-dot"></i> ${escapeHtml(item.location || 'Garden')} • ${escapeHtml(item.healthStatus || 'healthy')}</div>
            <div class="water-status-bar">
              <div class="water-status-labels">
                <span>${waterLabel}</span>
                <span>Streak: ${item.streakDays || 1}d 🔥</span>
              </div>
              <div class="water-progress-bg">
                <div class="water-progress-fill" style="width: ${pct}%;"></div>
              </div>
            </div>
            <div class="garden-item-footer">
              <button type="button" class="action-water-btn" data-garden-action="water" data-id="${item.id}">
                <i class="fa-solid fa-droplet"></i> Water Now
              </button>
              <button type="button" class="btn-glass" style="padding:4px 10px; font-size:0.78rem;" data-garden-action="details" data-id="${item.id}">
                <i class="fa-solid fa-circle-info"></i> Details
              </button>
              <button type="button" class="btn-glass" style="padding:4px 10px; font-size:0.78rem; color:#ff7675;" data-garden-action="delete" data-id="${item.id}" aria-label="Remove plant">
                <i class="fa-solid fa-trash-can"></i>
              </button>
            </div>
          </div>
        </div>`;
      })
      .join('');
  }

  gardenSearchInput?.addEventListener('input', (e) => {
    state.gardenSearch = e.target.value;
    renderMyGarden();
  });
  gardenHealthFilter?.addEventListener('change', (e) => {
    state.gardenHealthFilter = e.target.value;
    renderMyGarden();
  });

  async function logGardenCare(plantId, careType = 'watering') {
    if (isUserLoggedIn() && window.PlantCarePlants) {
      await window.PlantCarePlants.createCareLog(Number(plantId), careType, `Logged ${careType} from PlantCare`);
      showToast(`Logged ${careType} to your account!`, '💧');
      return;
    }

    const item = state.myGarden.find((g) => g.id === plantId);
    if (!item) return;
    const now = new Date();
    if (careType === 'watering') {
      const freq = item.waterFrequencyDays || 7;
      item.lastWateredAt = now.toISOString();
      item.nextWaterDueAt = new Date(now.getTime() + freq * 24 * 60 * 60 * 1000).toISOString();
      item.streakDays = (item.streakDays || 0) + 1;
    }
    item.careHistory = item.careHistory || [];
    item.careHistory.unshift({
      type: careType,
      date: now.toISOString(),
      notes: `Logged ${careType}`,
    });
    saveJsonStorage(STORAGE_KEYS.garden, state.myGarden);
    renderMyGarden();
    renderHomeDashboard();
    showToast(`Logged ${careType} for ${item.nickname || item.plantName}!`, '💧');
  }

  gardenGridEl?.addEventListener('click', async (e) => {
    const btn = e.target.closest('[data-garden-action]');
    if (!btn) return;
    const action = btn.getAttribute('data-garden-action');
    const id = btn.getAttribute('data-id');

    if (action === 'water') {
      await logGardenCare(id, 'watering');
      return;
    }
    if (action === 'details') {
      openGardenPlantDetail(id);
      return;
    }
    if (action === 'delete') {
      if (isUserLoggedIn() && window.PlantCarePlants) {
        try {
          await window.PlantCarePlants.deletePlant(Number(id));
          state.backendPlants = await window.PlantCarePlants.fetchPlants();
          renderMyGarden();
          renderHomeDashboard();
          showToast('Plant deleted.', '🗑️');
        } catch (err) {
          showToast(err.message, '⚠️');
        }
      } else {
        state.myGarden = state.myGarden.filter((g) => g.id !== id);
        saveJsonStorage(STORAGE_KEYS.garden, state.myGarden);
        renderMyGarden();
        renderPlantGallery();
        renderHomeDashboard();
        populateReminderPlantSelects();
        showToast('Plant removed from garden.', '🗑️');
      }
    }
  });

  // Garden Plant Details Modal
  const gardenDetailModal = document.getElementById('gardenPlantDetailModal');

  async function openGardenPlantDetail(id) {
    const plant = getActiveGardenPlants().find((p) => p.id === id);
    if (!plant || !gardenDetailModal) return;
    state.activeDetailPlantId = id;

    document.getElementById('gardenDetailImg').src = plant.image || FALLBACK_PLANT_IMG;
    document.getElementById('gardenDetailName').textContent = plant.nickname || plant.plantName;
    document.getElementById('gardenDetailScientific').textContent = plant.scientificName || 'Garden Plant';
    document.getElementById('gardenDetailMeta').textContent = `Location: ${plant.location || 'Garden'} • Water every ${plant.waterFrequencyDays || 7} days • Status: ${plant.healthStatus || 'healthy'}`;

    const historyEl = document.getElementById('gardenDetailHistoryList');
    let history = plant.careHistory || [];

    if (isUserLoggedIn() && window.PlantCareAPI) {
      try {
        const logs = await window.PlantCareAPI.apiRequest(`/api/plants/care-logs/?plant=${id}`, { method: 'GET' });
        history = logs.map((l) => ({ type: l.care_type, date: l.care_date, notes: l.description }));
      } catch {
        history = [];
      }
    }

    historyEl.innerHTML = history.length
      ? history
          .slice(0, 15)
          .map(
            (h) => `
          <div class="care-history-entry">
            <strong style="text-transform:capitalize;">${escapeHtml(h.type)}</strong> — ${new Date(h.date).toLocaleString()}
            ${h.notes ? `<div style="color:var(--text-muted);">${escapeHtml(h.notes)}</div>` : ''}
          </div>`
          )
          .join('')
      : `<p style="color:var(--text-muted); font-size:0.85rem;">No care activities logged yet.</p>`;

    gardenDetailModal.classList.add('active');
  }

  document.getElementById('gardenDetailCloseBtn')?.addEventListener('click', () => {
    gardenDetailModal?.classList.remove('active');
  });
  gardenDetailModal?.addEventListener('click', (e) => {
    if (e.target === gardenDetailModal) gardenDetailModal.classList.remove('active');
  });
  document.getElementById('gardenDetailWaterBtn')?.addEventListener('click', async () => {
    if (state.activeDetailPlantId) {
      await logGardenCare(state.activeDetailPlantId, 'watering');
      openGardenPlantDetail(state.activeDetailPlantId);
    }
  });
  document.getElementById('gardenDetailFertilizeBtn')?.addEventListener('click', async () => {
    if (state.activeDetailPlantId) {
      await logGardenCare(state.activeDetailPlantId, 'fertilizing');
      openGardenPlantDetail(state.activeDetailPlantId);
    }
  });
  document.getElementById('gardenDetailEditBtn')?.addEventListener('click', () => {
    const id = state.activeDetailPlantId;
    gardenDetailModal?.classList.remove('active');
    if (isUserLoggedIn() && window.PlantCarePlants) {
      const p = window.PlantCarePlants.getPlants().find((x) => String(x.id) === id);
      if (p) window.PlantCarePlants.openPlantFormModal(p);
    } else {
      const p = state.myGarden.find((x) => x.id === id);
      if (p) openLocalPlantFormModal(p);
    }
  });

  // Guest Add / Edit Plant Modal
  const plantFormModal = document.getElementById('plantFormModal');
  const plantForm = document.getElementById('plantForm');

  function openLocalPlantFormModal(plant = null) {
    if (!plantFormModal || !plantForm) return;
    plantForm.reset();
    document.getElementById('plantFormErrorMsg').textContent = '';
    if (plant) {
      state.editingLocalPlantId = plant.id;
      document.getElementById('plantFormModalTitle').textContent = 'Edit Plant';
      document.getElementById('plantNameInput').value = plant.plantName || '';
      document.getElementById('plantScientificInput').value = plant.scientificName || '';
      document.getElementById('plantTypeInput').value = plant.plantType || '';
      document.getElementById('plantLocationInput').value = plant.location || '';
      document.getElementById('plantHealthStatusInput').value = plant.healthStatus || 'healthy';
      document.getElementById('plantWaterFreqInput').value = plant.waterFrequencyDays || 7;
    } else {
      state.editingLocalPlantId = null;
      document.getElementById('plantFormModalTitle').textContent = 'Add New Plant';
    }
    plantFormModal.classList.add('active');
  }

  document.getElementById('openAddPlantModalBtn')?.addEventListener('click', () => {
    if (isUserLoggedIn() && window.PlantCarePlants) {
      window.PlantCarePlants.openPlantFormModal(null);
    } else {
      openLocalPlantFormModal(null);
    }
  });

  document.getElementById('plantFormCloseBtn')?.addEventListener('click', () => {
    plantFormModal?.classList.remove('active');
  });

  plantForm?.addEventListener('submit', async (e) => {
    if (isUserLoggedIn()) return; // handled by js/plants.js
    e.preventDefault();
    e.stopImmediatePropagation();

    const name = document.getElementById('plantNameInput').value.trim();
    if (!name) return;
    const freq = Math.max(1, Number(document.getElementById('plantWaterFreqInput').value) || 7);
    const now = new Date();

    if (state.editingLocalPlantId) {
      const target = state.myGarden.find((p) => p.id === state.editingLocalPlantId);
      if (target) {
        target.plantName = name;
        target.nickname = name;
        target.scientificName = document.getElementById('plantScientificInput').value.trim();
        target.plantType = document.getElementById('plantTypeInput').value.trim() || 'Garden';
        target.location = document.getElementById('plantLocationInput').value.trim() || 'Garden';
        target.healthStatus = document.getElementById('plantHealthStatusInput').value;
        target.waterFrequencyDays = freq;
      }
      showToast('Plant updated!', '🌱');
    } else {
      state.myGarden.unshift({
        id: 'mg-' + Date.now(),
        plantId: 'custom-' + Date.now(),
        nickname: name,
        plantName: name,
        scientificName: document.getElementById('plantScientificInput').value.trim(),
        plantType: document.getElementById('plantTypeInput').value.trim() || 'Garden',
        image: FALLBACK_PLANT_IMG,
        location: document.getElementById('plantLocationInput').value.trim() || 'Garden',
        healthStatus: document.getElementById('plantHealthStatusInput').value,
        waterFrequencyDays: freq,
        lastWateredAt: now.toISOString(),
        nextWaterDueAt: new Date(now.getTime() + freq * 24 * 60 * 60 * 1000).toISOString(),
        streakDays: 1,
        careHistory: [{ type: 'added', date: now.toISOString(), notes: 'Added manually' }],
      });
      showToast(`${name} added to My Garden!`, '🪴');
    }

    saveJsonStorage(STORAGE_KEYS.garden, state.myGarden);
    plantFormModal.classList.remove('active');
    renderMyGarden();
    renderHomeDashboard();
    populateReminderPlantSelects();
  });

  // ----------------------------------------------------
  // View 5: Care Calendar & Browser Notifications
  // ----------------------------------------------------
  function populateReminderPlantSelects() {
    const plants = getActiveGardenPlants();
    const formSel = document.getElementById('reminderPlantSelect');
    const filterSel = document.getElementById('reminderFilterPlant');

    if (formSel) {
      formSel.innerHTML = plants.length
        ? plants.map((p) => `<option value="${escapeHtml(p.id)}">${escapeHtml(p.nickname || p.plantName)}</option>`).join('')
        : '<option value="">Add a plant to My Garden first</option>';
    }
    if (filterSel) {
      const prev = filterSel.value;
      filterSel.innerHTML =
        '<option value="">All Plants</option>' +
        plants.map((p) => `<option value="${escapeHtml(p.id)}">${escapeHtml(p.nickname || p.plantName)}</option>`).join('');
      filterSel.value = prev;
    }
  }

  function renderCareCalendar() {
    const overdueEl = document.getElementById('calendarOverdueList');
    const upcomingEl = document.getElementById('calendarUpcomingList');
    const completedEl = document.getElementById('calendarCompletedList');
    if (!overdueEl || !upcomingEl || !completedEl) return;

    const plantFilter = document.getElementById('reminderFilterPlant')?.value || '';
    const statusFilter = document.getElementById('reminderFilterStatus')?.value || '';

    let items = getActiveReminders();
    if (plantFilter) items = items.filter((r) => String(r.plant) === plantFilter);
    if (statusFilter === 'true') items = items.filter((r) => r.is_completed);
    if (statusFilter === 'false') items = items.filter((r) => !r.is_completed);

    const now = Date.now();
    const overdue = items.filter((r) => !r.is_completed && new Date(r.reminder_date).getTime() < now);
    const upcoming = items.filter((r) => !r.is_completed && new Date(r.reminder_date).getTime() >= now);
    const completed = items.filter((r) => r.is_completed);

    document.getElementById('overdueCountPill').textContent = String(overdue.length);
    document.getElementById('upcomingCountPill').textContent = String(upcoming.length);
    document.getElementById('completedCountPill').textContent = String(completed.length);

    const renderList = (arr, emptyMsg) =>
      arr.length
        ? arr
            .map(
              (r) => `
          <div class="pc-reminder-item ${r.is_completed ? 'completed' : ''}">
            <div class="pc-reminder-main">
              <strong>${escapeHtml(r.title)}</strong>
              <span class="pc-type-pill">${escapeHtml(r.reminder_type)}</span>
              <div style="font-size:0.82rem; color:var(--text-secondary); margin-top:4px;">
                ${escapeHtml(r.plant_name || 'Plant')} • ${new Date(r.reminder_date).toLocaleString()}
              </div>
              ${r.description ? `<div style="font-size:0.8rem; color:var(--text-muted);">${escapeHtml(r.description)}</div>` : ''}
            </div>
            <div class="pc-reminder-actions">
              ${!r.is_completed ? `<button type="button" class="btn-leaf btn-leaf-sm" data-cal-action="complete" data-id="${escapeHtml(String(r.id))}"><i class="fa-solid fa-check"></i></button>` : ''}
              <button type="button" class="btn-glass" style="padding:6px 10px; color:#ff7675;" data-cal-action="delete" data-id="${escapeHtml(String(r.id))}"><i class="fa-solid fa-trash-can"></i></button>
            </div>
          </div>`
            )
            .join('')
        : `<p style="color:var(--text-muted); font-size:0.85rem;">${emptyMsg}</p>`;

    overdueEl.innerHTML = renderList(overdue, 'No overdue tasks.');
    upcomingEl.innerHTML = renderList(upcoming, 'No upcoming tasks.');
    completedEl.innerHTML = renderList(completed, 'No completed tasks yet.');
  }

  document.getElementById('reminderFilterPlant')?.addEventListener('change', renderCareCalendar);
  document.getElementById('reminderFilterStatus')?.addEventListener('change', renderCareCalendar);

  document.getElementById('reminderForm')?.addEventListener('submit', async (e) => {
    e.preventDefault();
    const errEl = document.getElementById('reminderErrorMsg');
    if (errEl) errEl.textContent = '';

    const plantId = document.getElementById('reminderPlantSelect').value;
    const title = document.getElementById('reminderTitleInput').value.trim();
    const type = document.getElementById('reminderTypeSelect').value;
    const dateVal = document.getElementById('reminderDateInput').value;
    const desc = document.getElementById('reminderDescInput').value.trim();

    if (!plantId || !title || !dateVal) {
      if (errEl) errEl.textContent = 'Select a plant, title, and date/time.';
      return;
    }

    if (isUserLoggedIn() && window.PlantCareReminders) {
      try {
        await window.PlantCareAPI.apiRequest('/api/reminders/', {
          method: 'POST',
          body: {
            plant: Number(plantId),
            title,
            reminder_type: type,
            reminder_date: new Date(dateVal).toISOString(),
            description: desc,
          },
        });
        state.backendReminders = await window.PlantCareAPI.apiRequest('/api/reminders/', { method: 'GET' });
      } catch (err) {
        if (errEl) errEl.textContent = err.message;
        return;
      }
    } else {
      const plant = getActiveGardenPlants().find((p) => p.id === plantId);
      state.localReminders.unshift({
        id: 'rem-' + Date.now(),
        plant: plantId,
        plant_name: plant ? plant.nickname || plant.plantName : 'Garden Plant',
        title,
        reminder_type: type,
        reminder_date: new Date(dateVal).toISOString(),
        description: desc,
        is_completed: false,
      });
      saveJsonStorage(STORAGE_KEYS.reminders, state.localReminders);
    }

    e.target.reset();
    renderCareCalendar();
    renderHomeDashboard();
    showToast('Care task scheduled!', '📅');
  });

  document.getElementById('view-calendar')?.addEventListener('click', async (e) => {
    const btn = e.target.closest('[data-cal-action]');
    if (!btn) return;
    const action = btn.getAttribute('data-cal-action');
    const id = btn.getAttribute('data-id');

    if (isUserLoggedIn() && window.PlantCareAPI) {
      try {
        if (action === 'complete') {
          await window.PlantCareAPI.apiRequest(`/api/reminders/${id}/complete/`, { method: 'POST' });
        } else if (action === 'delete') {
          await window.PlantCareAPI.apiRequest(`/api/reminders/${id}/`, { method: 'DELETE' });
        }
        state.backendReminders = await window.PlantCareAPI.apiRequest('/api/reminders/', { method: 'GET' });
      } catch (err) {
        showToast(err.message, '⚠️');
        return;
      }
    } else {
      if (action === 'complete') {
        const item = state.localReminders.find((r) => String(r.id) === id);
        if (item) item.is_completed = true;
      } else if (action === 'delete') {
        state.localReminders = state.localReminders.filter((r) => String(r.id) !== id);
      }
      saveJsonStorage(STORAGE_KEYS.reminders, state.localReminders);
    }

    renderCareCalendar();
    renderHomeDashboard();
  });

  function updateNotificationStatusUI() {
    const labelEl = document.getElementById('notifStatusText');
    if (!labelEl) return;
    if (!('Notification' in window)) {
      labelEl.textContent = 'Not Supported';
      return;
    }
    if (Notification.permission === 'granted') labelEl.textContent = 'Notifications Enabled';
    else if (Notification.permission === 'denied') labelEl.textContent = 'Notifications Blocked';
    else labelEl.textContent = 'Enable Notifications';
  }

  async function requestBrowserNotifications() {
    if (!('Notification' in window)) {
      showToast('This browser does not support desktop notifications.', '⚠️');
      return;
    }
    const perm = await Notification.requestPermission();
    updateNotificationStatusUI();
    if (perm === 'granted') {
      new Notification('PlantCare Notifications Enabled', {
        body: 'You will receive alerts for upcoming care tasks while PlantCare is open.',
      });
      showToast('Browser notifications enabled!', '🔔');
    } else {
      showToast('Notification permission was not granted. Care Calendar remains fully usable.', 'ℹ️');
    }
  }

  document.getElementById('enableNotificationsBtn')?.addEventListener('click', requestBrowserNotifications);
  document.getElementById('settingsNotifBtn')?.addEventListener('click', requestBrowserNotifications);

  // ----------------------------------------------------
  // View 6: AI Botanist (Live Hugging Face Backend + XSS-Safe Rendering)
  // ----------------------------------------------------
  const chatHistoryEl = document.getElementById('chatHistory');
  const chatInputEl = document.getElementById('chatInput');
  const sendChatBtn = document.getElementById('sendChatBtn');

  function renderChatHistory() {
    if (!chatHistoryEl) return;
    const greeting = `
      <div class="chat-bubble chat-bubble-bot">
        Hello! I am your <strong>PlantCare AI Botanist</strong>. Ask me any gardening question—powered by hosted Hugging Face inference.
      </div>`;
    const bubbles = state.chatMessages
      .map((m) => {
        const content = m.role === 'assistant' ? formatSafeMarkdown(m.content) : escapeHtml(m.content);
        const cls = m.role === 'assistant' ? 'chat-bubble-bot' : 'chat-bubble-user';
        return `<div class="chat-bubble ${cls}">${content}</div>`;
      })
      .join('');
    chatHistoryEl.innerHTML = greeting + bubbles;
    chatHistoryEl.scrollTop = chatHistoryEl.scrollHeight;
  }

  async function handleUserChatMessage(userQuery) {
    if (!userQuery || !userQuery.trim() || state.isChatLoading) return;
    const cleanQuery = userQuery.trim();
    if (chatInputEl) chatInputEl.value = '';

    state.chatMessages.push({ role: 'user', content: cleanQuery });
    renderChatHistory();

    state.isChatLoading = true;
    if (sendChatBtn) sendChatBtn.disabled = true;

    const typingBubble = document.createElement('div');
    typingBubble.className = 'chat-bubble chat-bubble-bot';
    typingBubble.innerHTML = `<i class="fa-solid fa-spinner fa-spin"></i> Thinking...`;
    chatHistoryEl?.appendChild(typingBubble);
    if (chatHistoryEl) chatHistoryEl.scrollTop = chatHistoryEl.scrollHeight;

    try {
      const headers = { 'Content-Type': 'application/json' };
      const token = window.PlantCareAPI?.getAccessToken();
      if (token) headers['Authorization'] = `Bearer ${token}`;

      const resp = await fetch(CHATBOT_ASK_URL, {
        method: 'POST',
        headers,
        body: JSON.stringify({
          message: cleanQuery,
          history: state.chatMessages.slice(-9, -1),
        }),
      });
      const data = await resp.json().catch(() => ({}));
      typingBubble.remove();

      if (!resp.ok) {
        throw new Error(data.detail || data.message?.[0] || `Server error (${resp.status})`);
      }

      state.chatMessages.push({ role: 'assistant', content: data.reply });
      saveJsonStorage(STORAGE_KEYS.chat, state.chatMessages.slice(-30));
      renderChatHistory();
    } catch (err) {
      typingBubble.remove();
      const msg =
        err.message === 'Failed to fetch'
          ? 'Cannot reach PlantCare backend at http://127.0.0.1:8000. Start the Django server and configure HF_TOKEN in backend/.env.'
          : err.message;
      state.chatMessages.push({ role: 'assistant', content: `⚠️ **AI Botanist Unavailable:** ${msg}` });
      renderChatHistory();
      showToast(msg, '⚠️');
    } finally {
      state.isChatLoading = false;
      if (sendChatBtn) sendChatBtn.disabled = false;
    }
  }

  sendChatBtn?.addEventListener('click', () => handleUserChatMessage(chatInputEl?.value));
  chatInputEl?.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') handleUserChatMessage(chatInputEl.value);
  });
  document.querySelectorAll('.prompt-chip').forEach((chip) => {
    chip.addEventListener('click', () => {
      handleUserChatMessage(chip.getAttribute('data-prompt') || chip.textContent);
    });
  });
  document.getElementById('clearChatBtn')?.addEventListener('click', () => {
    state.chatMessages = [];
    saveJsonStorage(STORAGE_KEYS.chat, []);
    renderChatHistory();
    showToast('Chat cleared.', '🧹');
  });

  // ----------------------------------------------------
  // View 7: Settings & JSON Backup Export / Import
  // ----------------------------------------------------
  document.getElementById('exportDataBtn')?.addEventListener('click', () => {
    const payload = {
      exportedAt: new Date().toISOString(),
      garden: state.myGarden,
      bookmarks: [...state.savedBookmarks],
      reminders: state.localReminders,
      chatHistory: state.chatMessages,
    };
    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `plantcare-backup-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
    showToast('Backup exported!', '💾');
  });

  document.getElementById('importDataInput')?.addEventListener('change', (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      try {
        const parsed = JSON.parse(ev.target.result);
        if (Array.isArray(parsed.garden)) {
          state.myGarden = parsed.garden;
          saveJsonStorage(STORAGE_KEYS.garden, state.myGarden);
        }
        if (Array.isArray(parsed.bookmarks)) {
          state.savedBookmarks = new Set(parsed.bookmarks);
          saveJsonStorage(STORAGE_KEYS.bookmarks, [...state.savedBookmarks]);
        }
        if (Array.isArray(parsed.reminders)) {
          state.localReminders = parsed.reminders;
          saveJsonStorage(STORAGE_KEYS.reminders, state.localReminders);
        }
        if (Array.isArray(parsed.chatHistory)) {
          state.chatMessages = parsed.chatHistory;
          saveJsonStorage(STORAGE_KEYS.chat, state.chatMessages);
        }
        renderHomeDashboard();
        renderPlantGallery();
        renderMyGarden();
        renderCareCalendar();
        renderChatHistory();
        populateReminderPlantSelects();
        showToast('Backup restored successfully!', '✅');
      } catch {
        showToast('Invalid JSON backup file.', '⚠️');
      }
    };
    reader.readAsText(file);
  });

  // ----------------------------------------------------
  // Auth Sync & Initial Boot
  // ----------------------------------------------------
  async function syncAuthenticatedData() {
    if (!isUserLoggedIn()) {
      state.backendPlants = [];
      state.backendReminders = [];
      populateReminderPlantSelects();
      renderMyGarden();
      renderCareCalendar();
      renderHomeDashboard();
      return;
    }

    try {
      if (window.PlantCarePlants) {
        state.backendPlants = await window.PlantCarePlants.fetchPlants();
      }
      if (window.PlantCareAPI) {
        state.backendReminders = await window.PlantCareAPI.apiRequest('/api/reminders/', { method: 'GET' });
        const chatRows = await window.PlantCareAPI.apiRequest('/api/chatbot/', { method: 'GET' });
        if (Array.isArray(chatRows) && chatRows.length) {
          state.chatMessages = chatRows.map((r) => ({
            role: r.message_type === 'bot' ? 'assistant' : 'user',
            content: r.message,
          }));
          renderChatHistory();
        }
      }
    } catch (err) {
      console.warn('Backend sync warning:', err.message);
    }

    populateReminderPlantSelects();
    renderMyGarden();
    renderCareCalendar();
    renderHomeDashboard();
  }

  if (window.PlantCareAuth) {
    window.PlantCareAuth.initAuth({
      onAuthChange: syncAuthenticatedData,
      onToast: showToast,
    });
  }
  if (window.PlantCareProfile) {
    window.PlantCareProfile.initProfileEvents(showToast);
  }

  renderSampleThumbnails();
  resetScannerToReadyState();
  renderPlantGallery();
  populateReminderPlantSelects();
  renderMyGarden();
  renderCareCalendar();
  renderChatHistory();
  renderHomeDashboard();
  updateNotificationStatusUI();

  const initialHash = window.location.hash.replace('#', '').trim();
  if (VALID_VIEWS.has(initialHash)) {
    navigateTo(initialHash, { updateHash: false });
  }

  if (isUserLoggedIn()) {
    syncAuthenticatedData();
  }
});
