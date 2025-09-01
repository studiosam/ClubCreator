if (user.isAdmin === 0) {
  document.body.innerHTML = "<h1>NOT AN ADMIN</h1>";
}
const studentsTable = document.querySelector("#students-table");
const sidePanel = document.getElementById("side-panel");
const clubSelect = document.getElementById("club-select");
const paginationInfo = document.getElementById("page-info");
const prevButton = document.getElementById("prev-button");
const nextButton = document.getElementById("next-button");
const deletionItems = document.getElementById("deletion-items");
const panelTitle = document.getElementById("panel-title");
const selectedUserNameEl = document.getElementById("selected-user-name");
let currentSelectedUserId = null; // single-selection via name click
let currentSelectedUserName = "";
let currentPage = 1;
const itemsPerPage = 10;
let sortBy = "userId";
let sortDirection = "asc";
let totalPages = 1;
let students = [];
let selectedUserIds = [];
let lastChecked;
let boxes = [];

function changeBox(event) {
  if (event.shiftKey && this != lastChecked) {
    checkIntermediateBoxes(lastChecked, this);
  }

  lastChecked = this;
}

function checkIntermediateBoxes(first, second) {
  if (boxes.indexOf(first) > boxes.indexOf(second)) {
    [second, first] = [first, second];
  }

  intermediateBoxes(first, second).forEach((box) => (box.checked = true));
}

function intermediateBoxes(start, end) {
  return boxes.filter((item, key) => {
    return boxes.indexOf(start) < key && key < boxes.indexOf(end);
  });
}
// Name-click opens the side panel for a single user
function selectUserAndOpenPanel(userId, name) {
  currentSelectedUserId = String(userId);
  currentSelectedUserName = name || "";
  if (panelTitle) panelTitle.textContent = `User Actions — ${currentSelectedUserName}`;
  if (selectedUserNameEl) selectedUserNameEl.textContent = currentSelectedUserName;
  if (deletionItems) deletionItems.innerHTML = "1";
  showSidePanel();
}

function showSidePanel() {
  UIkit.offcanvas(sidePanel).show();
  // sidePanel.style.display = "block";
}

// Function to hide side panel
function hideSidePanel() {
  UIkit.offcanvas(sidePanel).hide();
  // sidePanel.style.display = "none";
}

async function deleteSelectedUsers() {
  const selectedUserIds = getSelectedUserIds();

  if (selectedUserIds.length > 0) {
    if (
      confirm(
        `Are you sure you want to delete ${selectedUserIds.length} user(s)?`
      )
    ) {
      try {
        const deleteRequests = selectedUserIds.map((userId) =>
          fetch(`http://${serverAddress}:3000/users/delete/${userId}`, {})
        );

        await Promise.all(deleteRequests);

        UIkit.notification({
          message: "Users deleted successfully",
          status: "success",
          pos: "top-center",
          timeout: 5000,
        });

        // Refresh or update table
        displayStudents(currentPage); // Assuming displayStudents function is defined
      } catch (error) {
        console.error("Error deleting users:", error);
        UIkit.notification({
          message: "Failed to delete users",
          status: "danger",
          pos: "top-center",
          timeout: 5000,
        });
      }
    }
  } else {
    UIkit.notification({
      message: "No Users Selected",
      status: "danger",
      pos: "top-center",
      timeout: 5000,
    });
  }

  hideSidePanel();
}

async function populateClubSelect() {
  try {
    const response = await fetch(`http://${serverAddress}:3000/getAllClubs`);
    const clubs = await response.json();

    clubSelect.innerHTML = clubs
      .map((club) => `<option value="${club.clubId}">${club.clubName}</option>`)
      .join("");
  } catch (error) {
    console.error("Error fetching clubs:", error);
    UIkit.notification({
      message: "Failed To Fetch Clubs",
      status: "danger",
      pos: "top-center",
      timeout: 5000,
    });
  }
}

async function addToClub() {
  const clubId = clubSelect.value;
  const selectedUserIds = getSelectedUserIds();

  if (selectedUserIds.length > 0 && clubId) {
    try {
      const updateRequests = selectedUserIds.map((userId) =>
        fetch(`http://${serverAddress}:3000/users/updateStudentClub/${userId}/${clubId}`)
      );

      await Promise.all(updateRequests);
      UIkit.notification({
        message: "Users added to clubs Successfully",
        status: "success",
        pos: "top-center",
        timeout: 5000,
      });
      // Refresh or update table
      displayStudents(currentPage); // Assuming displayStudents function is defined
    } catch (error) {
      console.error("Error adding users to club:", error);
      UIkit.notification({
        message: "Failed To Add Users to Clubs",
        status: "danger",
        pos: "top-center",
        timeout: 5000,
      });
    }
  } else {
    UIkit.notification({
      message: "Please Select at least one club and User",
      status: "danger",
      pos: "top-center",
      timeout: 5000,
    });
  }

  hideSidePanel();
}

function getSelectedUserIds() {
  // Prefer current single selection (name click)
  if (currentSelectedUserId) return [currentSelectedUserId];
  // Fallback: legacy checkbox path (if any remain)
  const students = studentsTable.querySelectorAll(".userId");
  const checkboxes = studentsTable.querySelectorAll('input[type="checkbox"]');
  const ids = [];
  checkboxes.forEach((checkbox, index) => {
    if (checkbox.checked) ids.push(students[index].innerHTML);
  });
  return ids;
}

async function fetchStudents(
  page,
  searchQuery = "",
  sortBy = "userId",
  sortDirection = "asc"
) {
  const response = await fetch(
    `http://${serverAddress}:3000/users/students?page=${page}&limit=${itemsPerPage}&search=${encodeURIComponent(
      searchQuery
    )}&sortBy=${sortBy}&sortDirection=${sortDirection}`
  );
  return await response.json();
}
async function displayStudents(page, searchQuery = "") {
  const data = await fetchStudents(page, searchQuery, sortBy, sortDirection);
  const students = data.users;
  totalPages = data.totalPages; // Update totalPages
  studentsTable.innerHTML = "";
  if (students.length > 0) {
    const response = await fetch(`http://${serverAddress}:3000/getAllClubs`);
    const clubs = await response.json();

    students.forEach((student) => {
      const club = clubs.find((obj) => obj.clubId === student.clubId);
      console.log(club);
      const clubRoom = club ? club.room : "Cafeteria";
      const clubName = club ? club.clubName : "None";
      let avatarUrl = `https://ui-avatars.com/api/?name=${student.firstName}+${student.lastName}&background=005DB4&color=fff`;
      if (student.avatar) {
        avatarUrl = `${student.avatar}`;
      }

      studentsTable.innerHTML += `<tr>
         <td><img class="uk-preserve-width uk-border-circle"
          src="${avatarUrl}" width="40" height="40" alt=""></td>
          <td class="userId">${student.userId}</td>
          <td class="student-name" data-user-id="${student.userId}"><a href="#" class="uk-link-text">${student.firstName} ${student.lastName}</a></td>
          <td>${student.email}</td>
          <td class="uk-text-nowrap">${student.grade || "None"}</td>
          <td class="uk-text-nowrap">${clubRoom}</td>
          <td class="uk-text-nowrap uk-table-link"><a href="./club-info.html?club-id=${student.clubId
        }">${clubName}</a></td>
        </tr>`;
    });
    updatePaginationInfo(page, data.total, totalPages);
  } else {
    studentsTable.innerHTML = "<p>No Students!</p>";
  }
}
function updatePaginationInfo(page, total, totalPages) {
  paginationInfo.innerHTML = `<span>Page ${page} of ${totalPages}</span> <p>Total Students: <span class="green">${total}</span></p>`;

  // Hide or show pagination buttons based on the current page
  prevButton.style.display = page <= 1 ? "none" : "inline-block";
  nextButton.style.display = page >= totalPages ? "none" : "inline-block";
}

function previousPage() {
  if (currentPage > 1) {
    currentPage--;
    displayStudents(currentPage);
  }
}

function nextPage() {
  displayStudents(currentPage + 1).then(() => {
    if (currentPage < totalPages) {
      currentPage++;
    }
  });
}

function searchTable() {
  const input = document.getElementById("search-input");
  const searchQuery = input.value.toLowerCase();
  currentPage = 1; // Reset to the first page when searching
  displayStudents(currentPage, searchQuery);
}

function sortTable(columnIndex, sortKey) {
  sortBy = sortKey;
  sortDirection = sortDirection === "asc" ? "desc" : "asc";
  displayStudents(currentPage);
}

// Add event listener for the search input
document.getElementById("search-input").addEventListener("input", () => {
  searchTable();
});

async function init() {
  await populateClubSelect();
  await displayStudents(currentPage);
}

init();
// Delegate clicks on the name cell
studentsTable.addEventListener("click", (e) => {
  const cell = e.target.closest('.student-name');
  if (cell && studentsTable.contains(cell)) {
    const id = cell.getAttribute('data-user-id');
    const name = cell.textContent.trim();
    if (id) {
      e.preventDefault();
      selectUserAndOpenPanel(id, name);
    }
  }
});
