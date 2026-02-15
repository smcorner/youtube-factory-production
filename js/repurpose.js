const Repurpose = (() => {

  async function refresh() {
    const scripts = await DB.getAll('scripts');
    const longForm = scripts.filter(s =>
      s.format !== 'shorts' && (s.status === 'approved' || s.status === 'produced')
    );
    const sel = document.getElementById('repurpose-script-select');
    sel.innerHTML = '<option value="">Select Long-Form Script</option>';
    longForm.forEach(s => {
      const opt = document.createElement('option');
      opt.value = s.id;
      opt.textContent = `${s.title || 'Untitled'} (${s.format})`;
      sel.appendChild(opt);
    });
  }

  function loadScript() {}

  async function generate() {
    const scriptId = parseInt(document.getElementById('repurpose-script-select').value);
    if (!scriptId) return Factory.toast('Select a script', 'error');

    const script = await DB.get('scripts', scriptId);
    if (!script) return Factory.toast('Script not found', 'error');

    const types = [];
    if (document.getElementById('rep-shorts').checked) types.push('shorts');
    if (document.getElementById('rep-community').checked) types.push('community');
    if (document.getElementById('rep-thread').checked) types.push('thread');
    if (document.getElementById('rep-blog').checked) types.push('blog');
    if (document.getElementById('rep-email').checked) types.push('email');

    if (types.length === 0) return Factory.toast('Select at least one format', 'error');

    Factory.showLoading('Repurposing content...');
    const container = document.getElementById('repurpose-output');
    container.innerHTML = '';

    for (const type of types) {
      try {
        const template = Prompts.REPURPOSE[type];
        if (!template) continue;

        const prompt = template
          .replace('{{title}}', script.title || '')
          .replace(/\{\{script\}\}/g, (script.script || '').substring(0, 2000));

        const raw = await Factory.callLLM(prompt);
        const data = Factory.parseJSON(raw);

        container.innerHTML += `<h3>${typeLabel(type)}</h3><pre>${JSON.stringify(data, null, 2)}</pre><hr>`;

      } catch (e) {
        container.innerHTML += `<h3>${typeLabel(type)}</h3><p style="color:var(--danger)">Failed: ${e.message}</p><hr>`;
      }
    }

    Factory.hideLoading();
    Factory.toast('Repurposing complete', 'success');
  }

  function typeLabel(t) {
    const map = { shorts: '🎬 Shorts', community: '💬 Community Post', thread: '🧵 Twitter Thread', blog: '📝 Blog Outline', email: '📧 Email Newsletter' };
    return map[t] || t;
  }

  return { refresh, loadScript, generate };
})();