if (user.isAdmin === 0) {
  document.body.innerHTML = "<h1>NOT AN ADMIN</h1>";
}
const teachersTable = document.querySelector("#teachers-table");
const paginationInfo = document.getElementById("page-info");
const prevButton = document.getElementById("prev-button");
const nextButton = document.getElementById("next-button");
const sidePanel = document.getElementById("side-panel");
const clubSelect = document.getElementById("club-select");
const panelTitle = document.getElementById("panel-title");
const selectedUserNameEl = document.getElementById("selected-user-name");
let currentSelectedUserId = null;
let currentSelectedUserName = "";

let currentPage = 1;
const itemsPerPage = 10;
let sortBy = "userId";
let sortDirection = "asc";
let totalPages = 1;

async function fetchTeachers(
  page,
  searchQuery = "",
  sortBy = "userId",
  sortDirection = "asc"
) {
  const response = await fetch(
    `http://${serverAddress}:3000/users/teachers?page=${page}&limit=${itemsPerPage}&search=${encodeURIComponent(
      searchQuery
    )}&sortBy=${sortBy}&sortDirection=${sortDirection}`
  );
  return await response.json();
}

async function displayTeachers(page, searchQuery = "") {
  const data = await fetchTeachers(page, searchQuery, sortBy, sortDirection);
  const teachers = data.users;
  totalPages = data.totalPages; // Update totalPages
  teachersTable.innerHTML = "";
  if (teachers.length > 0) {
    const response = await fetch(`http://${serverAddress}:3000/getAllClubs`);
    const clubs = await response.json();

    teachers.forEach((teacher) => {
      const club = clubs.find((obj) => obj.clubId === teacher.clubId);
      const clubName = club ? club.clubName : "None";
      let avatarUrl = `https://ui-avatars.com/api/?name=${teacher.firstName}+${teacher.lastName}&background=005DB4&color=fff`;
      if (teacher.avatar) {
        avatarUrl = `${teacher.avatar}`;
      }

      teachersTable.innerHTML += `<tr>
         <td><img class="uk-preserve-width uk-border-circle"
          src="${avatarUrl}" width="40" height="40" alt=""></td>
          <td class="">${teacher.userId}</td>
          <td class="teacher-name" data-user-id="${teacher.userId}"><a href="#" class="uk-link-text">${teacher.firstName} ${teacher.lastName}</a></td>
          <td>${teacher.email}</td>
          <td class="uk-text-nowrap">${teacher.grade || "None"}</td>
          <td class="uk-text-nowrap">${teacher.room || "None"}</td>
          <td class="uk-text-nowrap uk-table-link"><a href="./club-info.html?club-id=${
         teacher.clubId
      }">${clubName}</a></td>
        </tr>`;
    });
    updatePaginationInfo(page, data.total, totalPages);
  } else {
    console.log("No teacher");
  }
}

function updatePaginationInfo(page, total, totalPages) {
  paginationInfo.textContent = `Page ${page} of ${totalPages}, Total Teachers: ${total}`;

  // Hide or show pagination buttons based on the current page
  prevButton.style.display = page <= 1 ? "none" : "inline-block";
  nextButton.style.display = page >= totalPages ? "none" : "inline-block";
}

function previousPage() {
  if (currentPage > 1) {
    currentPage--;
    displayTeachers(currentPage);
  }
}

function nextPage() {
  if (currentPage < totalPages) {
    // Check if next page exists
    currentPage++;
    displayTeachers(currentPage);
  }
}
// Initial load
displayTeachers(currentPage);

function searchTable() {
  const input = document.getElementById("search-input");
  const searchQuery = input.value.toLowerCase();
  currentPage = 1; // Reset to the first page when searching
  displayTeachers(currentPage, searchQuery);
}

function sortTable(columnIndex, sortKey) {
  sortBy = sortKey;
  sortDirection = sortDirection === "asc" ? "desc" : "asc";
  displayTeachers(currentPage);
}

// Add event listener for the search input
document.getElementById("search-input").addEventListener("input", () => {
  searchTable();
});

// Populate clubs into the select
async function populateClubSelect() {
  try {
    const response = await fetch(`http://${serverAddress}:3000/getAllClubs`);
    const clubs = await response.json();
    if (clubSelect) {
      clubSelect.innerHTML = clubs
        .map((club) => `<option value="${club.clubId}">${club.clubName}</option>`) 
        .join("");
    }
  } catch (err) {
    console.error("Error fetching clubs", err);
  }
}

function showSidePanel() {
  if (sidePanel) UIkit.offcanvas(sidePanel).show();
}
function hideSidePanel() {
  if (sidePanel) UIkit.offcanvas(sidePanel).hide();
}

// Open on teacher name click
teachersTable.addEventListener("click", (e) => {
  const cell = e.target.closest('.teacher-name');
  if (cell && teachersTable.contains(cell)) {
    e.preventDefault();
    currentSelectedUserId = String(cell.getAttribute('data-user-id'));
    currentSelectedUserName = cell.textContent.trim();
    if (panelTitle) panelTitle.textContent = `User Actions — ${currentSelectedUserName}`;
    if (selectedUserNameEl) selectedUserNameEl.textContent = currentSelectedUserName;
    showSidePanel();
  }
});

async function addToClub() {
  try {
    const clubId = clubSelect ? clubSelect.value : null;
    if (!currentSelectedUserId || !clubId) return;
    await fetch(`http://${serverAddress}:3000/users/update/${currentSelectedUserId}/${clubId}`);
    await displayTeachers(currentPage);
    hideSidePanel();
    UIkit.notification({ message: "Teacher updated", status: "success", pos: "top-center", timeout: 3000 });
  } catch (err) {
    console.error(err);
    UIkit.notification({ message: "Failed to update teacher", status: "danger", pos: "top-center", timeout: 4000 });
  }
}

// Init
populateClubSelect();
