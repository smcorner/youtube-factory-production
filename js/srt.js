const SRT = (() => {
  let srtContent = '';

  async function refresh() {
    const scripts = await DB.getAll('scripts');
    const approved = scripts.filter(s => s.status === 'approved' || s.status === 'produced');
    const sel = document.getElementById('srt-script-select');
    sel.innerHTML = '<option value="">Select Approved Script</option>';
    approved.forEach(s => {
      const opt = document.createElement('option');
      opt.value = s.id;
      opt.textContent = s.title || 'Untitled';
      sel.appendChild(opt);
    });
  }

  async function loadScript() {
    const id = parseInt(document.getElementById('srt-script-select').value);
    if (!id) return;
    const s = await DB.get('scripts', id);
    if (s) {
      document.getElementById('srt-output').textContent = s.script || 'No script text';
    }
  }

  function generate() {
    const id = document.getElementById('srt-script-select').value;
    if (!id) return Factory.toast('Select a script', 'error');

    const text = document.getElementById('srt-output').textContent;
    if (!text || text === 'No script text') return Factory.toast('No script text available', 'error');

    const wordsPerLine = parseInt(document.getElementById('srt-wpl').value) || 8;
    const secsPerLine = parseFloat(document.getElementById('srt-spl').value) || 3;

    const words = text.split(/\s+/).filter(w => w.length > 0);
    const lines = [];

    for (let i = 0; i < words.length; i += wordsPerLine) {
      lines.push(words.slice(i, i + wordsPerLine).join(' '));
    }

    let srt = '';
    let time = 0;

    lines.forEach((line, idx) => {
      const start = formatSRTTime(time);
      time += secsPerLine;
      const end = formatSRTTime(time);
      srt += `${idx + 1}\n${start} --> ${end}\n${line}\n\n`;
    });

    srtContent = srt;
    document.getElementById('srt-output').textContent = srt;
    document.getElementById('btn-srt-download').disabled = false;
    Factory.toast('SRT generated', 'success');
  }

  function formatSRTTime(totalSeconds) {
    const h = Math.floor(totalSeconds / 3600);
    const m = Math.floor((totalSeconds % 3600) / 60);
    const s = Math.floor(totalSeconds % 60);
    const ms = Math.round((totalSeconds % 1) * 1000);
    return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')},${String(ms).padStart(3, '0')}`;
  }

  function download() {
    if (!srtContent) return;
    const blob = new Blob([srtContent], { type: 'text/plain;charset=utf-8' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = 'subtitles.srt';
    link.click();
    URL.revokeObjectURL(link.href);
    Factory.toast('SRT downloaded', 'success');
  }

  return { refresh, loadScript, generate, download };
})();