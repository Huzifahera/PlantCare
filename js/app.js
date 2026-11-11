// PlantCare - Main Interactive Application Logic

document.addEventListener('DOMContentLoaded', () => {
  // Application State
  const state = {
    searchQuery: '',
    selectedCategory: 'All',
    myGarden: loadGardenFromStorage(),
    activeScanSample: SCAN_SAMPLES[0],
    isScanning: false,
    savedBookmarks: new Set(JSON.parse(localStorage.getItem('plantcare_bookmarks') || '[]'))
  };

  // DOM Elements
  const plantGridEl = document.getElementById('plantGrid');
  const heroSearchInput = document.getElementById('heroSearchInput');
  const gallerySearchInput = document.getElementById('gallerySearchInput');
  const categoryTabsEl = document.getElementById('categoryTabs');
  const heroQuickChips = document.querySelectorAll('.hero-quick-chips .filter-chip');
  const gardenGridEl = document.getElementById('gardenGrid');
  const gardenCountBadge = document.getElementById('gardenCountBadge');
  const currentStreakCountEl = document.getElementById('currentStreakCount');

  // Scanner Elements
  const scanImgEl = document.getElementById('scanViewportImg');
  const scanLaserEl = document.getElementById('scanLaser');
  const scanPlantNameEl = document.getElementById('scanPlantName');
  const scanConfidenceEl = document.getElementById('scanConfidence');
  const scanHealthStatusEl = document.getElementById('scanHealthStatus');
  const scanDiagnosisEl = document.getElementById('scanDiagnosis');
  const scanAdviceListEl = document.getElementById('scanAdviceList');
  const sampleThumbsContainer = document.getElementById('sampleThumbsContainer');
  const fileUploadInput = document.getElementById('plantPhotoUpload');
  const triggerScanBtn = document.getElementById('triggerScanBtn');
  const addScannedToGardenBtn = document.getElementById('addScannedToGardenBtn');

  // Chat Elements
  const chatHistoryEl = document.getElementById('chatHistory');
  const chatInputEl = document.getElementById('chatInput');
  const sendChatBtn = document.getElementById('sendChatBtn');
  const promptChips = document.querySelectorAll('.prompt-chip');

  // Modal Elements
  const plantModal = document.getElementById('plantDetailModal');
  const modalCloseBtn = document.getElementById('modalCloseBtn');
  const modalImg = document.getElementById('modalImg');
  const modalName = document.getElementById('modalName');
  const modalScientific = document.getElementById('modalScientific');
  const modalBadge = document.getElementById('modalBadge');
  const modalDesc = document.getElementById('modalDesc');
  const modalWater = document.getElementById('modalWater');
  const modalLight = document.getElementById('modalLight');
  const modalDifficulty = document.getElementById('modalDifficulty');
  const modalHumidity = document.getElementById('modalHumidity');
  const modalTemp = document.getElementById('modalTemp');
  const modalPet = document.getElementById('modalPet');
  const modalCareTip = document.getElementById('modalCareTip');
  const modalAddGardenBtn = document.getElementById('modalAddGardenBtn');

  // Navigation Mobile Toggle
  const mobileToggle = document.getElementById('mobileMenuToggle');
  const navLinks = document.getElementById('navLinks');

  if (mobileToggle && navLinks) {
    mobileToggle.addEventListener('click', () => {
      navLinks.classList.toggle('open');
    });
  }

  // ----------------------------------------------------
  // Helper: Local Storage for Garden & Bookmarks
  // ----------------------------------------------------
  function loadGardenFromStorage() {
    const saved = localStorage.getItem('plantcare_my_garden');
    if (saved) {
      try { return JSON.parse(saved); } catch (e) { console.error(e); }
    }
    return [...INITIAL_MY_GARDEN];
  }

  function saveGardenToStorage() {
    localStorage.setItem('plantcare_my_garden', JSON.stringify(state.myGarden));
    renderMyGarden();
  }

  function saveBookmarksToStorage() {
    localStorage.setItem('plantcare_bookmarks', JSON.stringify([...state.savedBookmarks]));
  }

  // ----------------------------------------------------
  // Toast Notifications
  // ----------------------------------------------------
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
    toast.innerHTML = `<span>${icon}</span> <span>${message}</span>`;
    container.appendChild(toast);

    setTimeout(() => {
      toast.style.opacity = '0';
      toast.style.transform = 'translateY(10px)';
      toast.style.transition = 'all 0.3s ease';
      setTimeout(() => toast.remove(), 300);
    }, 3200);
  }

  // ----------------------------------------------------
  // Render Plant Explorer Gallery
  // ----------------------------------------------------
  function renderPlantGallery() {
    if (!plantGridEl) return;

    const filtered = PLANT_DATABASE.filter(plant => {
      const matchesSearch = 
        plant.name.toLowerCase().includes(state.searchQuery.toLowerCase()) ||
        plant.scientificName.toLowerCase().includes(state.searchQuery.toLowerCase()) ||
        plant.description.toLowerCase().includes(state.searchQuery.toLowerCase());

      if (state.selectedCategory === 'All') return matchesSearch;
      if (state.selectedCategory === 'Pet Friendly') return matchesSearch && plant.petFriendly;
      return matchesSearch && (plant.category.toLowerCase() === state.selectedCategory.toLowerCase());
    });

    if (filtered.length === 0) {
      plantGridEl.innerHTML = `
        <div style="grid-column: 1 / -1; text-align: center; padding: 40px 20px; color: var(--text-muted);">
          <i class="fa-solid fa-leaf" style="font-size: 2.5rem; color: var(--leaf-green-400); margin-bottom: 12px; display: block;"></i>
          <h3>No plants found matching "${state.searchQuery}"</h3>
          <p style="margin-top: 6px;">Try adjusting your keywords or category filters.</p>
        </div>
      `;
      return;
    }

    plantGridEl.innerHTML = filtered.map(plant => {
      const isSaved = state.savedBookmarks.has(plant.id);
      const isAlreadyInGarden = state.myGarden.some(g => g.plantId === plant.id);

      return `
        <article class="glass-card plant-card" data-plant-id="${plant.id}">
          <div class="plant-card-media">
            <img src="${plant.image}" alt="${plant.name}" loading="lazy">
            <span class="plant-badge-top">${plant.badge}</span>
            <button class="plant-bookmark-btn ${isSaved ? 'saved' : ''}" data-action="bookmark" data-id="${plant.id}" title="${isSaved ? 'Remove from favorites' : 'Save to favorites'}">
              <i class="${isSaved ? 'fa-solid' : 'fa-regular'} fa-heart"></i>
            </button>
          </div>
          
          <div class="plant-card-body">
            <div class="plant-title-row">
              <h3>${plant.name}</h3>
              <div class="plant-scientific">${plant.scientificName}</div>
            </div>

            <div class="plant-tags">
              <span class="plant-tag-pill"><i class="fa-solid fa-droplet"></i> ${plant.waterFrequencyDays}d</span>
              <span class="plant-tag-pill"><i class="fa-solid fa-sun"></i> ${plant.light}</span>
              ${plant.petFriendly ? '<span class="plant-tag-pill" style="color:#27ae60"><i class="fa-solid fa-paw"></i> Pet Safe</span>' : ''}
            </div>

            <div class="plant-meta-specs">
              <div class="spec-item"><i class="fa-solid fa-gauge-simple"></i> Care: <strong>${plant.difficulty}</strong></div>
              <div class="spec-item"><i class="fa-solid fa-heart-pulse"></i> Score: <strong>${plant.healthScore}%</strong></div>
            </div>

            <div class="plant-card-actions">
              <button class="btn-leaf btn-leaf-sm" data-action="addToGarden" data-id="${plant.id}">
                <i class="fa-solid ${isAlreadyInGarden ? 'fa-check' : 'fa-plus'}"></i>
                ${isAlreadyInGarden ? 'In Garden' : 'Track Plant'}
              </button>
              <button class="btn-glass" data-action="viewDetails" data-id="${plant.id}" title="Care Instructions">
                <i class="fa-solid fa-circle-info"></i>
              </button>
              <button class="btn-glass" data-action="askAiAbout" data-name="${plant.name}" title="Ask Qwen AI about ${plant.name}">
                <i class="fa-solid fa-wand-magic-sparkles" style="color: #ffbe3b"></i>
              </button>
            </div>
          </div>
        </article>
      `;
    }).join('');
  }

  // ----------------------------------------------------
  // Render My Mini Garden Dashboard
  // ----------------------------------------------------
  function renderMyGarden() {
    if (!gardenGridEl) return;

    if (gardenCountBadge) {
      gardenCountBadge.textContent = `${state.myGarden.length} Plants`;
    }

    if (state.myGarden.length === 0) {
      gardenGridEl.innerHTML = `
        <div style="grid-column: 1 / -1; text-align: center; padding: 40px 20px; background: rgba(255,255,255,0.25); border-radius: 20px; border: 1px dashed var(--leaf-green-400);">
          <i class="fa-solid fa-seedling" style="font-size: 2.2rem; color: var(--leaf-green-400); margin-bottom: 10px; display: block;"></i>
          <h3>Your Garden is currently empty!</h3>
          <p style="color: var(--text-muted); margin-top: 6px;">Explore the plant gallery above or snap a plant photo to add your first plant.</p>
        </div>
      `;
      return;
    }

    gardenGridEl.innerHTML = state.myGarden.map(item => {
      const progressPercent = Math.max(10, Math.min(100, Math.round(((14 - item.daysUntilWater) / 14) * 100)));
      return `
        <div class="glass-card garden-plant-item" data-garden-id="${item.id}">
          <div class="garden-plant-thumb">
            <img src="${item.image}" alt="${item.nickname || item.plantName}">
          </div>
          <div class="garden-plant-details">
            <h4>${item.nickname || item.plantName}</h4>
            <div class="garden-location"><i class="fa-solid fa-location-dot"></i> ${item.location}</div>
            
            <div class="water-status-bar">
              <div class="water-status-labels">
                <span>Water in ${item.daysUntilWater} days</span>
                <span>Streak: ${item.streakDays}d 🔥</span>
              </div>
              <div class="water-progress-bg">
                <div class="water-progress-fill" style="width: ${progressPercent}%;"></div>
              </div>
            </div>

            <div class="garden-item-footer">
              <button class="action-water-btn ${item.daysUntilWater > 6 ? 'watered' : ''}" data-action="waterPlant" data-garden-id="${item.id}">
                <i class="fa-solid fa-droplet"></i> ${item.daysUntilWater > 6 ? 'Hydrated' : 'Water Now'}
              </button>
              <button class="btn-glass" style="padding: 4px 10px; font-size: 0.78rem;" data-action="diagnoseGardenPlant" data-name="${item.plantName}">
                <i class="fa-solid fa-microscope" style="color: var(--leaf-green-500)"></i> Check
              </button>
              <button class="btn-glass" style="padding: 4px 10px; font-size: 0.78rem; color: #ff7675" data-action="removeGardenPlant" data-garden-id="${item.id}" title="Remove plant">
                <i class="fa-solid fa-trash-can"></i>
              </button>
            </div>
          </div>
        </div>
      `;
    }).join('');
  }

  // ----------------------------------------------------
  // Photo Snap & AI Identifier Demo
  // ----------------------------------------------------
  function renderSampleThumbnails() {
    if (!sampleThumbsContainer) return;

    sampleThumbsContainer.innerHTML = SCAN_SAMPLES.map((sample, idx) => `
      <button class="sample-thumb-btn ${idx === 0 ? 'active' : ''}" data-sample-id="${sample.id}">
        <img src="${sample.image}" alt="${sample.title}">
        <span>${sample.title}</span>
      </button>
    `).join('');
  }

  function applyScanData(sampleData) {
    if (!sampleData) return;
    state.activeScanSample = sampleData;

    scanImgEl.src = sampleData.image;
    scanPlantNameEl.textContent = sampleData.plantName;
    scanConfidenceEl.textContent = `${sampleData.confidence} Match`;
    scanHealthStatusEl.textContent = sampleData.healthStatus;
    scanDiagnosisEl.textContent = sampleData.diagnosis;

    scanAdviceListEl.innerHTML = sampleData.qwenAdvice.map(advice => `
      <li><i class="fa-solid fa-circle-check"></i> <span>${advice}</span></li>
    `).join('');
  }

  function triggerScannerAnimation(onComplete) {
    if (state.isScanning) return;
    state.isScanning = true;

    if (scanLaserEl) {
      scanLaserEl.classList.add('scanning');
    }
    triggerScanBtn.disabled = true;
    triggerScanBtn.innerHTML = `<i class="fa-solid fa-spinner fa-spin"></i> Qwen AI Analyzing...`;

    setTimeout(() => {
      if (scanLaserEl) {
        scanLaserEl.classList.remove('scanning');
      }
      triggerScanBtn.disabled = false;
      triggerScanBtn.innerHTML = `<i class="fa-solid fa-camera"></i> Scan & Diagnose`;
      state.isScanning = false;
      if (onComplete) onComplete();
      showToast('Scan complete! Qwen AI updated botanical diagnosis.', '✨');
    }, 1800);
  }

  // Sample Thumb Click Listener
  if (sampleThumbsContainer) {
    sampleThumbsContainer.addEventListener('click', (e) => {
      const btn = e.target.closest('.sample-thumb-btn');
      if (!btn) return;

      const sampleId = btn.getAttribute('data-sample-id');
      const found = SCAN_SAMPLES.find(s => s.id === sampleId);
      if (found) {
        document.querySelectorAll('.sample-thumb-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        triggerScannerAnimation(() => {
          applyScanData(found);
        });
      }
    });
  }

  // Trigger Scan Button
  if (triggerScanBtn) {
    triggerScanBtn.addEventListener('click', () => {
      triggerScannerAnimation(() => {
        applyScanData(state.activeScanSample);
      });
    });
  }

  // Add Scanned Plant To Garden Button
  if (addScannedToGardenBtn) {
    addScannedToGardenBtn.addEventListener('click', () => {
      const sample = state.activeScanSample;
      const newPlant = {
        id: 'mg-' + Date.now(),
        plantId: 'scanned-' + Date.now(),
        nickname: sample.plantName.split('(')[0].trim(),
        plantName: sample.plantName.split('(')[0].trim(),
        image: sample.image,
        location: 'Balcony / Garden',
        daysUntilWater: 7,
        lastWatered: 'Today',
        healthScore: sample.healthScore || 95,
        streakDays: 1,
        needsWaterToday: false
      };

      state.myGarden.unshift(newPlant);
      saveGardenToStorage();
      showToast(`Added ${newPlant.plantName} to My Garden!`, '🪴');

      // Scroll smoothly to garden section
      const gardenSec = document.getElementById('gardenSection');
      if (gardenSec) {
        gardenSec.scrollIntoView({ behavior: 'smooth' });
      }
    });
  }

  // File Upload / Photo Snap Simulation
  if (fileUploadInput) {
    fileUploadInput.addEventListener('change', (e) => {
      const file = e.target.files && e.target.files[0];
      if (!file) return;

      const reader = new FileReader();
      reader.onload = (event) => {
        const customImgUrl = event.target.result;
        scanImgEl.src = customImgUrl;

        // Custom AI result simulation
        const customDiagnosis = {
          id: 'custom-' + Date.now(),
          title: 'Custom Upload Scan',
          image: customImgUrl,
          plantName: 'Identified Garden Species (Chlorophytum / Herbaceous)',
          confidence: '95.6%',
          healthStatus: 'Active Photosynthesis 🌿',
          healthScore: 93,
          diagnosis: 'Healthy foliage density with stable chlorophyll absorption. No severe viral or fungal lesions observed.',
          qwenAdvice: [
            'Place in bright, filtered light (avoid scorching afternoon sun).',
            'Water once the top 1.5 inches of soil dries out completely.',
            'Maintain ambient humidity around 50% for optimal leaf span.'
          ]
        };

        triggerScannerAnimation(() => {
          applyScanData(customDiagnosis);
        });
      };
      reader.readAsDataURL(file);
    });
  }

  // ----------------------------------------------------
  // "Ask Qwen AI Botanist" Interactive Chat
  // ----------------------------------------------------
  function appendChatMessage(sender, text) {
    const bubble = document.createElement('div');
    bubble.className = `chat-bubble chat-bubble-${sender}`;

    if (sender === 'bot') {
      // Basic markdown styling formatting
      const formatted = text
        .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
        .replace(/\*(.*?)\*/g, '<em>$1</em>')
        .replace(/\n/g, '<br>');
      bubble.innerHTML = formatted;
    } else {
      bubble.textContent = text;
    }

    chatHistoryEl.appendChild(bubble);
    chatHistoryEl.scrollTop = chatHistoryEl.scrollHeight;
  }

  function handleUserChatMessage(userQuery) {
    if (!userQuery || !userQuery.trim()) return;
    const cleanQuery = userQuery.trim();

    appendChatMessage('user', cleanQuery);
    chatInputEl.value = '';

    // Show temporary typing indicator
    const typingBubble = document.createElement('div');
    typingBubble.className = 'chat-bubble chat-bubble-bot';
    typingBubble.innerHTML = `<i class="fa-solid fa-spinner fa-spin"></i> Qwen AI Botanist is thinking...`;
    chatHistoryEl.appendChild(typingBubble);
    chatHistoryEl.scrollTop = chatHistoryEl.scrollHeight;

    setTimeout(() => {
      typingBubble.remove();
      const lower = cleanQuery.toLowerCase();
      let matchedResponse = null;

      for (const entry of QWEN_KNOWLEDGE_BASE) {
        if (entry.keywords.some(kw => lower.includes(kw))) {
          matchedResponse = entry.reply;
          break;
        }
      }

      if (!matchedResponse) {
        matchedResponse = `**PlantCare AI (Qwen Botanist)**: 🌿 Thank you for asking about "*${cleanQuery}*". 
As your garden AI assistant, here is my general guideline:
1. Ensure the pot has free-flowing drainage holes to prevent root rot.
2. Check light levels: most foliage thrives in bright, indirect morning sun.
3. Use the finger moisture test before watering.

Would you like specific advice on yellow leaves, propagation, pests, or watering schedules? Just ask!`;
      }

      appendChatMessage('bot', matchedResponse);
    }, 850);
  }

  if (sendChatBtn && chatInputEl) {
    sendChatBtn.addEventListener('click', () => {
      handleUserChatMessage(chatInputEl.value);
    });

    chatInputEl.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') {
        handleUserChatMessage(chatInputEl.value);
      }
    });
  }

  promptChips.forEach(chip => {
    chip.addEventListener('click', () => {
      const promptText = chip.getAttribute('data-prompt') || chip.textContent;
      handleUserChatMessage(promptText);
    });
  });

  // ----------------------------------------------------
  // Search and Filter Events
  // ----------------------------------------------------
  if (heroSearchInput) {
    heroSearchInput.addEventListener('input', (e) => {
      state.searchQuery = e.target.value;
      if (gallerySearchInput) gallerySearchInput.value = state.searchQuery;
      renderPlantGallery();
    });
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

      document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');

      state.selectedCategory = btn.getAttribute('data-category');
      renderPlantGallery();
    });
  }

  heroQuickChips.forEach(chip => {
    chip.addEventListener('click', () => {
      const cat = chip.getAttribute('data-filter');
      state.selectedCategory = cat;

      // Update gallery tabs active state
      document.querySelectorAll('.tab-btn').forEach(b => {
        b.classList.toggle('active', b.getAttribute('data-category') === cat);
      });

      renderPlantGallery();

      // Scroll into explorer section
      const explorer = document.getElementById('explorerSection');
      if (explorer) {
        explorer.scrollIntoView({ behavior: 'smooth' });
      }
    });
  });

  // ----------------------------------------------------
  // Plant Card Actions Delegator (Bookmarks, Detail Modal, Add to Garden)
  // ----------------------------------------------------
  if (plantGridEl) {
    plantGridEl.addEventListener('click', (e) => {
      const bookmarkBtn = e.target.closest('[data-action="bookmark"]');
      const detailsBtn = e.target.closest('[data-action="viewDetails"]');
      const addGardenBtn = e.target.closest('[data-action="addToGarden"]');
      const askAiBtn = e.target.closest('[data-action="askAiAbout"]');

      if (bookmarkBtn) {
        const id = bookmarkBtn.getAttribute('data-id');
        if (state.savedBookmarks.has(id)) {
          state.savedBookmarks.delete(id);
          bookmarkBtn.classList.remove('saved');
          bookmarkBtn.innerHTML = '<i class="fa-regular fa-heart"></i>';
          showToast('Removed from favorites', '💔');
        } else {
          state.savedBookmarks.add(id);
          bookmarkBtn.classList.add('saved');
          bookmarkBtn.innerHTML = '<i class="fa-solid fa-heart"></i>';
          showToast('Saved to your plant favorites!', '❤️');
        }
        saveBookmarksToStorage();
        return;
      }

      if (detailsBtn) {
        const id = detailsBtn.getAttribute('data-id');
        openPlantModal(id);
        return;
      }

      if (addGardenBtn) {
        const id = addGardenBtn.getAttribute('data-id');
        const plant = PLANT_DATABASE.find(p => p.id === id);
        if (!plant) return;

        const alreadyExists = state.myGarden.some(g => g.plantId === id);
        if (alreadyExists) {
          showToast(`${plant.name} is already in your garden tracker!`, '🌿');
          return;
        }

        const newGardenItem = {
          id: 'mg-' + Date.now(),
          plantId: plant.id,
          nickname: plant.name,
          plantName: plant.name,
          image: plant.image,
          location: 'Indoor Garden',
          daysUntilWater: plant.waterFrequencyDays,
          lastWatered: 'Today',
          healthScore: plant.healthScore,
          streakDays: 1,
          needsWaterToday: false
        };

        state.myGarden.unshift(newGardenItem);
        saveGardenToStorage();
        renderPlantGallery();
        showToast(`Added ${plant.name} to My Garden!`, '🪴');
        return;
      }

      if (askAiBtn) {
        const plantName = askAiBtn.getAttribute('data-name');
        const aiSection = document.getElementById('aiAssistantSection');
        if (aiSection) {
          aiSection.scrollIntoView({ behavior: 'smooth' });
          handleUserChatMessage(`How do I take care of my ${plantName}?`);
        }
        return;
      }
    });
  }

  // ----------------------------------------------------
  // Garden Interaction Events (Watering, Removal)
  // ----------------------------------------------------
  if (gardenGridEl) {
    gardenGridEl.addEventListener('click', (e) => {
      const waterBtn = e.target.closest('[data-action="waterPlant"]');
      const removeBtn = e.target.closest('[data-action="removeGardenPlant"]');
      const diagnoseBtn = e.target.closest('[data-action="diagnoseGardenPlant"]');

      if (waterBtn) {
        const gardenId = waterBtn.getAttribute('data-garden-id');
        const item = state.myGarden.find(g => g.id === gardenId);
        if (item) {
          item.daysUntilWater = 7;
          item.streakDays += 1;
          item.lastWatered = 'Just now';
          saveGardenToStorage();
          showToast(`Watered ${item.nickname}! Care streak boosted to ${item.streakDays} days! 💧`, '🎉');
        }
        return;
      }

      if (removeBtn) {
        const gardenId = removeBtn.getAttribute('data-garden-id');
        state.myGarden = state.myGarden.filter(g => g.id !== gardenId);
        saveGardenToStorage();
        renderPlantGallery();
        showToast('Plant removed from garden.', '🗑️');
        return;
      }

      if (diagnoseBtn) {
        const name = diagnoseBtn.getAttribute('data-name');
        const scannerSec = document.getElementById('scannerSection');
        if (scannerSec) {
          scannerSec.scrollIntoView({ behavior: 'smooth' });
          showToast(`Ready to scan & check ${name}`, '📸');
        }
        return;
      }
    });
  }

  // ----------------------------------------------------
  // Plant Modal Functions
  // ----------------------------------------------------
  let activeModalPlantId = null;

  function openPlantModal(plantId) {
    const plant = PLANT_DATABASE.find(p => p.id === plantId);
    if (!plant || !plantModal) return;

    activeModalPlantId = plant.id;
    modalImg.src = plant.image;
    modalName.textContent = plant.name;
    modalScientific.textContent = plant.scientificName;
    modalBadge.textContent = plant.badge;
    modalDesc.textContent = plant.description;
    modalWater.textContent = `${plant.waterFrequencyDays} days (${plant.waterAmount})`;
    modalLight.textContent = plant.light;
    modalDifficulty.textContent = plant.difficulty;
    modalHumidity.textContent = plant.humidity;
    modalTemp.textContent = plant.temperature;
    modalPet.textContent = plant.petFriendly ? 'Pet Safe 🐾' : 'Toxic to pets ⚠️';
    modalCareTip.textContent = plant.careTip;

    plantModal.classList.add('active');
  }

  function closePlantModal() {
    if (plantModal) plantModal.classList.remove('active');
    activeModalPlantId = null;
  }

  if (modalCloseBtn) {
    modalCloseBtn.addEventListener('click', closePlantModal);
  }

  if (plantModal) {
    plantModal.addEventListener('click', (e) => {
      if (e.target === plantModal) closePlantModal();
    });
  }

  if (modalAddGardenBtn) {
    modalAddGardenBtn.addEventListener('click', () => {
      if (!activeModalPlantId) return;
      const plant = PLANT_DATABASE.find(p => p.id === activeModalPlantId);
      if (!plant) return;

      const alreadyExists = state.myGarden.some(g => g.plantId === plant.id);
      if (!alreadyExists) {
        state.myGarden.unshift({
          id: 'mg-' + Date.now(),
          plantId: plant.id,
          nickname: plant.name,
          plantName: plant.name,
          image: plant.image,
          location: 'Balcony Shelf',
          daysUntilWater: plant.waterFrequencyDays,
          lastWatered: 'Today',
          healthScore: plant.healthScore,
          streakDays: 1,
          needsWaterToday: false
        });
        saveGardenToStorage();
        renderPlantGallery();
        showToast(`Added ${plant.name} to My Garden!`, '🪴');
      } else {
        showToast(`${plant.name} is already in your garden!`, '🌿');
      }
      closePlantModal();
    });
  }

  // ----------------------------------------------------
  // Initial Boot
  // ----------------------------------------------------
  renderPlantGallery();
  renderMyGarden();
  renderSampleThumbnails();
  applyScanData(SCAN_SAMPLES[0]);
});

