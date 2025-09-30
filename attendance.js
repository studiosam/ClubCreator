const form = document.querySelector("form");
const attendanceDiv = document.querySelector('#attendance')
const printbtn = document.querySelectorAll('.printbtn');
const clubsWithoutAttendanceDiv = document.querySelector('#clubs-without-attendance');
printbtn.forEach((btn) => {
    btn.addEventListener('click', () => {
        let divContents = attendanceDiv.innerHTML;
        if (divContents !== '') {
            let a = window.open('', '');
            a.document.write('<html>');
            a.document.write('<body>');
            a.document.write(divContents);
            a.document.write('</body></html>');
            a.document.close();
            a.print();
        }
    })
})
document.querySelector('#date').value = getDate()
let date = document.querySelector("#date").value;

getAttendanceFromDate(date);
form.addEventListener("submit", (e) => {
    e.preventDefault();

    let date = document.querySelector("#date").value;

    getAttendanceFromDate(date);
})
function getDate() {
    const today = new Date();
    const dd = String(today.getDate()).padStart(2, '0');
    const mm = String(today.getMonth() + 1).padStart(2, '0'); //January is 0!
    const yyyy = today.getFullYear();
    return `${yyyy}-${mm}-${dd}`;
}

async function getAttendanceFromDate(date) {
    // Reset previous output to avoid duplication
    attendanceDiv.innerHTML = "";
    clubsWithoutAttendanceDiv.innerHTML = "";

    const allClubsArray = []
    const clubsWithAttendance = []

    let json;
    try {
        const response = await fetch(`http://${serverAddress}:3000/getAttendanceFromDate`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ date: date })
        });
        json = await response.json();
        if (!response.ok || (json && Array.isArray(json.attendance) && json.attendance.length === 0)) {
            console.log(`[Attendance] No data for date ${date}`);
            if (window.UIkit && UIkit.notification) {
                UIkit.notification({
                    message: `No attendance data exists for ${date}.`,
                    status: 'danger',
                    pos: 'top-center',
                    timeout: 5000
                });
            }
            // Show a simple inline message for accessibility
            attendanceDiv.innerHTML = `<p class="uk-text-danger">No attendance data exists for ${date}.</p>`;
            // Continue so we can still compute the clubs-without-attendance list
            json = { attendance: [] };
        }
    } catch (e) {
        console.error(`[Attendance] Error fetching date ${date}:`, e);
        if (window.UIkit && UIkit.notification) {
            UIkit.notification({
                message: `Unable to load attendance for ${date}.`,
                status: 'danger',
                pos: 'top-center',
                timeout: 5000
            });
        }
        attendanceDiv.innerHTML = `<p class="uk-text-danger">Unable to load attendance for ${date}.</p>`;
        return;
    }

    // Continue with normal rendering path
    const allClubs = await fetch(`http://${serverAddress}:3000/getAllClubs`);
    const allClubsJson = await allClubs.json();
    allClubsJson.forEach((club) => {
        allClubsArray.push(club.clubId)
    });

    json.attendance.forEach((clubs) => {
        clubsWithAttendance.push(clubs.clubId)
    })

    const clubsWithoutAttendance = allClubsArray.filter((clubId) => !clubsWithAttendance.includes(clubId))

    clubsWithoutAttendance.forEach(async (club) => {
        const response = await fetch(`http://${serverAddress}:3000/getClubById?club=${club}`)
        const clubJson = await response.json();
        const clubName = clubJson.clubName

        clubsWithoutAttendanceDiv.innerHTML += `<a href="./club-info.html?club-id=${clubJson.clubId}"><p>${clubName}</p></a>`
    })
    displayAttendance(json)
}

async function displayAttendance(attendance) {

    if (!attendance || !Array.isArray(attendance.attendance) || attendance.attendance.length <= 0) {
        // Already handled upstream — just return silently to avoid duplicate messaging
        return;
    }
    attendanceDiv.innerHTML = ""
    const fetchPromises = attendance.attendance.flatMap(club =>
        club.studentsAbsent ? club.studentsAbsent.split(',').map(student =>
            fetch(`http://${serverAddress}:3000/usersInfo/${student}`)
                .then(response => response.json())
        )
            : []
    );

    const studentNames = await Promise.all(fetchPromises);


    studentNames.sort((a, b) => {
        if (a.lastName < b.lastName) {
            return -1;
        }
        if (a.lastName > b.lastName) {
            return 1;
        }
        return 0;
    });
    studentNames.forEach(studentInfo => {
        attendanceDiv.innerHTML += `<div class="bosab"><input type="checkbox"/><span>${studentInfo.lastName}, ${studentInfo.firstName}</span></div>`
    })

    document.querySelectorAll('input[type=checkbox]').forEach((checkbox) => {
        checkbox.addEventListener('change', (event) => {
            if (event.target.checked) {
                console.log(`${event.target.nextSibling.textContent} Checked`)
                event.target.nextSibling.style.color = "#007bff"
                event.target.nextSibling.style.fontWeight = "1"
            } else {
                event.target.nextSibling.style.color = "white"
                event.target.nextSibling.style.fontWeight = "400"
            }
        })
    })

}


window.addEventListener('beforeunload', function (e) {
    // Cancel the event
    e.preventDefault(); // Modern browsers require this to show the prompt

    // Display a custom message (the standard is not supported by most browsers anymore)
    e.returnValue = 'Are you sure you want to leave?';

    // Some older browsers also need this
    return 'Are you sure you want to leave?';
});


