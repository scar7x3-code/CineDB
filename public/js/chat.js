/* ─────────────────────────────────────────────────────────
   CineDB — chat.js
   Compact movie/series recommendation assistant panel.
───────────────────────────────────────────────────────── */

(function initChatWidget() {
  const widget   = document.getElementById('chatWidget');
  const toggle   = document.getElementById('chatToggle');
  const panel    = document.getElementById('chatPanel');
  const closeBtn = document.getElementById('chatClose');
  const form     = document.getElementById('chatForm');
  const input    = document.getElementById('chatInput');
  const messages = document.getElementById('chatMessages');
  const sendBtn  = document.getElementById('chatSend');

  if (!widget || !toggle || !panel || !form || !input || !messages) return;

  const history = [];
  let open = false;
  let busy = false;

  const WELCOME =
    'Hola. Puedo recomendarte películas y series según tus gustos. ¿Qué te apetece ver?';

  function setOpen(next) {
    open = next;
    panel.hidden = !open;
    toggle.setAttribute('aria-expanded', String(open));
    if (open) {
      if (!history.length) appendMessage('assistant', WELCOME);
      input.focus();
    }
  }

  function scrollToBottom() {
    messages.scrollTop = messages.scrollHeight;
  }

  function formatAssistantText(text) {
    const escaped = escapeHtml(text);
    return escaped
      .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
      .replace(/\*(.+?)\*/g, '<em>$1</em>')
      .replace(/\n/g, '<br>');
  }

  function appendMessage(role, text) {
    const row = document.createElement('div');
    row.className = `chat-msg chat-msg--${role}`;
    row.innerHTML = role === 'assistant'
      ? `<div class="chat-bubble">${formatAssistantText(text)}</div>`
      : `<div class="chat-bubble">${escapeHtml(text)}</div>`;
    messages.appendChild(row);
    scrollToBottom();
    return row;
  }

  function setBusy(next) {
    busy = next;
    input.disabled = busy;
    sendBtn.disabled = busy;
    widget.classList.toggle('chat-widget--busy', busy);
  }

  function showTyping() {
    const row = document.createElement('div');
    row.className = 'chat-msg chat-msg--assistant chat-msg--typing';
    row.id = 'chatTyping';
    row.innerHTML = `
      <div class="chat-bubble">
        <span class="chat-typing-dot"></span>
        <span class="chat-typing-dot"></span>
        <span class="chat-typing-dot"></span>
      </div>`;
    messages.appendChild(row);
    scrollToBottom();
  }

  function hideTyping() {
    document.getElementById('chatTyping')?.remove();
  }

  async function sendMessage(text) {
    const trimmed = text.trim();
    if (!trimmed || busy) return;

    appendMessage('user', trimmed);
    history.push({ role: 'user', content: trimmed });
    input.value = '';
    setBusy(true);
    showTyping();

    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messages: history }),
      });

      hideTyping();

      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        const err = data.error || 'No pude responder ahora. Inténtalo de nuevo.';
        appendMessage('assistant', err);
        history.pop();
        return;
      }

      const reply = String(data.reply || '').trim();
      if (!reply) {
        appendMessage('assistant', 'No obtuve una respuesta útil. ¿Puedes reformular tu pregunta?');
        history.pop();
        return;
      }

      appendMessage('assistant', reply);
      history.push({ role: 'assistant', content: reply });
    } catch {
      hideTyping();
      appendMessage('assistant', 'Error de conexión. Comprueba tu red e inténtalo otra vez.');
      history.pop();
    } finally {
      setBusy(false);
      if (open) input.focus();
    }
  }

  toggle.addEventListener('click', () => setOpen(!open));
  closeBtn?.addEventListener('click', () => setOpen(false));

  form.addEventListener('submit', (e) => {
    e.preventDefault();
    sendMessage(input.value);
  });

  input.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage(input.value);
    }
  });

  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && open) setOpen(false);
  });
})();
