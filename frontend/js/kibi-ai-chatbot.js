/* ============================================
   Kibi AI — Floating Chatbot Widget
   Self-contained IIFE — exposes nothing to window.
   Requires: window.KIBI_CONFIG.GEMINI_ENABLED (js/config.js)
             POST /api/chat, GET/DELETE /api/chat/history (backend/routes/chat.js)
   ============================================ */
(function KibiAIChatbot() {
  'use strict';

  /* --------------------------------------------------
     GUARD: Only run once
  -------------------------------------------------- */
  if (window.__tmChatbotLoaded) return;
  window.__tmChatbotLoaded = true;

  /* --------------------------------------------------
     CONSTANTS
  -------------------------------------------------- */
  // The system prompt lives on the server (backend/routes/chat.js).
  const WELCOME_MESSAGE = "Hi! I'm Kibi AI ✈️ Where would you like to travel? I can help you plan trips, find destinations, build itineraries, and more!";

  const SUGGESTED_PROMPTS = [
    { icon: '🗓️', text: 'Plan a weekend trip' },
    { icon: '💰', text: 'Find destinations under ₹10,000' },
    { icon: '📋', text: 'Create a 5-day itinerary' },
    { icon: '🔍', text: 'Discover places to visit' },
  ];

  /* --------------------------------------------------
     STATE
  -------------------------------------------------- */
  const state = {
    isOpen: false,
    isLoading: false,
    hasFirstMessage: false,
    conversationContext: [], // { role: 'user'|'assistant', content: string }[]
    signedIn: false,         // signed-in users' chats are saved to their account
  };

  /* --------------------------------------------------
     DOM REFERENCES (populated by buildDOM)
  -------------------------------------------------- */
  let triggerBtn, chatPanel, closeBtn, clearBtn, statusLabel, messagesEl,
      suggestionsEl, typingEl, inputEl, sendBtn;

  /* --------------------------------------------------
     DOM BUILDER
  -------------------------------------------------- */
  function buildDOM() {
    const root = document.createElement('div');
    root.id = 'tm-root';

    /* ---- Trigger button ---- */
    triggerBtn = document.createElement('button');
    triggerBtn.id = 'tm-trigger-btn';
    triggerBtn.className = 'tm-trigger-btn';
    triggerBtn.setAttribute('aria-label', 'Open Kibi AI chat');
    triggerBtn.setAttribute('title', '');
    triggerBtn.innerHTML = `
      <!-- Chat icon (panel closed) -->
      <svg class="tm-icon-chat" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
        <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
        <path d="M8 10 l2 0" stroke-width="2.5"/>
        <path d="M12 10 l4 0" stroke-width="2.5"/>
        <line x1="17.5" y1="7" x2="14" y2="7" stroke-width="1.5"/>
        <line x1="10" y1="7" x2="6.5" y2="7" stroke-width="1.5"/>
      </svg>
      <!-- Close icon (panel open) -->
      <svg class="tm-icon-close tm-hidden" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
        <line x1="18" y1="6" x2="6" y2="18"/>
        <line x1="6" y1="6" x2="18" y2="18"/>
      </svg>
      <span class="tm-tooltip" role="tooltip">Ask Kibi AI</span>
    `;

    /* ---- Chat panel ---- */
    chatPanel = document.createElement('div');
    chatPanel.id = 'tm-chat-panel';
    chatPanel.className = 'tm-chat-panel';
    chatPanel.setAttribute('role', 'dialog');
    chatPanel.setAttribute('aria-label', 'Kibi AI chat');
    chatPanel.setAttribute('aria-hidden', 'true');

    /* Header */
    const header = document.createElement('div');
    header.className = 'tm-panel-header';
    header.innerHTML = `
      <div class="tm-header-left">
        <div class="tm-header-icon" aria-hidden="true">✈️</div>
        <div>
          <p class="tm-header-title">Kibi AI</p>
          <div class="tm-header-status">
            <span class="tm-status-dot" aria-hidden="true"></span>
            <span class="tm-status-label">Online</span>
          </div>
        </div>
      </div>
    `;
    const actions = document.createElement('div');
    actions.className = 'tm-header-actions';
    clearBtn = document.createElement('button');
    clearBtn.className = 'tm-header-close tm-header-clear tm-hidden';
    clearBtn.setAttribute('aria-label', 'Clear chat history');
    clearBtn.setAttribute('title', 'Clear chat history');
    clearBtn.innerHTML = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/><path d="M10 11v6"/><path d="M14 11v6"/><path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2"/></svg>`;
    closeBtn = document.createElement('button');
    closeBtn.className = 'tm-header-close';
    closeBtn.setAttribute('aria-label', 'Close Kibi AI chat');
    closeBtn.innerHTML = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>`;
    actions.appendChild(clearBtn);
    actions.appendChild(closeBtn);
    header.appendChild(actions);
    statusLabel = header.querySelector('.tm-status-label');

    /* Messages */
    messagesEl = document.createElement('div');
    messagesEl.id = 'tm-messages';
    messagesEl.className = 'tm-messages';
    messagesEl.setAttribute('role', 'log');
    messagesEl.setAttribute('aria-live', 'polite');
    messagesEl.setAttribute('aria-label', 'Chat messages');

    /* Suggestions */
    suggestionsEl = document.createElement('div');
    suggestionsEl.id = 'tm-suggestions';
    suggestionsEl.className = 'tm-suggestions';
    SUGGESTED_PROMPTS.forEach(function(p) {
      const btn = document.createElement('button');
      btn.className = 'tm-suggestion-btn';
      btn.type = 'button';
      btn.dataset.prompt = p.text;
      btn.textContent = p.icon + ' ' + p.text;
      suggestionsEl.appendChild(btn);
    });

    /* Typing indicator */
    typingEl = document.createElement('div');
    typingEl.id = 'tm-typing';
    typingEl.className = 'tm-typing tm-hidden';
    typingEl.setAttribute('aria-hidden', 'true');
    typingEl.innerHTML = `
      <span class="tm-typing-dot"></span>
      <span class="tm-typing-dot"></span>
      <span class="tm-typing-dot"></span>
    `;

    /* Input row */
    const inputRow = document.createElement('div');
    inputRow.className = 'tm-input-row';
    inputEl = document.createElement('textarea');
    inputEl.id = 'tm-input';
    inputEl.className = 'tm-input';
    inputEl.setAttribute('placeholder', 'Ask me about your next trip\u2026');
    inputEl.setAttribute('aria-label', 'Message Kibi AI');
    inputEl.setAttribute('rows', '1');
    inputEl.setAttribute('maxlength', '2000');

    sendBtn = document.createElement('button');
    sendBtn.id = 'tm-send-btn';
    sendBtn.className = 'tm-send-btn';
    sendBtn.type = 'button';
    sendBtn.setAttribute('aria-label', 'Send message');
    sendBtn.innerHTML = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/></svg>`;

    inputRow.appendChild(inputEl);
    inputRow.appendChild(sendBtn);

    /* Assemble panel */
    chatPanel.appendChild(header);
    chatPanel.appendChild(messagesEl);
    chatPanel.appendChild(suggestionsEl);
    chatPanel.appendChild(typingEl);
    chatPanel.appendChild(inputRow);

    /* Assemble root */
    root.appendChild(triggerBtn);
    root.appendChild(chatPanel);

    document.body.appendChild(root);
  }

  /* --------------------------------------------------
     PANEL OPEN / CLOSE
  -------------------------------------------------- */
  function openPanel() {
    state.isOpen = true;
    chatPanel.classList.add('tm-panel-open');
    chatPanel.setAttribute('aria-hidden', 'false');
    triggerBtn.setAttribute('aria-label', 'Close Kibi AI chat');
    triggerBtn.querySelector('.tm-icon-chat').classList.add('tm-hidden');
    triggerBtn.querySelector('.tm-icon-close').classList.remove('tm-hidden');

    // Move focus to input after transition
    setTimeout(function() {
      if (state.isOpen) {
        (inputEl || closeBtn).focus();
      }
    }, 300);
  }

  function closePanel() {
    state.isOpen = false;
    chatPanel.classList.remove('tm-panel-open');
    chatPanel.setAttribute('aria-hidden', 'true');
    triggerBtn.setAttribute('aria-label', 'Open Kibi AI chat');
    triggerBtn.querySelector('.tm-icon-chat').classList.remove('tm-hidden');
    triggerBtn.querySelector('.tm-icon-close').classList.add('tm-hidden');
    triggerBtn.focus();
  }

  /* --------------------------------------------------
     OVERLAP AVOIDANCE
  -------------------------------------------------- */
  function avoidOverlap() {
    try {
      var triggerRect = triggerBtn.getBoundingClientRect();
      var fixedEls = Array.prototype.slice.call(
        document.querySelectorAll('[style*="position: fixed"],[style*="position:fixed"]')
      ).filter(function(el) {
        return el !== triggerBtn && el.id !== 'tm-root';
      });

      var extraOffset = 0;
      fixedEls.forEach(function(el) {
        var r = el.getBoundingClientRect();
        var overlaps =
          r.right > triggerRect.left && r.left < triggerRect.right &&
          r.bottom > triggerRect.top && r.top < triggerRect.bottom;
        if (overlaps) {
          extraOffset = Math.max(extraOffset, triggerRect.bottom - r.top + 12);
        }
      });
      if (extraOffset > 0) {
        triggerBtn.style.bottom = 'calc(1.5rem + ' + extraOffset + 'px)';
      }
    } catch(e) {
      // Non-critical — ignore
    }
  }

  /* --------------------------------------------------
     MESSAGE HELPERS
  -------------------------------------------------- */
  function escapeHtml(str) {
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }

  function formatResponse(raw) {
    // Escape first to prevent XSS, then apply markdown formatting
    var safe = escapeHtml(raw);
    return safe
      .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
      .replace(/\n/g, '<br>');
  }

  function appendMessage(role, content, asHTML) {
    var el = document.createElement('div');
    el.className = role === 'user' ? 'tm-msg-user' : 'tm-msg-ai';
    if (asHTML) {
      el.innerHTML = content;
    } else {
      el.textContent = content;
    }
    messagesEl.appendChild(el);
    scrollToBottom();
    return el;
  }

  function showTypingIndicator() {
    typingEl.classList.remove('tm-hidden');
    typingEl.setAttribute('aria-hidden', 'false');
    scrollToBottom();
  }

  function hideTypingIndicator() {
    typingEl.classList.add('tm-hidden');
    typingEl.setAttribute('aria-hidden', 'true');
  }

  function scrollToBottom() {
    messagesEl.scrollTop = messagesEl.scrollHeight;
  }

  function hideSuggestions() {
    suggestionsEl.style.display = 'none';
  }

  function disableInput() {
    inputEl.disabled = true;
    sendBtn.disabled = true;
  }

  function enableInput() {
    inputEl.disabled = false;
    sendBtn.disabled = false;
  }

  function clearInput() {
    inputEl.value = '';
    inputEl.style.height = 'auto';
  }

  /* --------------------------------------------------
     CONTEXT MANAGEMENT
  -------------------------------------------------- */
  function appendToContext(role, content) {
    if (state.conversationContext.length >= 50) {
      // Remove oldest user+assistant pair
      state.conversationContext.splice(0, 2);
    }
    state.conversationContext.push({ role: role, content: content });
  }

  /* --------------------------------------------------
     SERVER (chat + saved history)
  -------------------------------------------------- */
  function apiBase() {
    return (window.KIBI_API_BASE || '/api').replace(/\/$/, '');
  }

  function getAuthToken() {
    try {
      var session = JSON.parse(localStorage.getItem('kibi_auth_user'));
      return (session && session.token) || null;
    } catch (e) {
      return null;
    }
  }

  function apiFetch(method, path, body) {
    var headers = {};
    var token = getAuthToken();
    if (token) headers.Authorization = 'Bearer ' + token;
    if (body !== undefined) headers['Content-Type'] = 'application/json';
    return fetch(apiBase() + path, {
      method: method,
      headers: headers,
      body: body === undefined ? undefined : JSON.stringify(body)
    });
  }

  function setSignedIn(signedIn) {
    state.signedIn = signedIn;
    clearBtn.classList.toggle('tm-hidden', !signedIn);
    statusLabel.textContent = signedIn ? 'Online · chats saved' : 'Online · log in to save chats';
  }

  function showWelcome() {
    messagesEl.innerHTML = '';
    appendMessage('assistant', WELCOME_MESSAGE, false);
    suggestionsEl.style.display = '';
  }

  // Restore a signed-in user's saved conversation
  async function loadHistory() {
    if (!getAuthToken()) { setSignedIn(false); return; }
    try {
      var res = await apiFetch('GET', '/chat/history');
      if (!res.ok) { setSignedIn(false); return; }
      var data = await res.json();
      setSignedIn(true);
      var messages = data.messages || [];
      if (!messages.length || state.hasFirstMessage) return;
      messages.forEach(function(m) {
        appendMessage(m.role, m.role === 'user' ? escapeHtml(m.content) : formatResponse(m.content), true);
      });
      state.conversationContext = messages.map(function(m) { return { role: m.role, content: m.content }; });
      state.hasFirstMessage = true;
      hideSuggestions();
    } catch (e) {
      setSignedIn(false);
    }
  }

  async function clearHistory() {
    if (state.isLoading) return;
    if (!window.confirm('Clear your Kibi AI chat history? This cannot be undone.')) return;
    try {
      var res = await apiFetch('DELETE', '/chat/history');
      if (!res.ok) throw new Error('HTTP ' + res.status);
      state.conversationContext = [];
      state.hasFirstMessage = false;
      showWelcome();
    } catch (e) {
      appendMessage('assistant', "Sorry, I couldn't clear your chat history. Please try again.", false);
    }
  }

  /* --------------------------------------------------
     FORMAT RESPONSE
  -------------------------------------------------- */
  // Already defined above as formatResponse()

  /* --------------------------------------------------
     SEND MESSAGE
  -------------------------------------------------- */
  async function sendMessage(userText) {
    if (state.isLoading) return;
    if (!userText || !userText.trim()) return;

    var trimmed = userText.trim();

    // Check that Kibi AI is enabled on the server (GEMINI_API_KEY in backend/.env)
    if (window.KIBI_CONFIG_READY) {
      try { await window.KIBI_CONFIG_READY; } catch (e) {}
    }
    var aiEnabled = window.KIBI_CONFIG && window.KIBI_CONFIG.GEMINI_ENABLED;
    if (!aiEnabled) {
      appendMessage('assistant', 'Kibi AI is not configured yet. Please add GEMINI_API_KEY to the server settings to start chatting! 🔑', false);
      hideSuggestions();
      state.isLoading = false;
      return;
    }

    state.isLoading = true;
    state.hasFirstMessage = true;

    // Guests' chats aren't stored, so the page sends its own history with each message
    var history = state.signedIn ? undefined : state.conversationContext.slice();
    appendToContext('user', trimmed);
    clearInput();
    appendMessage('user', escapeHtml(trimmed), true);
    hideSuggestions();
    showTypingIndicator();
    disableInput();

    try {
      var res = await apiFetch('POST', '/chat', { message: trimmed, history: history });
      var data = await res.json().catch(function() { return {}; });

      hideTypingIndicator();

      if (!res.ok || !data.text) {
        throw new Error(data.error || 'Empty response from Kibi AI');
      }
      if (data.saved !== state.signedIn) setSignedIn(!!data.saved);
      var response = data.text;

      var formatted = formatResponse(response);
      appendMessage('assistant', formatted, true);
      appendToContext('assistant', response);
    } catch (err) {
      hideTypingIndicator();
      appendMessage('assistant', "Sorry, I couldn't get a response. Please try again. 🙏", false);
      // Roll back the failed user context entry
      if (state.conversationContext.length > 0) {
        state.conversationContext.pop();
      }
    } finally {
      state.isLoading = false;
      enableInput();
      scrollToBottom();
      try { inputEl.focus(); } catch(e) {}
    }
  }

  /* --------------------------------------------------
     EVENT BINDING
  -------------------------------------------------- */
  function bindEvents() {
    // Toggle panel
    triggerBtn.addEventListener('click', function(e) {
      e.stopPropagation();
      if (state.isOpen) {
        closePanel();
      } else {
        openPanel();
      }
    });

    // Close button
    closeBtn.addEventListener('click', function(e) {
      e.stopPropagation();
      closePanel();
    });

    // Escape key
    document.addEventListener('keydown', function(e) {
      if (e.key === 'Escape' && state.isOpen) {
        closePanel();
      }
    });

    // Enter to send / Shift+Enter for newline
    inputEl.addEventListener('keydown', function(e) {
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        sendMessage(inputEl.value);
      }
    });

    clearBtn.addEventListener('click', function(e) {
      e.stopPropagation();
      clearHistory();
    });

    // Send button click
    sendBtn.addEventListener('click', function() {
      sendMessage(inputEl.value);
    });

    // Suggestion buttons
    var suggestionBtns = suggestionsEl.querySelectorAll('.tm-suggestion-btn');
    suggestionBtns.forEach(function(btn) {
      btn.addEventListener('click', function() {
        sendMessage(btn.dataset.prompt);
      });
    });

    // Auto-resize textarea
    inputEl.addEventListener('input', function() {
      inputEl.style.height = 'auto';
      inputEl.style.height = Math.min(inputEl.scrollHeight, 120) + 'px';
    });
  }

  /* --------------------------------------------------
     INIT
  -------------------------------------------------- */
  function init() {
    try {
      buildDOM();
      bindEvents();
      avoidOverlap();

      // Show welcome message, then any saved conversation for signed-in users
      appendMessage('assistant', WELCOME_MESSAGE, false);
      loadHistory();
    } catch (e) {
      console.warn('[Kibi AI] Widget failed to initialize:', e);
      // Clean exit — don't let errors propagate to host page
    }
  }

  // Start once the page is ready; the server config is checked when a message is sent
  function startWhenReady() {
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', init);
    } else {
      init();
    }
  }

  startWhenReady();

})();
