if (user.isAdmin === 0) {
  document.body.innerHTML = "<h1>NOT AN ADMIN</h1>";
}

const tableBody = document.getElementById("nopref-table");
const emptyEl = document.getElementById("nopref-empty");
const countEl = document.getElementById("nopref-count");
const paginationInfo = document.getElementById("page-info");
const prevButton = document.getElementById("prev-button");
const nextButton = document.getElementById("next-button");
const printBtn = document.getElementById("print-nopref-btn");

let currentPage = 1;
const itemsPerPage = 10;
let sortBy = "userId";
let sortDirection = "asc";
let totalPages = 1;

async function fetchNoPrefStudents(page, searchQuery = "", sortBy = "userId", sortDirection = "asc") {
  const url = `http://${serverAddress}:3000/students/no-preferences?page=${page}&limit=${itemsPerPage}&search=${encodeURIComponent(searchQuery)}&sortBy=${sortBy}&sortDirection=${sortDirection}`;
  const res = await fetch(url);
  if (!res.ok) throw new Error("Failed to fetch no-preference students");
  return res.json();
}

async function fetchClubs() {
  const res = await fetch(`http://${serverAddress}:3000/getAllClubs`);
  if (!res.ok) return [];
  return res.json();
}

function renderRows(students, clubs) {
  tableBody.innerHTML = "";
  const clubMap = new Map((clubs || []).map(c => [String(c.clubId), c]));

  for (const s of students) {
    const club = clubMap.get(String(s.clubId));
    const clubRoom = club ? club.room : "Cafeteria";
    const clubName = club ? club.clubName : "None";
    let avatarUrl = `https://ui-avatars.com/api/?name=${encodeURIComponent(s.firstName||"")}+${encodeURIComponent(s.lastName||"")}&background=005DB4&color=fff`;
    if (s.avatar) avatarUrl = `${s.avatar}`;

    tableBody.innerHTML += `
      <tr>
        <td><img class="uk-preserve-width uk-border-circle" src="${avatarUrl}" width="40" height="40" alt=""></td>
        <td class="userId">${s.userId}</td>
        <td>${s.firstName || ''} ${s.lastName || ''}</td>
        <td>${s.email || ''}</td>
        <td class="uk-text-nowrap">${s.grade ?? 'None'}</td>
        <td class="uk-text-nowrap">${clubRoom || 'Cafeteria'}</td>
        <td class="uk-text-nowrap uk-table-link">${club ? `<a href="./club-info.html?club-id=${s.clubId}">${clubName}</a>` : 'None'}</td>
      </tr>`;
  }
}

function updatePaginationInfo(page, total, totalPagesValue) {
  if (!paginationInfo) return;
  paginationInfo.innerHTML = `<span>Page ${page} of ${totalPagesValue}</span> <p>Total Students: <span class="green">${total}</span></p>`;
  if (prevButton) prevButton.style.display = page <= 1 ? "none" : "inline-block";
  if (nextButton) nextButton.style.display = page >= totalPagesValue ? "none" : "inline-block";
}

async function displayNoPrefStudents(page, searchQuery = "") {
  try {
    const [{ users, total, totalPages: tp }, clubs] = await Promise.all([
      fetchNoPrefStudents(page, searchQuery, sortBy, sortDirection),
      fetchClubs()
    ]);
    countEl.textContent = String(total || users.length || 0);
    totalPages = tp || 1;
    updatePaginationInfo(page, total || users.length || 0, totalPages);
    if (!users || users.length === 0) {
      emptyEl.textContent = "Great news — all students submitted preferences.";
      tableBody.innerHTML = "";
      return;
    }
    emptyEl.textContent = "";
    renderRows(users, clubs);
  } catch (e) {
    console.error(e);
    emptyEl.textContent = "Failed to load students. Please try again.";
  }
}

function previousPage() {
  if (currentPage > 1) {
    currentPage--;
    const input = document.getElementById("search-input");
    const searchQuery = input ? input.value.toLowerCase() : "";
    displayNoPrefStudents(currentPage, searchQuery);
  }
}

function nextPage() {
  const input = document.getElementById("search-input");
  const searchQuery = input ? input.value.toLowerCase() : "";
  displayNoPrefStudents(currentPage + 1, searchQuery).then(() => {
    if (currentPage < totalPages) {
      currentPage++;
    }
  });
}

function sortTable(columnIndex, sortKey) {
  sortBy = sortKey;
  sortDirection = sortDirection === "asc" ? "desc" : "asc";
  const input = document.getElementById("search-input");
  const searchQuery = input ? input.value.toLowerCase() : "";
  displayNoPrefStudents(currentPage, searchQuery);
}

// Add event listener for the search input
document.getElementById("search-input").addEventListener("input", () => {
  const input = document.getElementById("search-input");
  const searchQuery = input ? input.value.toLowerCase() : "";
  currentPage = 1;
  displayNoPrefStudents(currentPage, searchQuery);
});

// initial load
displayNoPrefStudents(currentPage);

// Print a comprehensive list of names of students missing preferences
async function printNoPrefNames() {
  try {
    // Fetch all in one go (large limit), ordered by lastName
    const res = await fetch(`http://${serverAddress}:3000/students/no-preferences?page=1&limit=10000&sortBy=lastName&sortDirection=asc`);
    if (!res.ok) throw new Error("Failed to fetch full list");
    const data = await res.json();
    const users = Array.isArray(data.users) ? data.users : [];

    const lines = users.map((s) => {
      const first = s.firstName || "";
      const last = s.lastName || "";
      return `${last}, ${first}`.trim().replace(/^,\s*/, "");
    });

    const html = `<!doctype html>
<html><head><meta charset="utf-8"><title>Students Missing Preferences</title>
<style>
  body { font-family: system-ui, -apple-system, Segoe UI, Roboto, Arial, sans-serif; padding: 24px; }
  h1 { margin: 0 0 12px 0; }
  .meta { color: #666; margin: 0 0 16px 0; }
  ol { padding-left: 20px; }
  @media print {
    button { display: none; }
  }
  button { margin-bottom: 16px; }
  li { line-height: 1.5; }
  .count { font-weight: 600; }
</style></head>
<body>
  <button onclick="window.print()">Print</button>
  <h1>Students Missing Preferences</h1>
  <p class="meta">Total <span class="count">${lines.length}</span></p>
  <ol>
    ${lines.map((n) => `<li>${n}</li>`).join("")}
  </ol>
</body></html>`;

    const w = window.open("", "_blank");
    if (!w) {
      alert("Pop-up blocked. Please allow pop-ups to print.");
      return;
    }
    w.document.open();
    w.document.write(html);
    w.document.close();
    w.focus();
  } catch (e) {
    console.error(e);
    UIkit && UIkit.notification && UIkit.notification({ message: "Failed to prepare print list", status: "danger", pos: "top-center" });
  }
}

if (printBtn) {
  printBtn.addEventListener("click", printNoPrefNames);
}
