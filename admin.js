const isAdmin = JSON.parse(localStorage.getItem('user'));
console.log(isAdmin)
// if (isAdmin.isAdmin === 0) {
//     document.body.innerHTML = '<h1>NOT AN ADMIN</h1>';

// }
const approvedClubList = document.querySelector('#approvedClubList')
const clubProposals = document.querySelector('#clubProposalList')


getAllApprovedClubs()
getAllUnapprovedClubs()


async function getAllApprovedClubs() {
    const response = await fetch('http://localhost:3000/getAllClubs');
    const clubs = await response.json();
    const filteredClubs = clubs.filter(
        (obj) => obj.isApproved !== 0
    );
    if (filteredClubs.length <= 0) {
        clubProposals.innerHTML = 'No Approved Clubs'
    }


    filteredClubs.forEach(club => {

        approvedClubList.innerHTML += `<div id="${club.clubId}">
        <p>Club : ${club.clubName}</p>
        <p>Club Description : ${club.clubDescription}</p>

        <span>Max Slots: </span><input style="width: 40px" type="number" value="${club.maxSlots}">
        <div>
        <p>Minimum Slots:</p>
        <div id="minSlots">
        <span>9th Grade: </span><input class = "slots9" style="width: 40px" type="number" value="0">
        <span>10th Grade: </span><input class = "slots10" style="width: 40px" type="number" value="0">
        <span>11th Grade: </span><input class = "slots11" style="width: 40px" type="number" value="0">
        <span>12th Grade: </span><input class = "slots12" style="width: 40px" type="number" value="0">
        </div>
        </div>
        <button id="approve${club.clubId}" class="approveBtn">Confirm</button>
        </div>`
    });
    const minimumSlots = document.querySelectorAll('#minSlots input')
    document.querySelectorAll('.approveBtn').forEach(element => {
        element.addEventListener('click', (e) => {
            clubId = e.target.parentElement.id;
            //UpdateClubInfo(clubId)

        })
    })

}
//////////////FIXME///////////////////////////////
async function UpdateClubInfo(clubId) {
    const response = await fetch('http://localhost:3000/updateClubInfo',
        {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                clubId: clubId
            })
        }
    )
    const json = await response.json()
    console.log(json)
    if (json.status === 200) {
        console.log(json.message)
    } else {
        console.log(json.message)
    }
}
///////////////////////////////////////////////
async function getAllUnapprovedClubs() {
    const response = await fetch('http://localhost:3000/getAllClubs');
    const clubs = await response.json();
    const filteredClubs = clubs.filter(
        (obj) => obj.isApproved !== 1
    );

    if (filteredClubs.length <= 0) {
        clubProposals.innerHTML = 'No Pending Club Approvals'
    }
    filteredClubs.forEach(club => {
        clubProposals.innerHTML += `<div>
        <p>Club : ${club.clubName}</p>
        <p>Club Description : ${club.clubDescription}</p>
        <span>Max Slots: </span><input style="width: 40px" type="number" value="${club.maxSlots}">
        
        <button onclick="approveClub(${club.clubId})">Approve</button>
        </div>`
    });
}
async function approveClub(clubId) {
    console.log(clubId);


    const response = await fetch('http://localhost:3000/approveClub',
        {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                clubId: clubId
            })
        }
    )
    const json = await response.json()

}