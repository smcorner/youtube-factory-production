const Hooks = (() => {

  async function refresh() {
    const options = await Factory.getChannelSelectHTML();
    document.getElementById('hook-channel').innerHTML =
      '<option value="">Select Channel Context</option>' + options;

    const hooks = await DB.getAll('hooks');
    renderLibrary(hooks);
  }

  async function analyze() {
    const input = document.getElementById('hook-input').value.trim();
    const topic = document.getElementById('hook-topic').value.trim();
    const channelId = document.getElementById('hook-channel').value;

    if (!input && !topic) return Factory.toast('Enter a hook or topic', 'error');

    let context = '';
    if (channelId) {
      context = await Channels.getContext(channelId);
    }

    let prompt;
    if (input) {
      prompt = `Analyze this YouTube hook for effectiveness:

Hook: "${input}"
${context ? 'Channel Context:\n' + context : ''}

Score on:
- curiosity_trigger (1-10)
- emotional_impact (1-10)
- clarity (1-10)
- spoken_length_seconds: estimated
- overall_score (1-10)
- strengths: array
- weaknesses: array
- improved_version: rewritten hook
- reasoning: explanation

Return JSON object. No markdown fences.`;
    } else {
      prompt = Prompts.HOOKS
        .replace('{{context}}', context || 'General YouTube content')
        .replace('{{topic}}', topic);
    }

    Factory.showLoading('Analyzing hooks...');

    try {
      const raw = await Factory.callLLM(prompt);
      const data = Factory.parseJSON(raw);

      if (Array.isArray(data)) {
        for (const hook of data) {
          await DB.add('hooks', {
            ...hook,
            topic,
            channelId: channelId || null,
            createdAt: new Date().toISOString()
          });
        }
      }

      document.getElementById('hook-output').innerHTML =
        `<pre>${JSON.stringify(data, null, 2)}</pre>`;

      Factory.hideLoading();
      Factory.toast('Hook analysis complete', 'success');

      const hooks = await DB.getAll('hooks');
      renderLibrary(hooks);

    } catch (e) {
      Factory.hideLoading();
      Factory.toast('Analysis failed: ' + e.message, 'error');
    }
  }

  function renderLibrary(hooks) {
    const container = document.getElementById('hook-library');
    container.innerHTML = '';

    hooks.slice(-20).reverse().forEach(h => {
      const card = document.createElement('div');
      card.className = 'script-card';
      card.innerHTML = `
        <p><strong>${Factory.esc(h.type || 'Hook')}:</strong> ${Factory.esc(h.hook || h.improved_version || JSON.stringify(h))}</p>
        <div class="meta">
          <span>Score: ${h.score || h.overall_score || '?'}/10</span>
          <span>${h.topic || ''}</span>
        </div>
      `;
      container.appendChild(card);
    });
  }

  return { refresh, analyze };
})();