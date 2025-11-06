function currentAdminLevel() {
  try {
    if (typeof user !== 'undefined' && user && (user.isAdmin || user.isAdmin === 0)) {
      const n = Number(user.isAdmin);
      return Number.isFinite(n) ? n : (user.isAdmin ? 1 : 0);
    }
  } catch (_) {}
  try {
    const u = JSON.parse(localStorage.getItem('user') || '{}');
    const n = Number(u && u.isAdmin);
    return Number.isFinite(n) ? n : (u && u.isAdmin ? 1 : 0);
  } catch (_) { return 0; }
}

async function fetchAllRosters() {
  const level = currentAdminLevel();
  const resp = await fetch(`http://${serverAddress}:3000/clubs/rosters?isAdmin=${encodeURIComponent(level)}`);
  if (!resp.ok) throw new Error('Failed to fetch rosters');
  return await resp.json();
}

function renderRosters(payload) {
  const root = document.getElementById('rosters-root');
  const stamp = document.getElementById('generated-at');
  if (stamp && payload && payload.generatedAt) {
    stamp.textContent = `Generated at ${payload.generatedAt}`;
  }
  if (!root) return;
  const rosters = (payload && payload.rosters) || [];
  root.innerHTML = rosters.map(r => {
    const students = (r.students || [])
      .map(s => {
        const fn = String(s.firstName||'').trim();
        const ln = String(s.lastName||'').trim();
        const g  = s.grade == null ? '' : ` (${s.grade})`;
        return `<li>${(`${ln}, ${fn}`).replace(/^,\s*/, '')}${g}</li>`;
      })
      .join('');
    const teacher = [r.teacherFirstName||'', r.teacherLastName||''].filter(Boolean).join(' ');
    const meta = [teacher?`Teacher: ${teacher}`:null, r.room?`Room: ${r.room}`:null, `Students: ${r.count}`].filter(Boolean).join(' • ');
    return `
      <section class="roster-card">
        <header class="roster-header">
          <h2 class="roboto">${r.clubName || 'Club'}</h2>
          <div class="uk-text-meta">${meta}</div>
        </header>
        <ol class="roster-list">${students}</ol>
      </section>
    `;
  }).join('');
}

document.addEventListener('DOMContentLoaded', async () => {
  try {
    const data = await fetchAllRosters();
    renderRosters(data);
  } catch (e) {
    const root = document.getElementById('rosters-root');
    if (root) root.innerHTML = '<div class="uk-alert-danger" uk-alert>Failed to load rosters</div>';
  }
  const btn = document.getElementById('print-all');
  if (btn) btn.addEventListener('click', () => window.print());
});
