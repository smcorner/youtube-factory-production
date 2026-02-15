const Trends = (() => {

  async function refresh() {
    const options = await Factory.getChannelSelectHTML();
    document.getElementById('trend-channel').innerHTML =
      '<option value="">All Channels</option>' + options;

    const trends = await DB.getAll('trends');
    renderHistory(trends);
  }

  async function research() {
    const seed = document.getElementById('trend-seed').value.trim();
    if (!seed) return Factory.toast('Enter a seed keyword', 'error');

    const channelId = document.getElementById('trend-channel').value;
    const region = document.getElementById('trend-region').value.trim() || 'Global';

    let context = 'General YouTube research';
    if (channelId) {
      context = await Channels.getContext(channelId);
    }

    const prompt = Prompts.injectContext(Prompts.TREND_RESEARCH, null, {
      seed, region, context
    });

    Factory.showLoading('Analyzing trends...');

    try {
      const raw = await Factory.callLLM(prompt);
      const data = Factory.parseJSON(raw);

      await DB.add('trends', {
        seed,
        region,
        channelId: channelId || null,
        data,
        createdAt: new Date().toISOString()
      });

      renderOutput(data);
      Factory.hideLoading();
      Factory.toast('Trend research complete', 'success');

      const trends = await DB.getAll('trends');
      renderHistory(trends);

    } catch (e) {
      Factory.hideLoading();
      Factory.toast('Research failed: ' + e.message, 'error');
    }
  }

  function renderOutput(data) {
    const el = document.getElementById('trend-output');
    let html = '';

    if (data.rising_queries) {
      html += '<h3>🔥 Rising Queries</h3><ul>';
      data.rising_queries.forEach(q => { html += `<li>${Factory.esc(typeof q === 'string' ? q : q.query || JSON.stringify(q))}</li>`; });
      html += '</ul>';
    }

    if (data.breakout_predictions) {
      html += '<h3>🚀 Breakout Predictions</h3><ul>';
      data.breakout_predictions.forEach(p => { html += `<li>${Factory.esc(typeof p === 'string' ? p : p.topic || JSON.stringify(p))}</li>`; });
      html += '</ul>';
    }

    if (data.content_gaps) {
      html += '<h3>🎯 Content Gaps</h3><ul>';
      data.content_gaps.forEach(g => { html += `<li>${Factory.esc(typeof g === 'string' ? g : g.topic || JSON.stringify(g))}</li>`; });
      html += '</ul>';
    }

    if (data.topic_clusters) {
      html += '<h3>🧩 Topic Clusters</h3>';
      (Array.isArray(data.topic_clusters) ? data.topic_clusters : []).forEach(c => {
        html += `<strong>${Factory.esc(c.name || c.cluster || 'Cluster')}</strong>`;
        if (c.subtopics) {
          html += '<ul>';
          c.subtopics.forEach(s => { html += `<li>${Factory.esc(typeof s === 'string' ? s : JSON.stringify(s))}</li>`; });
          html += '</ul>';
        }
      });
    }

    el.innerHTML = html || `<pre>${JSON.stringify(data, null, 2)}</pre>`;
  }

  function renderHistory(trends) {
    const container = document.getElementById('trend-history-list');
    container.innerHTML = '';
    trends.slice(-10).reverse().forEach(t => {
      const card = document.createElement('div');
      card.className = 'script-card';
      card.style.cursor = 'pointer';
      card.innerHTML = `
        <h3>🔍 ${Factory.esc(t.seed)}</h3>
        <div class="meta"><span>${t.region || 'Global'}</span><span>${new Date(t.createdAt).toLocaleDateString()}</span></div>
      `;
      card.addEventListener('click', () => renderOutput(t.data));
      container.appendChild(card);
    });
  }

  return { refresh, research };
})();