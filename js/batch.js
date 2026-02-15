const Batch = (() => {

  async function refresh() {
    const options = await Factory.getChannelSelectHTML();
    const sel = document.getElementById('batch-channel');
    sel.innerHTML = '<option value="">Select Channel</option>' + options;
  }

  async function generate() {
    const channelId = document.getElementById('batch-channel').value;
    const topic = document.getElementById('batch-topic').value.trim();
    const format = document.getElementById('batch-format').value;
    const batchSize = document.getElementById('batch-size').value;

    if (!topic) return Factory.toast('Enter a topic', 'error');

    let channel = null;
    if (channelId) {
      channel = await Channels.getById(channelId);
    }

    const template = Prompts.BATCH[format] || Prompts.BATCH.mixed;
    const prompt = Prompts.injectContext(template, channel, {
      topic,
      batch_size: batchSize
    });

    const progressEl = document.getElementById('batch-progress');
    const fillEl = document.getElementById('batch-progress-fill');
    const textEl = document.getElementById('batch-progress-text');

    progressEl.style.display = 'block';
    fillEl.style.width = '30%';
    textEl.textContent = `Generating ${batchSize} scripts...`;

    Factory.showLoading(`Generating ${batchSize} ${format} scripts...`);

    try {
      const raw = await Factory.callLLM(prompt);
      fillEl.style.width = '70%';
      textEl.textContent = 'Parsing results...';

      const scripts = Factory.parseJSON(raw);

      if (!Array.isArray(scripts)) {
        throw new Error('Expected array of scripts');
      }

      fillEl.style.width = '90%';
      textEl.textContent = 'Saving scripts...';

      let saved = 0;
      for (const s of scripts) {
        await DB.add('scripts', {
          channelId: channelId ? parseInt(channelId) : null,
          channelName: channel ? channel.name : 'Unassigned',
          format: s.format || format,
          title: s.title || 'Untitled',
          hook: s.hook || '',
          script: s.script || '',
          cta: s.cta || '',
          thumbnailAngle: s.thumbnail_angle || '',
          emotionalArc: s.emotional_arc || s.emotional_arc || '',
          retentionTriggers: s.retention_triggers || [],
          brollKeywords: s.broll_keywords || [],
          frameworkName: s.framework_name || '',
          affiliatePlacement: s.affiliate_placement || '',
          conversionPsychology: s.conversion_psychology || '',
          status: 'draft',
          createdAt: new Date().toISOString()
        });
        saved++;
      }

      fillEl.style.width = '100%';
      textEl.textContent = `✅ ${saved} scripts generated and saved!`;

      Factory.hideLoading();
      Factory.toast(`${saved} scripts generated!`, 'success');

      renderBatchOutput(scripts);

    } catch (e) {
      Factory.hideLoading();
      progressEl.style.display = 'none';
      Factory.toast('Generation failed: ' + e.message, 'error');
      console.error(e);
    }
  }

  function renderBatchOutput(scripts) {
    const container = document.getElementById('batch-output');
    container.innerHTML = '';

    scripts.forEach((s, i) => {
      const card = document.createElement('div');
      card.className = 'script-card';
      card.innerHTML = `
        <h3>${i + 1}. ${Factory.esc(s.title || 'Untitled')}</h3>
        <div class="meta">
          <span>${s.format || 'N/A'}</span>
        </div>
        <p><strong>Hook:</strong> ${Factory.esc(s.hook || 'N/A')}</p>
        <p>${Factory.esc((s.script || '').substring(0, 200))}${(s.script || '').length > 200 ? '...' : ''}</p>
      `;
      container.appendChild(card);
    });
  }

  return { refresh, generate };
})();