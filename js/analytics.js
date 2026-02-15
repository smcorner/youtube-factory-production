const Analytics = (() => {

  async function refresh() {
    const scripts = await DB.getAll('scripts');
    const produced = scripts.filter(s => s.status === 'produced');
    const sel = document.getElementById('ana-script-select');
    sel.innerHTML = '<option value="">Select Produced Video</option>';
    produced.forEach(s => {
      const opt = document.createElement('option');
      opt.value = s.id;
      opt.textContent = s.title || 'Untitled';
      sel.appendChild(opt);
    });

    await renderOverview();
  }

  async function save() {
    const scriptId = parseInt(document.getElementById('ana-script-select').value);
    if (!scriptId) return Factory.toast('Select a video', 'error');

    const data = {
      scriptId,
      ctr: parseFloat(document.getElementById('ana-ctr').value) || 0,
      retention: parseFloat(document.getElementById('ana-retention').value) || 0,
      watchTime: parseFloat(document.getElementById('ana-watchtime').value) || 0,
      impressions: parseInt(document.getElementById('ana-impressions').value) || 0,
      views: parseInt(document.getElementById('ana-views').value) || 0,
      subsGained: parseInt(document.getElementById('ana-subs').value) || 0,
      createdAt: new Date().toISOString()
    };

    await DB.add('analytics', data);
    Factory.toast('Metrics saved', 'success');

    ['ana-ctr', 'ana-retention', 'ana-watchtime', 'ana-impressions', 'ana-views', 'ana-subs']
      .forEach(id => document.getElementById(id).value = '');

    await renderOverview();
  }

  async function renderOverview() {
    const analytics = await DB.getAll('analytics');
    const scripts = await DB.getAll('scripts');
    const container = document.getElementById('analytics-overview');

    if (analytics.length === 0) {
      container.innerHTML = '<p style="color:var(--text-muted)">No analytics data yet.</p>';
      return;
    }

    const scriptMap = {};
    scripts.forEach(s => { scriptMap[s.id] = s; });

    const avgCTR = (analytics.reduce((a, b) => a + b.ctr, 0) / analytics.length).toFixed(1);
    const avgRet = (analytics.reduce((a, b) => a + b.retention, 0) / analytics.length).toFixed(1);
    const totalViews = analytics.reduce((a, b) => a + b.views, 0);
    const totalSubs = analytics.reduce((a, b) => a + b.subsGained, 0);

    let html = `
      <div class="stats-grid">
        <div class="stat-card"><span>${avgCTR}%</span><label>Avg CTR</label></div>
        <div class="stat-card"><span>${avgRet}%</span><label>Avg Retention</label></div>
        <div class="stat-card"><span>${totalViews.toLocaleString()}</span><label>Total Views</label></div>
        <div class="stat-card"><span>${totalSubs}</span><label>Subs Gained</label></div>
      </div>
      <table class="analytics-table">
        <thead><tr><th>Title</th><th>CTR</th><th>Retention</th><th>Views</th><th>Date</th></tr></thead>
        <tbody>
    `;

    analytics.slice(-20).reverse().forEach(a => {
      const title = scriptMap[a.scriptId]?.title || 'Unknown';
      html += `<tr>
        <td>${Factory.esc(title)}</td>
        <td>${a.ctr}%</td>
        <td>${a.retention}%</td>
        <td>${a.views.toLocaleString()}</td>
        <td>${new Date(a.createdAt).toLocaleDateString()}</td>
      </tr>`;
    });

    html += '</tbody></table>';
    container.innerHTML = html;
  }

  async function recalibrate() {
    const analytics = await DB.getAll('analytics');
    if (analytics.length === 0) return Factory.toast('No analytics data', 'error');

    const scripts = await DB.getAll('scripts');
    const channels = await DB.getAll('channels');
    const scriptMap = {};
    scripts.forEach(s => { scriptMap[s.id] = s; });

    const metricsText = analytics.slice(-20).map(a => {
      const s = scriptMap[a.scriptId];
      return `Title: "${s?.title || 'Unknown'}" | Format: ${s?.format || '?'} | CTR: ${a.ctr}% | Retention: ${a.retention}% | Views: ${a.views} | Watch Time: ${a.watchTime}min`;
    }).join('\n');

    const contextText = channels.map(c =>
      `${c.name}: ${c.niche} (${c.format})`
    ).join('\n');

    const prompt = Prompts.ANALYTICS_RECALIBRATE
      .replace('{{context}}', contextText)
      .replace('{{metrics}}', metricsText);

    Factory.showLoading('Analyzing performance...');

    try {
      const raw = await Factory.callLLM(prompt);
      const data = Factory.parseJSON(raw);

      let html = '';
      const sections = [
        ['diagnosis', '🔍 Diagnosis'],
        ['hook_recommendations', '🎣 Hook Improvements'],
        ['title_recommendations', '📝 Title Improvements'],
        ['thumbnail_recommendations', '🖼️ Thumbnail Adjustments'],
        ['pacing_recommendations', '⚡ Pacing Changes'],
        ['content_recommendations', '📺 Content Strategy'],
        ['priority_actions', '🎯 Priority Actions']
      ];

      sections.forEach(([key, label]) => {
        if (data[key]) {
          html += `<h3>${label}</h3>`;
          if (Array.isArray(data[key])) {
            html += '<ul>';
            data[key].forEach(item => {
              html += `<li>${Factory.esc(typeof item === 'string' ? item : JSON.stringify(item))}</li>`;
            });
            html += '</ul>';
          } else {
            html += `<p>${Factory.esc(typeof data[key] === 'string' ? data[key] : JSON.stringify(data[key]))}</p>`;
          }
        }
      });

      document.getElementById('analytics-recommendations').innerHTML = html || `<pre>${JSON.stringify(data, null, 2)}</pre>`;
      Factory.hideLoading();
      Factory.toast('Recommendations generated', 'success');

    } catch (e) {
      Factory.hideLoading();
      Factory.toast('Analysis failed: ' + e.message, 'error');
    }
  }

  return { refresh, save, recalibrate };
})();