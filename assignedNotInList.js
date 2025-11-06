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

async function fetchAssignedNotInList() {
  const level = currentAdminLevel();
  const url = `http://${serverAddress}:3000/students/assigned-not-in-list?isAdmin=${encodeURIComponent(level)}`;
  const res = await fetch(url);
  if (!res.ok) throw new Error('Failed to load list');
  return res.json();
}

function renderTable(data, query='') {
  const el = document.getElementById('anil-table');
  if (!el) return;
  const rows = (data.users || []).filter((r)=>{
    if (!query) return true;
    const q = query.toLowerCase();
    return (
      String(r.firstName||'').toLowerCase().includes(q) ||
      String(r.lastName||'').toLowerCase().includes(q) ||
      String(r.email||'').toLowerCase().includes(q) ||
      String(r.clubName||'').toLowerCase().includes(q)
    );
  });
  const isSuper = currentAdminLevel() > 1;
  el.innerHTML = [
    '<thead><tr><th>Name</th><th>Email</th><th>Grade</th><th>Assigned Club</th><th>Preferences</th><th>Prefs Last Set</th></tr></thead>',
    '<tbody>',
    ...rows.map(r => {
      const name = `${r.lastName||''}, ${r.firstName||''}`.replace(/^,\s*/, '');
      const prefs = Array.isArray(r.preferences) && r.preferences.length ? r.preferences.join(', ') : '<span class="uk-text-muted">None</span>';
      const club = r.clubName ? `${r.clubName} (${r.clubId})` : (r.clubId==null?'None':`Club ${r.clubId}`);
      const when = r.prefsLastSetAt ? new Date(r.prefsLastSetAt).toLocaleString() : '<span class="uk-text-muted">—</span>';
      const query = encodeURIComponent((r.email && r.email.trim()) ? r.email : `${r.firstName||''} ${r.lastName||''}`.trim());
      const nameCell = isSuper
        ? `<a class="uk-link-text" href="prefs-history.html?q=${query}">${name}</a>`
        : `<span>${name}</span>`;
      const rowAttrs = isSuper ? `data-query="${query}"` : '';
      return `<tr ${rowAttrs}>
        <td>${nameCell}</td>
        <td>${r.email||''}</td>
        <td>${r.grade ?? ''}</td>
        <td>${club}</td>
        <td>${prefs}</td>
        <td>${when}</td>
      </tr>`;
    }),
    '</tbody>'
  ].join('');
}

let cachedData = { users: [] };

async function loadAssignedNotInList() {
  try {
    cachedData = await fetchAssignedNotInList();
    renderTable(cachedData, (document.getElementById('anil-search').value||'').trim());
  } catch (e) {
    UIkit.notification({ message: 'Failed to load list', status: 'danger', pos: 'top-center' });
  }
}

document.addEventListener('DOMContentLoaded', () => {
  const search = document.getElementById('anil-search');
  if (search) search.addEventListener('input', () => renderTable(cachedData, search.value.trim()));
  const printBtn = document.getElementById('anil-print');
  if (printBtn) printBtn.addEventListener('click', () => window.print());
  // Make entire row clickable to open history search
  const table = document.getElementById('anil-table');
  if (table) table.addEventListener('click', (e)=>{
    const tr = e.target && e.target.closest('tr[data-query]');
    if (!tr) return;
    if (currentAdminLevel() <= 1) return; // not superadmin, no navigation
    // If user clicked a link, let default work
    if (e.target && e.target.closest('a[href]')) return;
    const q = tr.getAttribute('data-query');
    if (q) window.location.href = `prefs-history.html?q=${q}`;
  });
  loadAssignedNotInList();
});
