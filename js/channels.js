const Channels = (() => {

  async function save() {
    const editId = document.getElementById('ch-edit-id').value;

    const data = {
      name: document.getElementById('ch-name').value.trim(),
      niche: document.getElementById('ch-niche').value.trim(),
      format: document.getElementById('ch-format').value,
      audience: document.getElementById('ch-audience').value.trim(),
      tone: document.getElementById('ch-tone').value,
      avgLength: document.getElementById('ch-length').value.trim(),
      monetizationGoal: document.getElementById('ch-goal').value.trim(),
      uploadFrequency: document.getElementById('ch-frequency').value.trim(),
      titlePattern: document.getElementById('ch-title-pattern').value.trim(),
      updatedAt: new Date().toISOString()
    };

    if (!data.name || !data.niche) {
      return Factory.toast('Name and Niche are required', 'error');
    }

    if (editId) {
      data.id = parseInt(editId);
      await DB.put('channels', data);
      Factory.toast('Channel updated', 'success');
    } else {
      data.createdAt = new Date().toISOString();
      await DB.add('channels', data);
      Factory.toast('Channel added', 'success');
    }

    clearForm();
    await refresh();
    await Factory.populateChannelSelects();
  }

  function clearForm() {
    document.getElementById('ch-edit-id').value = '';
    document.getElementById('ch-name').value = '';
    document.getElementById('ch-niche').value = '';
    document.getElementById('ch-format').value = 'shorts';
    document.getElementById('ch-audience').value = '';
    document.getElementById('ch-tone').value = 'professional';
    document.getElementById('ch-length').value = '';
    document.getElementById('ch-goal').value = '';
    document.getElementById('ch-frequency').value = '';
    document.getElementById('ch-title-pattern').value = '';
    document.getElementById('channel-form-title').textContent = 'Add Channel';
  }

  async function edit(id) {
    const ch = await DB.get('channels', id);
    if (!ch) return;

    document.getElementById('ch-edit-id').value = ch.id;
    document.getElementById('ch-name').value = ch.name || '';
    document.getElementById('ch-niche').value = ch.niche || '';
    document.getElementById('ch-format').value = ch.format || 'shorts';
    document.getElementById('ch-audience').value = ch.audience || '';
    document.getElementById('ch-tone').value = ch.tone || 'professional';
    document.getElementById('ch-length').value = ch.avgLength || '';
    document.getElementById('ch-goal').value = ch.monetizationGoal || '';
    document.getElementById('ch-frequency').value = ch.uploadFrequency || '';
    document.getElementById('ch-title-pattern').value = ch.titlePattern || '';
    document.getElementById('channel-form-title').textContent = 'Edit Channel';

    window.scrollTo(0, 0);
  }

  async function remove(id) {
    if (!confirm('Delete this channel?')) return;
    await DB.remove('channels', id);
    Factory.toast('Channel deleted', 'info');
    await refresh();
    await Factory.populateChannelSelects();
  }

  async function refresh() {
    const channels = await DB.getAll('channels');
    const container = document.getElementById('channel-list');
    container.innerHTML = '';

    if (channels.length === 0) {
      container.innerHTML = '<p style="color:var(--text-muted)">No channels yet. Add your first channel above.</p>';
      return;
    }

    channels.forEach(ch => {
      const card = document.createElement('div');
      card.className = 'channel-card';
      card.innerHTML = `
        <div class="info">
          <h3>${Factory.esc(ch.name)}</h3>
          <p class="detail">📌 ${Factory.esc(ch.niche)} | 🎬 ${ch.format} | 🎯 ${Factory.esc(ch.audience || 'N/A')}</p>
          <p class="detail">🎙️ ${ch.tone} | ⏱️ ${Factory.esc(ch.avgLength || 'N/A')} | 📅 ${Factory.esc(ch.uploadFrequency || 'N/A')}</p>
          <p class="detail">💰 ${Factory.esc(ch.monetizationGoal || 'N/A')}</p>
        </div>
        <div class="actions">
          <button onclick="Channels.edit(${ch.id})" class="btn-secondary">✏️</button>
          <button onclick="Channels.remove(${ch.id})" class="btn-danger">🗑️</button>
        </div>
      `;
      container.appendChild(card);
    });

    await Factory.populateChannelSelects();
  }

  async function getById(id) {
    return DB.get('channels', parseInt(id));
  }

  async function getContext(channelId) {
    if (!channelId) return 'No channel selected.';
    const ch = await getById(channelId);
    if (!ch) return 'Channel not found.';
    return `Channel: ${ch.name}\nNiche: ${ch.niche}\nAudience: ${ch.audience}\nTone: ${ch.tone}\nAvg Length: ${ch.avgLength}\nFormat: ${ch.format}`;
  }

  return { save, clearForm, edit, remove, refresh, getById, getContext };
})();