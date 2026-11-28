// PlantCare - Authentication Module (Register, Login, Logout, Auth Modal)

window.PlantCareAuth = (() => {
  const { apiRequest, setAuthTokens, clearAuthTokens, isAuthenticated, getStoredUsername } =
    window.PlantCareAPI;

  async function register(username, email, password) {
    return apiRequest('/api/accounts/register/', {
      method: 'POST',
      auth: false,
      body: { username, email, password },
    });
  }

  async function login(username, password) {
    const tokens = await apiRequest('/api/accounts/login/', {
      method: 'POST',
      auth: false,
      body: { username, password },
    });
    setAuthTokens({
      access: tokens.access,
      refresh: tokens.refresh,
      username,
    });
    return tokens;
  }

  function logout() {
    clearAuthTokens();
    window.dispatchEvent(new CustomEvent('plantcare:auth-changed', { detail: { authenticated: false } }));
  }

  function openAuthModal(defaultTab = 'login') {
    const modal = document.getElementById('authModal');
    if (!modal) return;
    switchAuthTab(defaultTab);
    const errorBox = document.getElementById('authErrorMsg');
    if (errorBox) errorBox.textContent = '';
    modal.classList.add('active');
  }

  function closeAuthModal() {
    const modal = document.getElementById('authModal');
    if (modal) modal.classList.remove('active');
  }

  function switchAuthTab(tab) {
    const loginForm = document.getElementById('loginForm');
    const registerForm = document.getElementById('registerForm');
    const loginTabBtn = document.getElementById('authTabLogin');
    const regTabBtn = document.getElementById('authTabRegister');
    const errorBox = document.getElementById('authErrorMsg');
    const successBox = document.getElementById('authSuccessMsg');

    if (errorBox) errorBox.textContent = '';
    if (successBox) successBox.textContent = '';

    const isLogin = tab === 'login';
    if (loginForm) loginForm.style.display = isLogin ? 'block' : 'none';
    if (registerForm) registerForm.style.display = isLogin ? 'none' : 'block';
    if (loginTabBtn) loginTabBtn.classList.toggle('active', isLogin);
    if (regTabBtn) regTabBtn.classList.toggle('active', !isLogin);
  }

  function updateNavbarAuthUI() {
    const guestGroup = document.getElementById('navGuestActions');
    const userGroup = document.getElementById('navUserActions');
    const usernameBadge = document.getElementById('navUsernameLabel');

    const loggedIn = isAuthenticated();
    if (guestGroup) guestGroup.style.display = loggedIn ? 'none' : 'inline-flex';
    if (userGroup) userGroup.style.display = loggedIn ? 'inline-flex' : 'none';
    if (usernameBadge) {
      usernameBadge.textContent = loggedIn ? (getStoredUsername() || 'Account') : '';
    }
  }

  function initAuthEvents(onToast) {
    const openLoginBtn = document.getElementById('openLoginModalBtn');
    const openRegBtn = document.getElementById('openRegisterModalBtn');
    const closeBtn = document.getElementById('authModalCloseBtn');
    const modal = document.getElementById('authModal');
    const loginTabBtn = document.getElementById('authTabLogin');
    const regTabBtn = document.getElementById('authTabRegister');
    const loginForm = document.getElementById('loginForm');
    const registerForm = document.getElementById('registerForm');
    const logoutBtn = document.getElementById('logoutBtn');
    const errorBox = document.getElementById('authErrorMsg');
    const successBox = document.getElementById('authSuccessMsg');

    if (openLoginBtn) openLoginBtn.addEventListener('click', () => openAuthModal('login'));
    if (openRegBtn) openRegBtn.addEventListener('click', () => openAuthModal('register'));
    if (closeBtn) closeBtn.addEventListener('click', closeAuthModal);
    if (modal) {
      modal.addEventListener('click', (e) => {
        if (e.target === modal) closeAuthModal();
      });
    }
    if (loginTabBtn) loginTabBtn.addEventListener('click', () => switchAuthTab('login'));
    if (regTabBtn) regTabBtn.addEventListener('click', () => switchAuthTab('register'));

    if (loginForm) {
      loginForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        if (errorBox) errorBox.textContent = '';
        if (successBox) successBox.textContent = '';

        const submitBtn = loginForm.querySelector('button[type="submit"]');
        const username = document.getElementById('loginUsername').value.trim();
        const password = document.getElementById('loginPassword').value;

        if (!username || !password) {
          if (errorBox) errorBox.textContent = 'Username and password are required.';
          return;
        }

        submitBtn.disabled = true;
        try {
          await login(username, password);
          closeAuthModal();
          loginForm.reset();
          updateNavbarAuthUI();
          window.dispatchEvent(new CustomEvent('plantcare:auth-changed', { detail: { authenticated: true } }));
          if (onToast) onToast(`Welcome back, ${username}!`, '🌿');
        } catch (err) {
          if (errorBox) errorBox.textContent = err.message;
        } finally {
          submitBtn.disabled = false;
        }
      });
    }

    if (registerForm) {
      registerForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        if (errorBox) errorBox.textContent = '';
        if (successBox) successBox.textContent = '';

        const submitBtn = registerForm.querySelector('button[type="submit"]');
        const username = document.getElementById('regUsername').value.trim();
        const email = document.getElementById('regEmail').value.trim();
        const password = document.getElementById('regPassword').value;

        submitBtn.disabled = true;
        try {
          await register(username, email, password);
          registerForm.reset();
          switchAuthTab('login');
          const loginUsernameInput = document.getElementById('loginUsername');
          if (loginUsernameInput) loginUsernameInput.value = username;
          if (successBox) {
            successBox.textContent = 'Registration successful! Please log in with your credentials.';
          }
          if (onToast) onToast('Account created! You can now log in.', '🎉');
        } catch (err) {
          if (errorBox) errorBox.textContent = err.message;
        } finally {
          submitBtn.disabled = false;
        }
      });
    }

    if (logoutBtn) {
      logoutBtn.addEventListener('click', () => {
        logout();
        updateNavbarAuthUI();
        if (onToast) onToast('Logged out successfully.', '👋');
      });
    }

    window.addEventListener('plantcare:auth-expired', () => {
      updateNavbarAuthUI();
      openAuthModal('login');
      if (onToast) onToast('Session expired. Please log in again.', '🔒');
    });

    updateNavbarAuthUI();
  }

  return {
    register,
    login,
    logout,
    openAuthModal,
    closeAuthModal,
    updateNavbarAuthUI,
    initAuthEvents,
  };
})();
