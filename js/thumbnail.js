const Thumbnail = (() => {

  async function refresh() {
    const scripts = await DB.getAll('scripts');
    const sel = document.getElementById('thumb-script-select');
    sel.innerHTML = '<option value="">Select Script</option>';
    scripts.filter(s => s.status === 'approved' || s.status === 'produced').forEach(s => {
      const opt = document.createElement('option');
      opt.value = s.id;
      opt.textContent = s.title || 'Untitled';
      sel.appendChild(opt);
    });
  }

  function loadScript() {}

  async function generate() {
    const scriptId = parseInt(document.getElementById('thumb-script-select').value);
    if (!scriptId) return Factory.toast('Select a script', 'error');

    const script = await DB.get('scripts', scriptId);
    if (!script) return Factory.toast('Script not found', 'error');

    let niche = 'general';
    if (script.channelId) {
      const ch = await Channels.getById(script.channelId);
      if (ch) niche = ch.niche;
    }

    const prompt = Prompts.THUMBNAIL
      .replace('{{title}}', script.title || '')
      .replace('{{hook}}', script.hook || '')
      .replace('{{niche}}', niche);

    Factory.showLoading('Generating thumbnail guide...');

    try {
      const raw = await Factory.callLLM(prompt);
      const data = Factory.parseJSON(raw);

      let html = '';

      const concepts = data.concepts || data.thumbnails || [];
      if (Array.isArray(concepts)) {
        concepts.forEach((c, i) => {
          html += `<div class="script-card">
            <h3>Concept ${i + 1}: ${Factory.esc(c.concept || '')}</h3>
            <p><strong>Text:</strong> ${Factory.esc(c.text_overlay || '')}</p>
            <p><strong>Color:</strong> <span style="display:inline-block;width:20px;height:20px;background:${c.dominant_color || '#fff'};vertical-align:middle;border-radius:4px"></span> ${Factory.esc(c.dominant_color || '')}</p>
            <p><strong>Expression:</strong> ${Factory.esc(c.facial_expression || 'N/A')}</p>
            <p><strong>Focal Point:</strong> ${Factory.esc(c.focal_point || '')}</p>
            <p><strong>Emotion Target:</strong> ${Factory.esc(c.emotion_target || '')}</p>
            <p style="color:var(--text-muted)">${Factory.esc(c.ctr_reasoning || '')}</p>
          </div>`;
        });
      }

      if (data.general_rules) {
        html += '<h3>📏 Rules</h3><ul>';
        data.general_rules.forEach(r => { html += `<li>${Factory.esc(typeof r === 'string' ? r : JSON.stringify(r))}</li>`; });
        html += '</ul>';
      }

      if (data.color_psychology) {
        html += `<h3>🎨 Color Psychology</h3><p>${Factory.esc(typeof data.color_psychology === 'string' ? data.color_psychology : JSON.stringify(data.color_psychology))}</p>`;
      }

      document.getElementById('thumb-output').innerHTML = html || `<pre>${JSON.stringify(data, null, 2)}</pre>`;
      Factory.hideLoading();
      Factory.toast('Thumbnail guide generated', 'success');

    } catch (e) {
      Factory.hideLoading();
      Factory.toast('Generation failed: ' + e.message, 'error');
    }
  }

  return { refresh, loadScript, generate };
})();