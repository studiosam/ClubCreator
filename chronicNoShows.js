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

async function fetchChronic({ minMisses=3 }={}) {
  const params = new URLSearchParams();
  params.set('isAdmin', String(currentAdminLevel()));
  if (minMisses) params.set('minMisses', String(minMisses));
  const url = `http://${serverAddress}:3000/students/chronic-no-shows?${params.toString()}`;
  const res = await fetch(url);
  if (!res.ok) throw new Error('Failed to load chronic no-shows');
  return res.json();
}

let _cnsRows = [];
let _cnsSort = { field: null, dir: 'desc' }; // dir: 'asc' | 'desc'

function sortCNS(field) {
  if (_cnsSort.field === field) {
    _cnsSort.dir = _cnsSort.dir === 'asc' ? 'desc' : 'asc';
  } else {
    _cnsSort.field = field;
    _cnsSort.dir = 'desc';
  }
  drawCnsTable();
}

function drawCnsTable() {
  const el = document.getElementById('cns-table');
  if (!el) return;
  const rows = _cnsRows.slice();
  // Apply sort if configured
  if (_cnsSort.field) {
    const f = _cnsSort.field;
    const dir = _cnsSort.dir === 'asc' ? 1 : -1;
    rows.sort((a,b) => {
      if (f === 'lastDate') {
        const av = a && a.lastDate ? String(a.lastDate) : '';
        const bv = b && b.lastDate ? String(b.lastDate) : '';
        if (av === bv) return String(a.lastName||'').localeCompare(String(b.lastName||'')) || String(a.firstName||'').localeCompare(String(b.firstName||''));
        // Dates are YYYY-MM-DD so string compare works
        return (av < bv ? -1 : 1) * dir;
      } else {
        const av = Number(a && a[f] != null ? a[f] : 0);
        const bv = Number(b && b[f] != null ? b[f] : 0);
        if (av === bv) return String(a.lastName||'').localeCompare(String(b.lastName||'')) || String(a.firstName||'').localeCompare(String(b.firstName||''));
        return (av < bv ? -1 : 1) * dir;
      }
    });
  }
  const arrow = (f) => {
    if (_cnsSort.field !== f) return '';
    return _cnsSort.dir === 'asc' ? ' ▲' : ' ▼';
    };
  el.innerHTML = [
    `<thead><tr>
      <th>Name</th>
      <th>Email</th>
      <th>Grade</th>
      <th>Club</th>
      <th>Present</th>
      <th onclick="sortCNS('absent')" class="sortable">Absent${arrow('absent')}</th>
      <th onclick="sortCNS('unassignedAbsent')" class="sortable">Unassigned${arrow('unassignedAbsent')}</th>
      <th>Absence %</th>
      <th onclick="sortCNS('lastDate')" class="sortable">Last Seen${arrow('lastDate')}</th>
    </tr></thead>`,
    '<tbody>',
    ...rows.map(r => `<tr>
      <td>${(r.lastName||'')}, ${(r.firstName||'')}</td>
      <td>${r.email||''}</td>
      <td>${r.grade ?? ''}</td>
      <td>${r.clubId==null?'None':r.clubId}</td>
      <td>${r.present}</td>
      <td>${r.absent}</td>
      <td>${r.unassignedAbsent ?? 0}</td>
      <td>${r.absenceRate}%</td>
      <td>${r.lastDate||''}</td>
    </tr>`),
    '</tbody>'
  ].join('');
}

function renderTable(data) {
  _cnsRows = (data.items || []).slice();
  drawCnsTable();
}

async function loadChronic() {
  try {
    const minMisses = parseInt(document.getElementById('cns-min-misses').value, 10) || 3;
    const data = await fetchChronic({ minMisses });
    renderTable(data);
  } catch (e) {
    UIkit.notification({ message: 'Failed to load chronic no-shows', status: 'danger', pos: 'top-center' });
  }
}

document.addEventListener('DOMContentLoaded', () => {
  const btn = document.getElementById('cns-refresh');
  if (btn) btn.addEventListener('click', loadChronic);
  const printBtn = document.getElementById('cns-print');
  if (printBtn) printBtn.addEventListener('click', () => window.print());
  // Auto-refresh when the min-misses value changes
  const input = document.getElementById('cns-min-misses');
  let t = null;
  const debounced = () => { if (t) clearTimeout(t); t = setTimeout(loadChronic, 300); };
  if (input) {
    // Keep value sane (>=1)
    input.addEventListener('change', () => {
      const v = parseInt(input.value, 10) || 1;
      if (v < 1) input.value = '1';
      loadChronic();
    });
    input.addEventListener('input', debounced);
  }
  loadChronic();
});
