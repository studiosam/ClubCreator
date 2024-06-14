if (user.isAdmin === 0) {
  document.body.innerHTML = "<h1>NOT AN ADMIN</h1>";
}
const studentsTable = document.querySelector("#students-table");
let sortDirection = true;
(async () => {
  const students = await getStudents();
  if (students.length > 0) {
    const response = await fetch("http://localhost:3000/getAllClubs");
    const clubs = await response.json();

    students.forEach((student) => {
      const club = clubs.find((obj) => obj.clubId === student.clubId);
      const clubName = club ? club.clubName : "None";
      let avatarUrl = `https://ui-avatars.com/api/?name=${student.firstName}+${student.lastName}&background=0D8ABC&color=fff`;
      if (student.avatar) {
        avatarUrl = `${student.avatar}`;
      }

      studentsTable.innerHTML += `<tr>
         <td><input class="uk-checkbox" type="checkbox" aria-label="Checkbox"></td>
        <td><img class="uk-preserve-width uk-border-circle"
         src="${avatarUrl}" width="40" height="40" alt=""></td>
          <td class="">${student.userId}</td>
          <td class="">${student.firstName} ${student.lastName}</td>
          <td>${student.email}</td>
          <td class="uk-text-nowrap">${student.grade || "None"}</td>
          <td class="uk-text-nowrap">${student.room || "None"}</td>
          <td class="uk-text-nowrap uk-table-link"><a href="http://127.0.0.1:5500/club-info.html?club-id=${
            student.clubId
          }">${clubName}</a></td>
        </tr>`;
    });
  } else {
    console.log("No student");
  }
})();

async function getStudents() {
  const response = await fetch("http://127.0.0.1:3000/users/students");
  const students = await response.json();
  return students;
}

function searchTable() {
  const input = document.getElementById("search-input");
  const filter = input.value.toLowerCase();
  const rows = studentsTable.getElementsByTagName("tr");

  for (let i = 0; i < rows.length; i++) {
    const row = rows[i];
    const cells = row.getElementsByTagName("td");
    let match = false;
    for (let j = 0; j < cells.length; j++) {
      if (cells[j]) {
        const cellValue = cells[j].textContent || cells[j].innerText;
        if (cellValue.toLowerCase().indexOf(filter) > -1) {
          match = true;
          break;
        }
      }
    }
    row.style.display = match ? "" : "none";
  }
}

function sortTable(columnIndex) {
  const rows = Array.from(studentsTable.getElementsByTagName("tr"));
  const sortedRows = rows.sort((a, b) => {
    const aText = a
      .getElementsByTagName("td")
      [columnIndex].textContent.toLowerCase();
    const bText = b
      .getElementsByTagName("td")
      [columnIndex].textContent.toLowerCase();

    // Check if the column contains numeric values
    const aNumber = parseFloat(aText);
    const bNumber = parseFloat(bText);
    const isNumeric = !isNaN(aNumber) && !isNaN(bNumber);

    if (isNumeric) {
      return sortDirection ? aNumber - bNumber : bNumber - aNumber;
    } else {
      if (aText < bText) return sortDirection ? -1 : 1;
      if (aText > bText) return sortDirection ? 1 : -1;
      return 0;
    }
  });

  // Toggle the sort direction
  sortDirection = !sortDirection;

  // Remove current rows
  while (studentsTable.firstChild) {
    studentsTable.removeChild(studentsTable.firstChild);
  }

  // Append sorted rows
  sortedRows.forEach((row) => studentsTable.appendChild(row));
}
