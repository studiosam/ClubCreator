const clubsDiv = document.querySelector('#clubs');
const clubsBody = document.querySelector('#clubs-body');
const printbtn = document.querySelectorAll('.printbtn');

printbtn.forEach((btn) => {
  btn.addEventListener('click', () => {
    const divContents = clubsDiv.innerHTML;
    if (divContents !== '') {
      const w = window.open('', '');
      w.document.write('<html><body>');
      w.document.write(divContents);
      w.document.write('</body></html>');
      w.document.close();
      w.print();
    }
  });
});

async function getClubsList() {
  // Determine admin level from localStorage (fallback to 0)
  let adminLevel = 0;
  try {
    const u = JSON.parse(localStorage.getItem('user') || '{}');
    adminLevel = Number(u && u.isAdmin ? u.isAdmin : 0) || 0;
  } catch (_) {}
  try {
    const resp = await fetch(`http://${serverAddress}:3000/clubs/summary`);
    const data = await resp.json();
    const list = (data && data.clubs) ? data.clubs : [];
    list.sort((a, b) => (String(a.clubName||'').localeCompare(String(b.clubName||''))));
    if (clubsBody) clubsBody.innerHTML = '';
    for (const c of list) {
      const clubName = c.clubName;
      const room = c.room || '';
      const teacherName = `${c.teacherFirstName||''} ${c.teacherLastName||''}`.trim();
      let badgeHtml = '';
      if (adminLevel >= 1 && c.maxSlots && c.maxSlots > 0) {
        const left = Math.max(0, (c.maxSlots||0) - (c.assigned||0));
        const text = left === 0 ? 'Full' : String(left);
        const cls = left === 0 ? 'uk-label uk-label-danger' : 'uk-label uk-label-success';
        badgeHtml = ` <span class="${cls} uk-margin-small-left">${text}</span>`;
      }
      if (clubsBody) {
        clubsBody.innerHTML += `<tr>
          <td class="uk-text-muted">${c.clubId}</td>
          <td><a href="./club-info.html?club-id=${c.clubId}">${clubName}</a>${badgeHtml}</td>
          <td>${teacherName}</td>
          <td>${room || 'None'}</td>
        </tr>`;
      } else {
        const meta = `${teacherName} | Room: ${room || 'None'}`;
        clubsDiv.innerHTML += `<div class="club-item">
          <div class="club-name"><a href="./club-info.html?club-id=${c.clubId}">${clubName}</a>${badgeHtml}</div>
          <div class="club-meta">${meta}</div>
        </div>`;
      }
    }
  } catch (e) {
    // fallback: do nothing
  }
}

getClubsList();
