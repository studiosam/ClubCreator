const clubsDiv = document.querySelector('#clubs')
const printbtn = document.querySelectorAll('.printbtn');

printbtn.forEach((btn) => {
    btn.addEventListener('click', () => {
        let divContents = clubsDiv.innerHTML;
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

async function getClubsList() {
    const allClubs = await fetch(`http://${serverAddress}:3000/getAllClubs`);
    const allClubsJson = await allClubs.json();
    allClubsJson.sort((a, b) => {
        if (a.clubName < b.clubName) {
            return -1;
        }
        if (a.clubName > b.clubName) {
            return 1;
        }
        return 0;
    });
    allClubsJson.forEach(async (club) => {
        const teacherresponse = await fetch(`http://${serverAddress}:3000/usersInfo/${club.primaryTeacherId}`)
        const teacher = await teacherresponse.json()
        const response = await fetch(`http://${serverAddress}:3000/getClubById?club=${club.clubId}`)
        const clubJson = await response.json();
        const clubName = clubJson.clubName
        clubsDiv.innerHTML += `<div><a href="./club-info.html?club-id=${clubJson.clubId}"><span>${clubName}</span></a><span> | ${teacher.firstName} ${teacher.lastName}</span><span> | Room: ${club.room}</span></div>`

    });

}




getClubsList() 
