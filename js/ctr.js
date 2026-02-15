const CTR = (() => {

  async function refresh() {
    const options = await Factory.getChannelSelectHTML();
    document.getElementById('ctr-channel').innerHTML =
      '<option value="">Select Channel Context</option>' + options;
  }

  async function score() {
    const titlesRaw = document.getElementById('ctr-titles').value.trim();
    if (!titlesRaw) return Factory.toast('Enter at least one title', 'error');

    const channelId = document.getElementById('ctr-channel').value;
    let context = 'General YouTube content';
    if (channelId) {
      context = await Channels.getContext(channelId);
    }

    const prompt = Prompts.CTR_SCORE
      .replace('{{context}}', context)
      .replace('{{titles}}', titlesRaw);

    Factory.showLoading('Scoring titles...');

    try {
      const raw = await Factory.callLLM(prompt);
      const data = Factory.parseJSON(raw);

      let html = '';

      const items = Array.isArray(data) ? data : [data];
      items.sort((a, b) => (b.total_score || 0) - (a.total_score || 0));

      items.forEach((item, i) => {
        const score = item.total_score || 0;
        const color = score >= 70 ? 'var(--success)' : score >= 45 ? 'var(--warning)' : 'var(--danger)';

        html += `<div class="script-card">
          <h3 style="color:${color}">#${i + 1} — Score: ${score}/100</h3>
          <p><strong>Title:</strong> ${Factory.esc(item.title || '')}</p>`;

        if (item.breakdown) {
          html += '<div class="meta">';
          Object.entries(item.breakdown).forEach(([k, v]) => {
            html += `<span>${k}: ${v}</span>`;
          });
          html += '</div>';
        }

        if (item.improvement) {
          html += `<p><strong>✨ Improved:</strong> ${Factory.esc(item.improvement)}</p>`;
        }
        if (item.reasoning) {
          html += `<p style="color:var(--text-muted)">${Factory.esc(item.reasoning)}</p>`;
        }

        html += '</div>';
      });

      document.getElementById('ctr-output').innerHTML = html;
      Factory.hideLoading();
      Factory.toast('Titles scored', 'success');

    } catch (e) {
      Factory.hideLoading();
      Factory.toast('Scoring failed: ' + e.message, 'error');
    }
  }

  return { refresh, score };
})();