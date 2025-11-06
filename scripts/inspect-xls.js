const path = require('path');
const node_xj = require('xls-to-json');

const file = process.argv[2] || path.join(process.cwd(), 'file.xls');

function parseXls(filePath) {
  return new Promise((resolve, reject) => {
    node_xj({ input: filePath, output: null, rowsToSkip: 0, allowEmptyKey: true }, (err, result) => {
      if (err) return reject(err);
      resolve(result || []);
    });
  });
}

(async () => {
  try {
    const rows = await parseXls(file);
    console.log('Rows:', rows.length);
    if (!rows.length) return;
    // Print header keys from first row
    const keys = Object.keys(rows[0]);
    console.log('Keys:', keys);
    // Print first 3 rows relevant fields
    const norm = (s) => String(s||'').toLowerCase().replace(/\./g,'').replace(/\s+/g,' ').trim();
    rows.slice(0, 10).forEach((r, idx) => {
      const homeRoom = r['Home_Room'] || r['Home Room'] || r['Homeroom'] || r['HomeRoom'];
      const email = r['Student_Email_DONOTUSE'] || r['Student_Email'] || r['Student Email'] || r['Email'];
      console.log(`#${idx+1}`, { email, homeRoom, normHomeRoom: norm(homeRoom) });
    });
    // Count off-campus based on the exact strings user specified
    const offRows = rows.filter(r => {
      const hrRaw = r['Home_Room'] || r['Home Room'] || r['Homeroom'] || r['HomeRoom'] || '';
      const v = String(hrRaw).trim();
      return v === 'GSP' || v === 'Univ High' || v === 'May, Olivia Laura-Ann';
    });
    const offCount = offRows.length;
    const blankEmail = offRows.filter(r => !(r['Student_Email_DONOTUSE'] || r['Student_Email'] || r['Student Email'] || r['Email'])).length;
    console.log('Exact-match off-campus count (GSP/Univ High/May, Olivia Laura-Ann):', offCount, 'blank-email:', blankEmail);
  } catch (e) {
    console.error('Failed to parse XLS:', e.message);
    process.exit(1);
  }
})();
