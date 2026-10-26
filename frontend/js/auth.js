/* ============================================
   Kibi — Authentication Module
   Login, signup, and session management

   Accounts live on the Kibi server; the session (including the server's
   JWT, used by storage.js for API calls) is kept in localStorage.
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

// Wait for runtime config (/api/config says whether Google sign-in is enabled)
// before wiring the Google button.
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

function getPasswordValidationError(password) {
  if (!password) return 'Password is required';
  if (password.length < 8) return 'Password must be at least 8 characters';
  if (!/[A-Z]/.test(password)) return 'Password must include an uppercase letter';
  if (!/[a-z]/.test(password)) return 'Password must include a lowercase letter';
  if (!/[0-9]/.test(password)) return 'Password must include a number';
  return '';
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

/* --- Server sign-in helpers --- */
// Store the session returned by the server ({ token, user }).
function startServerSession({ token, user }, provider) {
  setAuthSession({
    id: user.id,
    provider,
    name: user.name,
    email: user.email,
    avatar: user.avatar || user.name.charAt(0).toUpperCase(),
    token
  });
  return user;
}

function showAuthError(err) {
  if (err.field && document.getElementById(err.field)) return showFieldError(err.field, err.message);
  showToast(err.message || 'Something went wrong. Please try again.', 'error');
}

function setSubmitting(form, submitting) {
  const btn = form.querySelector('[type="submit"]');
  if (!btn) return;
  btn.disabled = submitting;
  btn.classList.toggle('opacity-70', submitting);
}

/* --- Login Form --- */
function initLoginForm(form) {
  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    clearErrors(form);

    const email = form.querySelector('#email').value.trim().toLowerCase();
    const password = form.querySelector('#password').value;

    if (!email) return showFieldError('email', 'Email is required');
    if (!isValidEmail(email)) return showFieldError('email', 'Please enter a valid email');
    if (!password) return showFieldError('password', 'Password is required');

    setSubmitting(form, true);
    let user;
    try {
      user = startServerSession(await kibiAuth.login(email, password), 'local');
    } catch (err) {
      setSubmitting(form, false);
      return showAuthError(err);
    }

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
  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    clearErrors(form);

    const name = form.querySelector('#name').value.trim();
    const email = form.querySelector('#email').value.trim().toLowerCase();
    const password = form.querySelector('#password').value;
    const confirmPassword = form.querySelector('#confirmPassword').value;
    const terms = form.querySelector('#terms');

    if (!name) return showFieldError('name', 'Name is required');
    if (name.length < 2) return showFieldError('name', 'Name must be at least 2 characters');
    if (!email) return showFieldError('email', 'Email is required');
    if (!isValidEmail(email)) return showFieldError('email', 'Please enter a valid email');
    const passwordError = getPasswordValidationError(password);
    if (passwordError) return showFieldError('password', passwordError);
    if (password !== confirmPassword) return showFieldError('confirmPassword', 'Passwords do not match');
    if (terms && !terms.checked) {
      return showFieldError('terms', 'You must agree to the Terms of Service and Privacy Policy');
    }

    setSubmitting(form, true);
    let user;
    try {
      user = startServerSession(await kibiAuth.signup(name, email, password), 'local');
    } catch (err) {
      setSubmitting(form, false);
      return showAuthError(err);
    }

    saveNotification({
      userId: user.id,
      message: `Welcome to Kibi, ${name}! Let's set up your travel profile.`,
      type: 'welcome'
    });

    showToast('Account created! 🎉', 'success');
    setTimeout(() => { window.location.href = 'onboarding.html'; }, 500);
  });
}

/* --- Continue with Google --- */
// The button sends the browser to the server (/api/auth/google), which runs the
// Google sign-in with Passport and returns to login.html#google_token=… (or #google_error=…).
function initSocialButtons() {
  document.querySelectorAll('.social-btn[data-provider="google"]').forEach(btn => {
    btn.addEventListener('click', handleGoogleLogin);
  });
  handleGoogleReturn();
}

function handleGoogleLogin() {
  if (!(window.KIBI_CONFIG && window.KIBI_CONFIG.GOOGLE_ENABLED)) {
    showToast('Google sign-in isn\'t set up yet. Please use email and password.', 'error');
    return;
  }
  window.location.href = `${KIBI_API_BASE}/auth/google`;
}

async function handleGoogleReturn() {
  const params = new URLSearchParams(window.location.hash.slice(1));
  const token = params.get('google_token');
  const error = params.get('google_error');
  const isNewAccount = params.get('google_new') === '1';
  if (!token && !error) return;

  // Remove the token from the address bar and history.
  history.replaceState(null, '', window.location.pathname + window.location.search);
  if (error) return showToast(error, 'error');

  let user;
  try {
    const data = await kibiRequest('GET', '/bootstrap', undefined, token);
    if (!data.user) throw new Error('Your Google sign-in expired. Please try again.');
    user = startServerSession({ token, user: data.user }, 'google');
  } catch (err) {
    console.error('Google sign-in failed:', err);
    return showToast(err.message || 'Could not complete Google sign-in.', 'error');
  }

  saveNotification({
    userId: user.id,
    message: isNewAccount ? `Welcome to Kibi, ${user.name}! Let's set up your travel profile.` : `Welcome back, ${user.name}! Signed in with Google.`,
    type: 'welcome'
  });

  // New accounts set up their travel profile first, the same as email sign-up.
  showToast(isNewAccount ? 'Account created! 🎉' : 'Signed in with Google! 🎉', 'success');
  setTimeout(() => { window.location.href = isNewAccount ? 'onboarding.html' : 'dashboard.html'; }, 600);
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
