function currentAdminLevel() {
  try { if (typeof user !== 'undefined' && user && (user.isAdmin || user.isAdmin===0)) { const n=Number(user.isAdmin); return Number.isFinite(n)?n:(user.isAdmin?1:0);} } catch(_){}
  try { const u=JSON.parse(localStorage.getItem('user')||'{}'); const n=Number(u&&u.isAdmin); return Number.isFinite(n)?n:((u&&u.isAdmin)?1:0);} catch(_){ return 0; }
}

async function fetchHistory(q, limit=200) {
  const p = new URLSearchParams();
  p.set('isAdmin', String(currentAdminLevel()));
  if (q) p.set('q', q);
  p.set('limit', String(limit));
  const res = await fetch(`http://${serverAddress}:3000/admin/prefs-history?${p.toString()}`);
  if (!res.ok) throw new Error('Failed to fetch history');
  return res.json();
}

function renderHistory(data) {
  const el = document.getElementById('ph-table');
  if (!el) return;
  const items = data.items || [];
  el.innerHTML = [
    '<thead><tr><th>Date/Time</th><th>Name</th><th>Email</th><th>Grade</th><th>Assigned Club</th><th>Before</th><th>After</th></tr></thead>',
    '<tbody>',
    ...items.map(r => {
      const name = `${r.lastName||''}, ${r.firstName||''}`.replace(/^,\s*/, '');
      const before = (r.before && String(r.before).trim().length) ? r.before : '<span class="uk-text-muted">None</span>';
      const after = (r.after && String(r.after).trim().length) ? r.after : '<span class="uk-text-muted">None</span>';
      const club = (r && r.clubName) ? `${r.clubName} (${r.clubId})` : (r && r.clubId==null ? 'None' : (r && r.clubId<0 ? 'Off‑campus' : (r && r.clubId!=null ? `Club ${r.clubId}` : '')));
      return `<tr>
        <td>${new Date(r.ts).toLocaleString()}</td>
        <td>${name}</td>
        <td>${r.email||''}</td>
        <td>${r.grade ?? ''}</td>
        <td>${club}</td>
        <td>${before}</td>
        <td>${after}</td>
      </tr>`;
    }),
    '</tbody>'
  ].join('');
}

async function performSearch() {
  try {
    const q = (document.getElementById('ph-search').value || '').trim();
    const data = await fetchHistory(q);
    renderHistory(data);
  } catch (e) {
    UIkit.notification({ message: 'Search failed', status: 'danger', pos: 'top-center' });
  }
}

document.addEventListener('DOMContentLoaded', () => {
  const btn = document.getElementById('ph-refresh');
  if (btn) btn.addEventListener('click', performSearch);
  const search = document.getElementById('ph-search');
  if (search) search.addEventListener('keydown', (e)=>{ if (e.key==='Enter') performSearch(); });
  const printBtn = document.getElementById('ph-print');
  if (printBtn) printBtn.addEventListener('click', ()=> window.print());

  // Preload query from URL param ?q=
  try {
    const params = new URL(window.location.href).searchParams;
    const q = (params.get('q') || '').trim();
    if (q && document.getElementById('ph-search')) {
      document.getElementById('ph-search').value = q;
    }
  } catch(_) {}
  performSearch();
});
