/* ============================================
   Kibi — Authentication Module
   Login, signup, and session management

   NOTE: Tokens are stored in localStorage for evaluation/demo purposes
   only. This is not safe for a production app with real user data —
   see README for the recommended production approach (HttpOnly cookies /
   server-side sessions).
   ============================================ */

const AUTH_KEY = 'kibi_auth_user';

function initAuth() {
  const loginForm = document.getElementById('loginForm');
  const signupForm = document.getElementById('signupForm');

  if (loginForm) initLoginForm(loginForm);
  if (signupForm) initSignupForm(signupForm);

  initSocialButtons();
  restoreSession();
}

// Wait for runtime config (config.json) to load before initializing OAuth,
// otherwise the Google/Apple client IDs may still be empty when buttons are wired.
function startAuth() {
  const ready = window.KIBI_CONFIG_READY || Promise.resolve();
  ready.then(() => {
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', initAuth);
    } else {
      initAuth();
    }
  });
}
startAuth();

/* --- Session Helpers --- */
function setAuthSession(session) {
  localStorage.setItem(AUTH_KEY, JSON.stringify(session));
  // Keep legacy pointer in sync
  if (session && session.id) {
    setCurrentUser(session.id);
  }
}

function getAuthSession() {
  try {
    return JSON.parse(localStorage.getItem(AUTH_KEY)) || null;
  } catch (e) {
    return null;
  }
}

function isLoggedIn() {
  return !!getAuthSession();
}

function clearAuthSession() {
  localStorage.removeItem(AUTH_KEY);
  logoutUser();
}

function restoreSession() {
  const session = getAuthSession();
  if (session && session.id) {
    setCurrentUser(session.id);
  }
}

/* --- Login Form --- */
function initLoginForm(form) {
  form.addEventListener('submit', (e) => {
    e.preventDefault();
    clearErrors(form);

    const email = form.querySelector('#email').value.trim();
    const password = form.querySelector('#password').value;

    if (!email) return showFieldError('email', 'Email is required');
    if (!isValidEmail(email)) return showFieldError('email', 'Please enter a valid email');
    if (!password) return showFieldError('password', 'Password is required');

    const user = getUserByEmail(email);
    if (!user) return showFieldError('email', 'No account found with this email');
    if (user.password !== password) return showFieldError('password', 'Incorrect password');

    const session = {
      id: user.id,
      provider: 'local',
      name: user.name,
      email: user.email,
      avatar: user.avatar || user.name.charAt(0).toUpperCase(),
      token: null
    };
    setAuthSession(session);

    saveNotification({
      userId: user.id,
      message: `Welcome back, ${user.name}! Ready for your next adventure?`,
      type: 'welcome'
    });

    showToast('Welcome back! 🎉', 'success');
    setTimeout(() => { window.location.href = 'dashboard.html'; }, 500);
  });
}

/* --- Signup Form --- */
function initSignupForm(form) {
  form.addEventListener('submit', (e) => {
    e.preventDefault();
    clearErrors(form);

    const name = form.querySelector('#name').value.trim();
    const email = form.querySelector('#email').value.trim();
    const password = form.querySelector('#password').value;
    const confirmPassword = form.querySelector('#confirmPassword').value;
    const terms = form.querySelector('#terms');

    if (!name) return showFieldError('name', 'Name is required');
    if (name.length < 2) return showFieldError('name', 'Name must be at least 2 characters');
    if (!email) return showFieldError('email', 'Email is required');
    if (!isValidEmail(email)) return showFieldError('email', 'Please enter a valid email');
    if (!password) return showFieldError('password', 'Password is required');
    if (password.length < 4) return showFieldError('password', 'Password must be at least 4 characters');
    if (password !== confirmPassword) return showFieldError('confirmPassword', 'Passwords do not match');
    if (terms && !terms.checked) {
      return showFieldError('terms', 'You must agree to the Terms of Service and Privacy Policy');
    }

    if (getUserByEmail(email)) {
      return showFieldError('email', 'An account with this email already exists');
    }

    const user = saveUser({
      name,
      email,
      password,
      provider: 'local',
      travelStyle: [],
      budget: '',
      socialPreference: '',
      interests: [],
      travelPace: '',
      avatar: name.charAt(0).toUpperCase(),
      savedTrips: []
    });

    const session = {
      id: user.id,
      provider: 'local',
      name: user.name,
      email: user.email,
      avatar: user.avatar,
      token: null
    };
    setAuthSession(session);

    saveNotification({
      userId: user.id,
      message: `Welcome to Kibi, ${name}! Let's set up your travel profile.`,
      type: 'welcome'
    });

    showToast('Account created! 🎉', 'success');
    setTimeout(() => { window.location.href = 'onboarding.html'; }, 500);
  });
}

/* --- Social Login Buttons --- */
function initSocialButtons() {
  document.querySelectorAll('.social-btn').forEach(btn => {
    const provider = btn.dataset.provider;
    if (provider === 'google') {
      btn.addEventListener('click', handleGoogleLogin);
    } else if (provider === 'apple') {
      btn.addEventListener('click', handleAppleLogin);
    }
  });
}

/* --- Demo fallback for OAuth without configured credentials --- */
function demoSocialLogin(provider) {
  const email = provider === 'google' ? 'demo.google@example.com' : 'demo.apple@icloud.com';
  let user = getUserByEmail(email);
  if (!user) {
    user = saveUser({
      name: provider === 'google' ? 'Demo Google User' : 'Demo Apple User',
      email,
      password: crypto.randomUUID ? crypto.randomUUID() : Math.random().toString(36).slice(2),
      provider: provider,
      avatar: provider === 'google' ? 'G' : 'A',
      travelStyle: [],
      budget: '',
      socialPreference: '',
      interests: [],
      travelPace: '',
      savedTrips: []
    });
  }
  setAuthSession({
    id: user.id,
    provider: provider,
    name: user.name,
    email: user.email,
    avatar: user.avatar,
    token: 'demo-token'
  });
  saveNotification({
    userId: user.id,
    message: `Demo sign-in with ${provider === 'google' ? 'Google' : 'Apple'} succeeded.`,
    type: 'welcome'
  });
  showToast(`Demo sign-in with ${provider === 'google' ? 'Google' : 'Apple'}! Configure config.json for real OAuth.`, 'success');
  setTimeout(() => { window.location.href = 'dashboard.html'; }, 1200);
}

/* --- Google Identity Services --- */
function handleGoogleLogin() {
  const clientId = window.KIBI_CONFIG && window.KIBI_CONFIG.GOOGLE_CLIENT_ID;
  if (!clientId) {
    console.warn('Google Sign-In not configured; using demo fallback.');
    return demoSocialLogin('google');
  }

  if (typeof google === 'undefined' || !google.accounts || !google.accounts.oauth2) {
    showToast('Google SDK not loaded yet. Please wait a moment and try again.', 'error');
    return;
  }

  google.accounts.oauth2.initTokenClient({
    client_id: clientId,
    scope: 'openid email profile',
    callback: async (tokenResponse) => {
      if (!tokenResponse || tokenResponse.error) {
        console.error('Google login error:', tokenResponse);
        showToast('Google sign-in was cancelled or failed.', 'error');
        return;
      }

      try {
        // Fetch user info from Google's userinfo endpoint
        const res = await fetch('https://www.googleapis.com/oauth2/v3/userinfo', {
          headers: { Authorization: `Bearer ${tokenResponse.access_token}` }
        });
        if (!res.ok) throw new Error('Failed to fetch Google user info');
        const data = await res.json();

        let user = getUserByEmail(data.email);
        if (!user) {
          user = saveUser({
            name: data.name || data.email.split('@')[0],
            email: data.email,
            password: crypto.randomUUID ? crypto.randomUUID() : Math.random().toString(36).slice(2),
            provider: 'google',
            providerId: data.sub,
            avatar: data.picture || (data.name ? data.name.charAt(0).toUpperCase() : 'G'),
            travelStyle: [],
            budget: '',
            socialPreference: '',
            interests: [],
            travelPace: '',
            savedTrips: []
          });
        } else {
          updateUser(user.id, {
            name: data.name || user.name,
            avatar: data.picture || user.avatar,
            provider: user.provider || 'google',
            providerId: data.sub
          });
        }

        const session = {
          id: user.id,
          provider: 'google',
          name: user.name,
          email: user.email,
          avatar: user.avatar,
          token: tokenResponse.access_token,
          idToken: tokenResponse.id_token || null
        };
        setAuthSession(session);

        saveNotification({
          userId: user.id,
          message: `Welcome back, ${user.name}! Signed in with Google.`,
          type: 'welcome'
        });

        showToast('Signed in with Google! 🎉', 'success');
        setTimeout(() => { window.location.href = 'dashboard.html'; }, 600);
      } catch (err) {
        console.error('Google login processing error:', err);
        showToast('Could not complete Google sign-in.', 'error');
      }
    }
  }).requestAccessToken();
}

/* --- Sign in with Apple JS SDK --- */
function handleAppleLogin() {
  const clientId = window.KIBI_CONFIG && window.KIBI_CONFIG.APPLE_CLIENT_ID;
  const redirectURI = window.KIBI_CONFIG && window.KIBI_CONFIG.APPLE_REDIRECT_URI;

  if (!clientId || !redirectURI) {
    console.warn('Apple Sign-In not configured; using demo fallback.');
    return demoSocialLogin('apple');
  }

  if (typeof AppleID === 'undefined') {
    showToast('Apple SDK not loaded yet. Please wait a moment and try again.', 'error');
    return;
  }

  AppleID.auth.signIn({
    clientId,
    redirectURI,
    scope: 'name email',
    responseType: 'code id_token',
    responseMode: 'fragment'
  }).then((res) => {
    // Decode identity token to get email
    let email = '';
    let name = '';
    try {
      const idToken = res.data && res.data.id_token ? res.data.id_token : res.id_token;
      if (idToken) {
        const payload = JSON.parse(atob(idToken.split('.')[1]));
        email = payload.email || '';
      }
      // Apple only sends user name on first authorization
      if (res.data && res.data.user) {
        const u = JSON.parse(res.data.user);
        name = [u.name.firstName, u.name.lastName].filter(Boolean).join(' ');
      }
    } catch (e) {
      console.warn('Could not parse Apple token/name:', e);
    }

    if (!email) {
      showToast('Apple did not return an email. Please try again or use another method.', 'error');
      return;
    }

    let user = getUserByEmail(email);
    if (!user) {
      user = saveUser({
        name: name || email.split('@')[0],
        email,
        password: crypto.randomUUID ? crypto.randomUUID() : Math.random().toString(36).slice(2),
        provider: 'apple',
        avatar: name ? name.charAt(0).toUpperCase() : 'A',
        travelStyle: [],
        budget: '',
        socialPreference: '',
        interests: [],
        travelPace: '',
        savedTrips: []
      });
    } else {
      updateUser(user.id, { name: name || user.name, provider: user.provider || 'apple' });
    }

    const session = {
      id: user.id,
      provider: 'apple',
      name: user.name,
      email: user.email,
      avatar: user.avatar,
      token: res.data && res.data.code ? res.data.code : null,
      idToken: res.data && res.data.id_token ? res.data.id_token : res.id_token || null
    };
    setAuthSession(session);

    saveNotification({
      userId: user.id,
      message: `Welcome back, ${user.name}! Signed in with Apple.`,
      type: 'welcome'
    });

    showToast('Signed in with Apple! 🎉', 'success');
    setTimeout(() => { window.location.href = 'dashboard.html'; }, 600);
  }).catch((err) => {
    console.error('Apple login error:', err);
    showToast('Apple sign-in was cancelled or failed.', 'error');
  });
}

/* --- Validation Helpers --- */
function isValidEmail(email) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

function showFieldError(fieldId, message) {
  const field = document.getElementById(fieldId);
  if (!field) return;

  const parent = field.closest('.relative') || field.parentElement;
  const existingError = parent.querySelector('.form-error');
  if (existingError) existingError.remove();

  const error = document.createElement('span');
  error.className = 'form-error';
  error.textContent = message;
  parent.appendChild(error);

  field.classList.add('input-error');
  field.style.borderColor = 'var(--color-error, #ba1a1a)';
  field.focus();
}

function clearErrors(form) {
  form.querySelectorAll('.form-error').forEach(el => el.remove());
  form.querySelectorAll('input, select, textarea').forEach(el => {
    el.classList.remove('input-error');
    el.style.borderColor = '';
  });
}
