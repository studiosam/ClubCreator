const form = document.querySelector("form");
const attendanceDiv = document.querySelector('#attendance')
const printbtn = document.querySelectorAll('.printbtn');
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
    const response = await fetch(`http://${serverAddress}:3000/getAttendanceFromDate`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ date: date })

    });
    const json = await response.json();
    displayAttendance(json)
}

async function displayAttendance(attendance) {

    attendanceDiv.innerHTML = ""
    const fetchPromises = attendance.attendance.flatMap(club =>
        club.studentsAbsent.split(',').map(student =>
            fetch(`http://${serverAddress}:3000/usersInfo/${student}`)
                .then(response => response.json())
        )
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


