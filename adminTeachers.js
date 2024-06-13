if (user.isAdmin === 0) {
    document.body.innerHTML = "<h1>NOT AN ADMIN</h1>";
}
const teachersTable = document.querySelector('#teachers-table');
(async () => {
    const teachers = await getTeachers()
    const response = await fetch("http://localhost:3000/getAllClubs");
    const clubs = await response.json();

    teachers.forEach((teacher) => {
        const club = clubs.find((obj) => obj.clubId === teacher.clubId);
        const clubName = club ? club.clubName : 'None';
        let avatarUrl = `https://ui-avatars.com/api/?name=${teacher.firstName}+${teacher.lastName}&background=0D8ABC&color=fff`
        if (teacher.avatar) {
            avatarUrl = `${teacher.avatar}`
        }

        teachersTable.innerHTML +=
            `<tr>
         <td><input class="uk-checkbox" type="checkbox" aria-label="Checkbox"></td>
        <td><img class="uk-preserve-width uk-border-circle"
         src="${avatarUrl}" width="40" height="40" alt=""></td>
          <td class="">${teacher.userId}</td>
          <td class="">${teacher.firstName} ${teacher.lastName}</td>
          <td>${teacher.email}</td>
          <td class="uk-text-nowrap">${teacher.grade || 'None'}</td>
          <td class="uk-text-nowrap">${teacher.room || 'None'}</td>
          <td class="uk-text-nowrap uk-table-link"><a href="http://127.0.0.1:5500/club-info.html?club-id=${teacher.clubId}">${clubName}</a></td>
        </tr>`;
    });
})()

async function getTeachers() {
    const response = await fetch('http://127.0.0.1:3000/users/teachers')
    const teachers = await response.json()
    return teachers
}


function searchTable() {
    const input = document.getElementById('search-input');
    const filter = input.value.toLowerCase();
    const rows = teachersTable.getElementsByTagName('tr');

    for (let i = 0; i < rows.length; i++) {
        const row = rows[i];
        const cells = row.getElementsByTagName('td');
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
        row.style.display = match ? '' : 'none';
    }
}

function logout() {
    localStorage.removeItem("user");
    console.log("User has been cleared from local storage");
    window.location.href = "./index.html";
}