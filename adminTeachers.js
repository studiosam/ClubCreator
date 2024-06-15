if (user.isAdmin === 0) {
  document.body.innerHTML = "<h1>NOT AN ADMIN</h1>";
}
const teachersTable = document.querySelector("#teachers-table");
const paginationInfo = document.getElementById("page-info");
const prevButton = document.getElementById("prev-button");
const nextButton = document.getElementById("next-button");

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
    `http://127.0.0.1:3000/users/teachers?page=${page}&limit=${itemsPerPage}&search=${encodeURIComponent(
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
    const response = await fetch("http://localhost:3000/getAllClubs");
    const clubs = await response.json();

    teachers.forEach((teacher) => {
      const club = clubs.find((obj) => obj.clubId === teacher.clubId);
      const clubName = club ? club.clubName : "None";
      let avatarUrl = `https://ui-avatars.com/api/?name=${teacher.firstName}+${teacher.lastName}&background=0D8ABC&color=fff`;
      if (teacher.avatar) {
        avatarUrl = `${teacher.avatar}`;
      }

      teachersTable.innerHTML += `<tr>
         <td><input class="uk-checkbox" type="checkbox" aria-label="Checkbox"></td>
        <td><img class="uk-preserve-width uk-border-circle"
         src="${avatarUrl}" width="40" height="40" alt=""></td>
          <td class="">${teacher.userId}</td>
          <td class="">${teacher.firstName} ${teacher.lastName}</td>
          <td>${teacher.email}</td>
          <td class="uk-text-nowrap">${teacher.grade || "None"}</td>
          <td class="uk-text-nowrap">${teacher.room || "None"}</td>
          <td class="uk-text-nowrap uk-table-link"><a href="http://127.0.0.1:5500/club-info.html?club-id=${
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
