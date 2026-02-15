const Editor = (() => {
  let currentId = null;

  async function refresh() {
    const scripts = await DB.getAll('scripts');
    const sel = document.getElementById('editor-script-select');
    sel.innerHTML = '<option value="">Select Script to Edit</option>';
    scripts.forEach(s => {
      const opt = document.createElement('option');
      opt.value = s.id;
      opt.textContent = `[${s.status}] ${s.title || 'Untitled'} (${s.format})`;
      sel.appendChild(opt);
    });
  }

  async function load() {
    const id = parseInt(document.getElementById('editor-script-select').value);
    if (!id) return clear();

    const s = await DB.get('scripts', id);
    if (!s) return;

    currentId = s.id;
    document.getElementById('editor-title').value = s.title || '';
    document.getElementById('editor-hook').value = s.hook || '';
    document.getElementById('editor-script').value = s.script || '';
    document.getElementById('editor-cta').value = s.cta || '';
    document.getElementById('editor-thumbnail').value = s.thumbnailAngle || '';
    document.getElementById('editor-format').value = s.format || '';
    document.getElementById('editor-channel').value = s.channelName || '';

    const badge = document.getElementById('editor-status-badge');
    badge.className = `status-badge status-${s.status || 'draft'}`;
    badge.textContent = s.status || 'draft';
  }

  function clear() {
    currentId = null;
    ['editor-title', 'editor-hook', 'editor-script', 'editor-cta',
     'editor-thumbnail', 'editor-format', 'editor-channel'].forEach(id => {
      document.getElementById(id).value = '';
    });
    document.getElementById('editor-status-badge').textContent = '';
    document.getElementById('editor-status-badge').className = '';
  }

  async function save() {
    if (!currentId) return Factory.toast('No script selected', 'error');

    const s = await DB.get('scripts', currentId);
    s.title = document.getElementById('editor-title').value.trim();
    s.hook = document.getElementById('editor-hook').value.trim();
    s.script = document.getElementById('editor-script').value.trim();
    s.cta = document.getElementById('editor-cta').value.trim();
    s.thumbnailAngle = document.getElementById('editor-thumbnail').value.trim();
    s.updatedAt = new Date().toISOString();

    await DB.put('scripts', s);
    Factory.toast('Script saved', 'success');
  }

  async function approve() {
    if (!currentId) return Factory.toast('No script selected', 'error');
    const s = await DB.get('scripts', currentId);
    s.status = 'approved';
    s.approvedAt = new Date().toISOString();
    await DB.put('scripts', s);

    const badge = document.getElementById('editor-status-badge');
    badge.className = 'status-badge status-approved';
    badge.textContent = 'approved';
    Factory.toast('Script approved', 'success');
  }

  async function markProduced() {
    if (!currentId) return Factory.toast('No script selected', 'error');
    const s = await DB.get('scripts', currentId);
    s.status = 'produced';
    s.producedAt = new Date().toISOString();
    await DB.put('scripts', s);

    const badge = document.getElementById('editor-status-badge');
    badge.className = 'status-badge status-produced';
    badge.textContent = 'produced';
    Factory.toast('Marked as produced', 'success');
  }

  async function remove() {
    if (!currentId) return;
    if (!confirm('Delete this script permanently?')) return;
    await DB.remove('scripts', currentId);
    clear();
    await refresh();
    Factory.toast('Script deleted', 'info');
  }

  return { refresh, load, save, approve, markProduced, remove };
})();

// Script Library (browse view)
const ScriptLib = (() => {

  async function refresh() {
    const options = await Factory.getChannelSelectHTML();
    document.getElementById('filter-channel').innerHTML =
      '<option value="">All Channels</option>' + options;
    await filter();
  }

  async function filter() {
    const channelId = document.getElementById('filter-channel').value;
    const status = document.getElementById('filter-status').value;
    const format = document.getElementById('filter-format').value;

    let scripts = await DB.getAll('scripts');

    if (channelId) scripts = scripts.filter(s => s.channelId == channelId);
    if (status) scripts = scripts.filter(s => s.status === status);
    if (format) scripts = scripts.filter(s => s.format === format);

    scripts.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

    const container = document.getElementById('script-library');
    container.innerHTML = '';

    if (scripts.length === 0) {
      container.innerHTML = '<p style="color:var(--text-muted)">No scripts found.</p>';
      return;
    }

    scripts.forEach(s => {
      const card = document.createElement('div');
      card.className = 'script-card';
      card.innerHTML = `
        <h3>${Factory.esc(s.title || 'Untitled')}</h3>
        <div class="meta">
          <span class="status-badge status-${s.status || 'draft'}">${s.status || 'draft'}</span>
          <span>${s.format || '?'}</span>
          <span>${s.channelName || 'Unassigned'}</span>
          <span>${new Date(s.createdAt).toLocaleDateString()}</span>
        </div>
        <p><strong>Hook:</strong> ${Factory.esc((s.hook || '').substring(0, 120))}</p>
        <button onclick="Factory.nav('editor'); document.getElementById('editor-script-select').value='${s.id}'; Editor.load();" class="btn-secondary">✏️ Edit</button>
      `;
      container.appendChild(card);
    });
  }

  return { refresh, filter };
})();