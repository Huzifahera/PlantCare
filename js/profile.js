// PlantCare - User Profile Module

window.PlantCareProfile = (() => {
  const { apiRequest, isAuthenticated, resolveMediaUrl } = window.PlantCareAPI;

  async function fetchProfile() {
    return apiRequest('/api/accounts/profile/', { method: 'GET' });
  }

  async function updateProfile(formData) {
    return apiRequest('/api/accounts/profile/', {
      method: 'PATCH',
      body: formData,
    });
  }

  function renderProfileData(profile) {
    const avatarEl = document.getElementById('profileAvatarPreview');
    const usernameEl = document.getElementById('profileUsernameDisplay');
    const emailEl = document.getElementById('profileEmailDisplay');
    const fullNameInput = document.getElementById('profileFullName');
    const phoneInput = document.getElementById('profilePhone');
    const locationInput = document.getElementById('profileLocation');

    if (usernameEl) usernameEl.textContent = profile.username || '';
    if (emailEl) emailEl.textContent = profile.email || '';
    if (fullNameInput) fullNameInput.value = profile.full_name || '';
    if (phoneInput) phoneInput.value = profile.phone_number || '';
    if (locationInput) locationInput.value = profile.location || '';

    if (avatarEl) {
      const imgUrl = resolveMediaUrl(profile.profile_image);
      avatarEl.src = imgUrl || 'https://images.unsplash.com/photo-1466781783364-36c955e42a7f?auto=format&fit=crop&w=200&q=80';
    }
  }

  async function openProfileModal() {
    if (!isAuthenticated()) {
      window.PlantCareAuth.openAuthModal('login');
      return;
    }
    const modal = document.getElementById('profileModal');
    const errorBox = document.getElementById('profileErrorMsg');
    if (errorBox) errorBox.textContent = '';

    try {
      const profile = await fetchProfile();
      renderProfileData(profile);
      if (modal) modal.classList.add('active');
    } catch (err) {
      if (errorBox) errorBox.textContent = err.message;
    }
  }

  function closeProfileModal() {
    const modal = document.getElementById('profileModal');
    if (modal) modal.classList.remove('active');
  }

  function initProfileEvents(onToast) {
    const openBtn = document.getElementById('openProfileModalBtn');
    const closeBtn = document.getElementById('profileModalCloseBtn');
    const modal = document.getElementById('profileModal');
    const form = document.getElementById('profileForm');
    const imageInput = document.getElementById('profileImageInput');
    const avatarPreview = document.getElementById('profileAvatarPreview');
    const errorBox = document.getElementById('profileErrorMsg');

    if (openBtn) openBtn.addEventListener('click', openProfileModal);
    if (closeBtn) closeBtn.addEventListener('click', closeProfileModal);
    if (modal) {
      modal.addEventListener('click', (e) => {
        if (e.target === modal) closeProfileModal();
      });
    }

    if (imageInput && avatarPreview) {
      imageInput.addEventListener('change', (e) => {
        const file = e.target.files && e.target.files[0];
        if (file) {
          avatarPreview.src = URL.createObjectURL(file);
        }
      });
    }

    if (form) {
      form.addEventListener('submit', async (e) => {
        e.preventDefault();
        if (errorBox) errorBox.textContent = '';

        const submitBtn = form.querySelector('button[type="submit"]');
        const formData = new FormData();
        formData.append('full_name', document.getElementById('profileFullName').value.trim());
        formData.append('phone_number', document.getElementById('profilePhone').value.trim());
        formData.append('location', document.getElementById('profileLocation').value.trim());

        const file = imageInput && imageInput.files && imageInput.files[0];
        if (file) {
          formData.append('profile_image', file);
        }

        submitBtn.disabled = true;
        try {
          const updated = await updateProfile(formData);
          renderProfileData(updated);
          if (imageInput) imageInput.value = '';
          closeProfileModal();
          if (onToast) onToast('Profile updated successfully!', '✨');
        } catch (err) {
          if (errorBox) errorBox.textContent = err.message;
        } finally {
          submitBtn.disabled = false;
        }
      });
    }
  }

  return {
    fetchProfile,
    updateProfile,
    openProfileModal,
    closeProfileModal,
    initProfileEvents,
  };
})();
