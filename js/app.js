const Factory = (() => {
  let apiKey = null;
  let model = 'deepseek/deepseek-chat';

  async function init() {
    await DB.open();
    await loadApiKey();
    await loadModel();
    setupNav();
    await refreshDashboard();
    await Channels.refresh();

    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.register('sw.js').catch(() => {});
    }

    toast('YouTube Factory loaded', 'info');
  }

  function setupNav() {
    document.querySelectorAll('.nav-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        nav(btn.dataset.panel);
      });
    });
  }

  function nav(panel) {
    document.querySelectorAll('.nav-btn').forEach(b => b.classList.remove('active'));
    document.querySelectorAll('.panel').forEach(p => p.classList.remove('active'));

    const btn = document.querySelector(`[data-panel="${panel}"]`);
    const pnl = document.getElementById(`panel-${panel}`);

    if (btn) btn.classList.add('active');
    if (pnl) pnl.classList.add('active');

    if (panel === 'scripts') ScriptLib.refresh();
    if (panel === 'editor') Editor.refresh();
    if (panel === 'srt') SRT.refresh();
    if (panel === 'seo') SEO.refresh();
    if (panel === 'thumbnail') Thumbnail.refresh();
    if (panel === 'repurpose') Repurpose.refresh();
    if (panel === 'analytics') Analytics.refresh();
    if (panel === 'hooks') Hooks.refresh();
    if (panel === 'ctr') CTR.refresh();
    if (panel === 'batch') Batch.refresh();
    if (panel === 'trends') Trends.refresh();
    if (panel === 'dashboard') refreshDashboard();
  }

  async function loadApiKey() {
    const encrypted = await DB.getSetting('apiKey');
    if (encrypted) {
      apiKey = await Crypto.decrypt(encrypted);
    }
  }

  async function saveApiKey() {
    const raw = document.getElementById('api-key-input').value.trim();
    if (!raw) return toast('Enter an API key', 'error');

    const encrypted = await Crypto.encrypt(raw);
    if (!encrypted) return toast('Encryption failed', 'error');

    await DB.setSetting('apiKey', encrypted);
    apiKey = raw;
    document.getElementById('api-key-input').value = '';
    document.getElementById('api-status').textContent = '✅ Key saved (encrypted)';
    toast('API key saved securely', 'success');
  }

  async function testApiKey() {
    if (!apiKey) return toast('No API key saved', 'error');

    showLoading('Testing connection...');
    try {
      const result = await callLLM('Respond with exactly: CONNECTION_OK');
      hideLoading();
      if (result && result.includes('CONNECTION_OK')) {
        document.getElementById('api-status').textContent = '✅ Connection successful';
        toast('API connection working', 'success');
      } else {
        document.getElementById('api-status').textContent = '⚠️ Connected but unexpected response';
        toast('Connected but check model availability', 'warning');
      }
    } catch (e) {
      hideLoading();
      document.getElementById('api-status').textContent = '❌ Connection failed: ' + e.message;
      toast('Connection failed', 'error');
    }
  }

  async function clearApiKey() {
    if (!confirm('Clear stored API key?')) return;
    await DB.setSetting('apiKey', null);
    apiKey = null;
    document.getElementById('api-status').textContent = '🔑 Key cleared';
    toast('API key removed', 'info');
  }

  async function loadModel() {
    const saved = await DB.getSetting('model');
    if (saved) {
      model = saved;
      document.getElementById('model-select').value = model;
    }
  }

  async function saveModel() {
    model = document.getElementById('model-select').value;
    await DB.setSetting('model', model);
    toast('Model saved: ' + model, 'success');
  }

  async function callLLM(userPrompt, systemPrompt = Prompts.SYSTEM, retries = 3) {
    if (!apiKey) throw new Error('No API key configured. Go to Settings.');

    for (let attempt = 1; attempt <= retries; attempt++) {
      try {
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), 120000);

        const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${apiKey}`,
            'Content-Type': 'application/json',
            'HTTP-Referer': window.location.origin,
            'X-Title': 'YouTube Factory'
          },
          body: JSON.stringify({
            model: model,
            messages: [
              { role: 'system', content: systemPrompt },
              { role: 'user', content: userPrompt }
            ],
            temperature: 0.7,
            max_tokens: 4096
          }),
          signal: controller.signal
        });

        clearTimeout(timeout);

        if (response.status === 429) {
          const wait = Math.pow(2, attempt) * 1000;
          toast(`Rate limited. Retrying in ${wait / 1000}s...`, 'warning');
          await sleep(wait);
          continue;
        }

        if (!response.ok) {
          const err = await response.json().catch(() => ({}));
          throw new Error(err.error?.message || `HTTP ${response.status}`);
        }

        const data = await response.json();

        if (!data.choices || !data.choices[0]) {
          throw new Error('Empty response from API');
        }

        return data.choices[0].message.content.trim();

      } catch (e) {
        if (e.name === 'AbortError') {
          toast('Request timed out', 'warning');
        }
        if (attempt === retries) throw e;
        await sleep(Math.pow(2, attempt) * 1000);
      }
    }
  }

  function parseJSON(text) {
    let cleaned = text.trim();
    cleaned = cleaned.replace(/^```json?\s*/i, '').replace(/```\s*$/i, '');
    cleaned = cleaned.trim();

    try {
      return JSON.parse(cleaned);
    } catch (e) {
      const arrMatch = cleaned.match(/\[[\s\S]*\]/);
      if (arrMatch) {
        try { return JSON.parse(arrMatch[0]); } catch {}
      }
      const objMatch = cleaned.match(/\{[\s\S]*\}/);
      if (objMatch) {
        try { return JSON.parse(objMatch[0]); } catch {}
      }
      throw new Error('Failed to parse JSON response');
    }
  }

  async function refreshDashboard() {
    const channels = await DB.getAll('channels');
    const scripts = await DB.getAll('scripts');

    document.getElementById('stat-channels').textContent = channels.length;
    document.getElementById('stat-scripts').textContent = scripts.length;
    document.getElementById('stat-approved').textContent =
      scripts.filter(s => s.status === 'approved').length;
    document.getElementById('stat-pending').textContent =
      scripts.filter(s => s.status === 'draft').length;

    const recent = scripts.slice(-5).reverse();
    const container = document.getElementById('recent-scripts');
    container.innerHTML = '';
    recent.forEach(s => {
      const card = document.createElement('div');
      card.className = 'script-card';
      card.innerHTML = `
        <h3>${esc(s.title || 'Untitled')}</h3>
        <div class="meta">
          <span class="status-badge status-${s.status || 'draft'}">${s.status || 'draft'}</span>
          <span>${s.format || 'unknown'}</span>
          <span>${new Date(s.createdAt).toLocaleDateString()}</span>
        </div>
      `;
      container.appendChild(card);
    });
  }

  async function exportAll() {
    const data = await DB.exportAll();
    data.exportDate = new Date().toISOString();
    data.version = '1.0';

    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `yt-factory-backup-${Date.now()}.json`;
    link.click();
    URL.revokeObjectURL(link.href);
    toast('Data exported', 'success');
  }

  async function importAll(event) {
    const file = event.target.files[0];
    if (!file) return;

    try {
      const text = await file.text();
      const data = JSON.parse(text);
      await DB.importAll(data);
      toast('Data imported successfully', 'success');
      await refreshDashboard();
      await Channels.refresh();
    } catch (e) {
      toast('Import failed: ' + e.message, 'error');
    }

    event.target.value = '';
  }

  async function clearAll() {
    if (!confirm('⚠️ Delete ALL data? This cannot be undone.')) return;
    if (!confirm('Are you absolutely sure?')) return;

    await DB.clearAll();
    toast('All data cleared', 'info');
    await refreshDashboard();
    await Channels.refresh();
  }

  // Utilities
  function toast(msg, type = 'info') {
    const container = document.getElementById('toast-container');
    const el = document.createElement('div');
    el.className = `toast toast-${type}`;
    el.textContent = msg;
    container.appendChild(el);
    setTimeout(() => el.remove(), 4000);
  }

  function showLoading(text = 'Processing...') {
    document.getElementById('loading-text').textContent = text;
    document.getElementById('loading-overlay').style.display = 'flex';
  }

  function hideLoading() {
    document.getElementById('loading-overlay').style.display = 'none';
  }

  function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

  function esc(str) {
    const d = document.createElement('div');
    d.textContent = str;
    return d.innerHTML;
  }

  async function getChannelSelectHTML(selectedId = '') {
    const channels = await DB.getAll('channels');
    return channels.map(c =>
      `<option value="${c.id}" ${c.id == selectedId ? 'selected' : ''}>${esc(c.name)}</option>`
    ).join('');
  }

  async function populateChannelSelects() {
    const options = await getChannelSelectHTML();
    const selects = [
      'batch-channel', 'trend-channel', 'filter-channel',
      'hook-channel', 'ctr-channel'
    ];
    selects.forEach(id => {
      const el = document.getElementById(id);
      if (el) {
        const first = el.querySelector('option')?.outerHTML || '';
        el.innerHTML = first + options;
      }
    });
  }

  document.addEventListener('DOMContentLoaded', init);

  return {
    nav, callLLM, parseJSON, toast, showLoading, hideLoading,
    sleep, esc, saveApiKey, testApiKey, clearApiKey, saveModel,
    exportAll, importAll, clearAll, refreshDashboard,
    populateChannelSelects, getChannelSelectHTML
  };
})();