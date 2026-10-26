/* ============================================
   Kibi — Onboarding Wizard
   5-step interactive preference selection
   ============================================ */

document.addEventListener('DOMContentLoaded', () => {
  const user = requireAuth();
  if (!user) return;

  initNav('onboarding');

  let currentStep = 1;
  const totalSteps = 5;

  // State
  const preferences = {
    travelStyle: [],
    budget: '',
    socialPreference: '',
    interests: [],
    travelPace: ''
  };

  // Initialize chip selections
  initChips();
  initBudgetSelection();
  initSocialSlider();
  initPaceSelection();
  updateProgress();

  /* --- Step Navigation --- */
  document.querySelectorAll('.onboarding-next').forEach(btn => {
    btn.addEventListener('click', () => {
      if (validateStep(currentStep)) {
        if (currentStep < totalSteps) {
          goToStep(currentStep + 1);
        } else {
          completeOnboarding();
        }
      }
    });
  });

  document.querySelectorAll('.onboarding-back').forEach(btn => {
    btn.addEventListener('click', () => {
      if (currentStep > 1) {
        goToStep(currentStep - 1);
      }
    });
  });

  function goToStep(step) {
    // Hide current
    const currentEl = document.querySelector(`.onboarding-step[data-step="${currentStep}"]`);
    if (currentEl) {
      currentEl.classList.remove('active');
    }

    // Show next
    currentStep = step;
    const nextEl = document.querySelector(`.onboarding-step[data-step="${currentStep}"]`);
    if (nextEl) {
      nextEl.classList.add('active');
    }

    updateProgress();
  }

  function updateProgress() {
    document.querySelectorAll('.progress-step').forEach((step, i) => {
      step.classList.toggle('active', i + 1 === currentStep);
      step.classList.toggle('completed', i + 1 < currentStep);
    });

    // Update step counter
    const counter = document.getElementById('stepCounter');
    if (counter) counter.textContent = `${currentStep} of ${totalSteps}`;
  }

  function validateStep(step) {
    switch (step) {
      case 1:
        if (preferences.travelStyle.length === 0) {
          showToast('Please select at least one travel style', 'error');
          return false;
        }
        return true;
      case 2:
        if (!preferences.budget) {
          showToast('Please select your budget range', 'error');
          return false;
        }
        return true;
      case 3:
        if (!preferences.socialPreference) {
          showToast('Please set your social comfort level', 'error');
          return false;
        }
        return true;
      case 4:
        if (preferences.interests.length === 0) {
          showToast('Please select at least one interest', 'error');
          return false;
        }
        return true;
      case 5:
        if (!preferences.travelPace) {
          showToast('Please select your travel pace', 'error');
          return false;
        }
        return true;
      default:
        return true;
    }
  }

  /* --- Chip Selection (Travel Style & Interests) --- */
  function initChips() {
    // Travel Style Chips (Step 1)
    document.querySelectorAll('#styleChips .chip').forEach(chip => {
      chip.addEventListener('click', () => {
        chip.classList.toggle('active');
        const value = chip.dataset.value;
        if (preferences.travelStyle.includes(value)) {
          preferences.travelStyle = preferences.travelStyle.filter(v => v !== value);
        } else {
          preferences.travelStyle.push(value);
        }
        updatePreview();
      });
    });

    // Interest Chips (Step 4)
    document.querySelectorAll('#interestChips .chip').forEach(chip => {
      chip.addEventListener('click', () => {
        chip.classList.toggle('active');
        const value = chip.dataset.value;
        if (preferences.interests.includes(value)) {
          preferences.interests = preferences.interests.filter(v => v !== value);
        } else {
          preferences.interests.push(value);
        }
        updatePreview();
      });
    });
  }

  /* --- Budget Selection --- */
  function initBudgetSelection() {
    document.querySelectorAll('#budgetChips .chip').forEach(chip => {
      chip.addEventListener('click', () => {
        document.querySelectorAll('#budgetChips .chip').forEach(c => c.classList.remove('active'));
        chip.classList.add('active');
        preferences.budget = chip.dataset.value;
        updatePreview();
      });
    });
  }

  /* --- Social Comfort Slider --- */
  function initSocialSlider() {
    const slider = document.getElementById('socialSlider');
    const description = document.getElementById('socialDescription');
    const levelLabel = document.getElementById('socialLevel');

    if (!slider) return;

    const descriptions = {
      1: { label: 'Prefer Solo', text: 'You prefer traveling alone — your own pace, your own space. Complete freedom.' },
      2: { label: '1–2 Companions', text: '1–2 travel companions might feel right for you. Meaningful connections without the crowd.' },
      3: { label: 'Small Group', text: 'Small groups (3–6 people) with similar interests. Comfortable, low-pressure social travel.' },
      4: { label: 'Social', text: 'You enjoy meeting new people and socializing. Group activities and shared experiences.' },
      5: { label: 'Highly Social', text: 'You love being surrounded by people! Big groups, events, and constant social interaction.' }
    };

    slider.addEventListener('input', () => {
      const level = parseInt(slider.value);
      const desc = descriptions[level];

      // Animate text change
      description.classList.add('changing');
      setTimeout(() => {
        description.textContent = desc.text;
        if (levelLabel) levelLabel.textContent = desc.label;
        description.classList.remove('changing');
      }, 150);

      preferences.socialPreference = desc.label;
      updatePreview();
    });

    // Set default
    preferences.socialPreference = descriptions[3].label;
  }

  /* --- Pace Selection --- */
  function initPaceSelection() {
    document.querySelectorAll('#paceChips .chip').forEach(chip => {
      chip.addEventListener('click', () => {
        document.querySelectorAll('#paceChips .chip').forEach(c => c.classList.remove('active'));
        chip.classList.add('active');
        preferences.travelPace = chip.dataset.value;
        updatePreview();
      });
    });
  }

  /* --- Update Preview Card --- */
  function updatePreview() {
    const previewEl = document.getElementById('previewCard');
    if (!previewEl) return;

    const personality = getPersonalityFromPrefs(preferences);

    previewEl.innerHTML = `
      <div class="preview-card-header flex items-center gap-3 mb-3">
        <div class="preview-card-avatar w-10 h-10 rounded-full bg-sage text-white flex items-center justify-center font-semibold">${user.name.charAt(0)}</div>
        <div>
          <strong class="text-text-main">${user.name}</strong>
          <div class="text-small text-sage">${personality}</div>
        </div>
      </div>
      ${preferences.travelStyle.length > 0 ? `
        <div class="preview-card-detail flex justify-between py-2 border-b border-border-light text-sm">
          <span class="text-text-muted">Style</span>
          <span class="text-text-main">${preferences.travelStyle.join(' · ')}</span>
        </div>
      ` : ''}
      ${preferences.budget ? `
        <div class="preview-card-detail flex justify-between py-2 border-b border-border-light text-sm">
          <span class="text-text-muted">Budget</span>
          <span class="text-text-main">${getBudgetLabel(preferences.budget)}</span>
        </div>
      ` : ''}
      ${preferences.socialPreference ? `
        <div class="preview-card-detail flex justify-between py-2 border-b border-border-light text-sm">
          <span class="text-text-muted">Social</span>
          <span class="text-text-main">${preferences.socialPreference}</span>
        </div>
      ` : ''}
      ${preferences.interests.length > 0 ? `
        <div class="preview-card-detail flex justify-between py-2 border-b border-border-light text-sm">
          <span class="text-text-muted">Interests</span>
          <span class="text-text-main">${preferences.interests.slice(0, 3).join(' · ')}</span>
        </div>
      ` : ''}
      ${preferences.travelPace ? `
        <div class="preview-card-detail flex justify-between py-2 border-b border-border-light text-sm">
          <span class="text-text-muted">Pace</span>
          <span class="text-text-main">${preferences.travelPace}</span>
        </div>
      ` : ''}
    `;
  }

  function getPersonalityFromPrefs(prefs) {
    if (prefs.travelStyle.includes('Nature') && prefs.travelStyle.includes('Photography')) return 'Nature Explorer';
    if (prefs.travelStyle.includes('Adventure')) return 'Adventure Seeker';
    if (prefs.travelStyle.includes('Culture')) return 'Culture Enthusiast';
    if (prefs.travelStyle.includes('Relaxed')) return 'Relaxed Wanderer';
    if (prefs.travelStyle.includes('Food')) return 'Food Explorer';
    if (prefs.travelStyle.includes('Nature')) return 'Nature Lover';
    return 'Explorer';
  }

  /* --- Complete Onboarding --- */
  function completeOnboarding() {
    // Save preferences to user
    savePreferences(user.id, preferences);

    // Notification
    saveNotification({
      userId: user.id,
      message: 'Your travel profile is ready! Start planning your first trip.',
      type: 'profile_complete'
    });

    showToast('Profile complete! Let\'s explore 🌍', 'success');

    setTimeout(() => {
      window.location.href = 'dashboard.html';
    }, 800);
  }
});
