function currentAdminLevel() {
  try {
    // Prefer global binding set by userData.js
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

async function fetchLatestMetrics() {
  const level = currentAdminLevel();
  const resp = await fetch(`http://${serverAddress}:3000/admin-metrics/latest?isAdmin=${encodeURIComponent(level)}`);
  if (!resp.ok) throw new Error('Failed to load metrics');
  return await resp.json();
}

async function recomputeMetrics() {
  const level = currentAdminLevel();
  const resp = await fetch(`http://${serverAddress}:3000/admin-metrics/run`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ isAdmin: level })
  });
  if (!resp.ok) throw new Error('Failed to recompute metrics');
  return await resp.json();
}

function renderSummary(m) {
  const el = document.getElementById('metrics-summary');
  if (!el) return;
  const t = m.totals || {};
  const cards = [
    { label: 'Students (on-campus)', value: `${t.onCampus || 0}` },
    { label: 'Assigned', value: `${t.assigned || 0}` },
    { label: 'Teachers', value: `${t.teachers || 0}` },
    { label: 'Students/Teacher', value: `${t.studentsPerTeacher!=null ? (t.studentsPerTeacher+':1') : '—'}` },
    { label: 'Unassigned', value: `${t.unassigned || 0}` },
    { label: 'Top-1 rate', value: `${t.top1Rate || 0}%` },
    { label: 'Top-2 rate', value: `${t.top2Rate || 0}%` },
    { label: 'Top-3 rate', value: `${t.top3Rate || 0}%` },
    { label: 'Not-in-list rate', value: `${t.notInListRate || 0}%` },
    { label: 'Avg rank', value: `${t.avgRank || 0}` },
    { label: 'Median rank', value: `${t.medianRank || 0}` },
    { label: 'Satisfaction', value: `${t.satisfaction || 0}` }
  ];
  el.innerHTML = cards.map(c => `
    <div>
      <div class="uk-card uk-card-default uk-card-body uk-border-rounded">
        <div class="uk-text-small uk-text-muted">${c.label}</div>
        <div class="uk-text-lead">${c.value}</div>
      </div>
    </div>`).join('');
}

function renderByGrade(m) {
  const el = document.getElementById('metrics-bygrade');
  if (!el) return;
  const rows = (m.byGrade || []).sort((a,b)=> (parseInt(a.grade,10)||0) - (parseInt(b.grade,10)||0));
  el.innerHTML = [
    '<thead><tr><th>Grade</th><th>Assigned</th><th>Top-1</th><th>Top-2</th><th>Top-3</th><th>Not-in-list</th></tr></thead>',
    '<tbody>',
    ...rows.map(r => `<tr><td>${r.grade}</td><td>${r.assigned}</td><td>${r.top1Rate}%</td><td>${r.top2Rate}%</td><td>${r.top3Rate}%</td><td>${r.notInListRate}%</td></tr>`),
    '</tbody>'
  ].join('');
}

function renderByClub(m) {
  const el = document.getElementById('metrics-byclub');
  if (!el) return;
  const rows = (m.byClub || []).slice().sort((a,b)=> String(a.clubName||'').localeCompare(String(b.clubName||'')));
  el.innerHTML = [
    '<thead><tr><th>Club</th><th>Assigned</th><th>Teachers</th><th>S/T</th><th>Capacity</th><th>Fill %</th><th>1st Dem</th><th>2nd</th><th>3rd</th><th>4th</th><th>5th</th><th>9</th><th>10</th><th>11</th><th>12</th></tr></thead>',
    '<tbody>',
    ...rows.map(r => `<tr>
      <td>${r.clubName || ('Club '+r.clubId)}</td>
      <td>${r.assigned}</td>
      <td>${r.teacherCount ?? 0}</td>
      <td>${r.studentsPerTeacher==null?'':(r.studentsPerTeacher+':1')}</td>
      <td>${r.capacity ?? ''}</td>
      <td>${r.fillRatio==null?'':r.fillRatio+'%'}</td>
      <td>${(r.demand && r.demand[1]) || 0}</td>
      <td>${(r.demand && r.demand[2]) || 0}</td>
      <td>${(r.demand && r.demand[3]) || 0}</td>
      <td>${(r.demand && r.demand[4]) || 0}</td>
      <td>${(r.demand && r.demand[5]) || 0}</td>
      <td>${(r.gradeMix && r.gradeMix[9]) || 0}</td>
      <td>${(r.gradeMix && r.gradeMix[10]) || 0}</td>
      <td>${(r.gradeMix && r.gradeMix[11]) || 0}</td>
      <td>${(r.gradeMix && r.gradeMix[12]) || 0}</td>
    </tr>`),
    '</tbody>'
  ].join('');
}

async function loadMetrics() {
  try {
    const m = await fetchLatestMetrics();
    renderSummary(m);
    renderByGrade(m);
    renderByClub(m);
    const s = document.getElementById('metrics-status');
    if (s) s.textContent = `Generated at ${m.generatedAt}`;
  } catch (e) {
    UIkit.notification({ message: 'Failed to load metrics', status: 'danger', pos: 'top-center' });
  }
}

document.addEventListener('DOMContentLoaded', () => {
  loadMetrics();

  // Setup recalc button for admins
  const btn = document.getElementById('recalc-btn');
  if (btn) {
    const level = currentAdminLevel();
    if (!level || level < 1) {
      // Hide button if not admin
      btn.style.display = 'none';
    } else {
      btn.addEventListener('click', async () => {
        try {
          btn.disabled = true;
          btn.classList.add('uk-disabled');
          const originalHtml = btn.innerHTML;
          btn.innerHTML = '<span uk-spinner></span> Recalculating...';
          const res = await recomputeMetrics();
          // Refresh UI with returned metrics if present, else refetch
          if (res && res.metrics) {
            renderSummary(res.metrics);
            renderByGrade(res.metrics);
            renderByClub(res.metrics);
            const s = document.getElementById('metrics-status');
            if (s && res.metrics.generatedAt) s.textContent = `Generated at ${res.metrics.generatedAt}`;
          } else {
            await loadMetrics();
          }
          UIkit.notification({ message: 'Metrics recalculated', status: 'success', pos: 'top-center' });
          btn.innerHTML = originalHtml;
        } catch (e) {
          UIkit.notification({ message: 'Recalculation failed', status: 'danger', pos: 'top-center' });
        } finally {
          btn.disabled = false;
          btn.classList.remove('uk-disabled');
        }
      });
    }
  }

  // Setup print button (always allowed)
  const printBtn = document.getElementById('print-btn');
  if (printBtn) {
    printBtn.addEventListener('click', () => {
      try {
        // Close any UIkit notifications so they don't appear in print
        try { if (window.UIkit && UIkit.notification && typeof UIkit.notification.closeAll === 'function') UIkit.notification.closeAll(); } catch (_) {}
        window.print();
      } catch (_) {
        UIkit.notification({ message: 'Unable to open print dialog', status: 'warning', pos: 'top-center' });
      }
    });
  }
});
