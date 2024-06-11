const user = JSON.parse(localStorage.getItem("user"));
async function getUser() {
    if (user) {
        console.log(`User: ${user.firstName} ${user.lastName}`);
        console.log(user);
        if (user.isTeacher) {
            window.location.href = "https://www.youtube.com/watch?v=dQw4w9WgXcQ";
        }

        document.querySelector(
            "#user-name"
        ).innerHTML = `${user.firstName} ${user.lastName}`;
        //getTeacherDashboard();
    } else {
        console.log(`Nobody is logged in`);
        window.location.href = "/";
    }
    await getStudentDashboard();
}

getUser();

async function getStudentDashboard() {
    const response = await fetch("http://localhost:3000/getAllClubs");
    const clubs = await response.json();

    const myAssignedClub = await clubs.filter(
        (obj) => obj.clubId === user.clubId
    );
    if (myAssignedClub.length > 0) {

        const myClubs = document.querySelector("#my-club");
        myAssignedClub.forEach((club) => {
            myClubs.innerHTML += `<a href="http://127.0.0.1:3000/club-info/${club.clubId}" class="uk-link-text">
    <div class="club">
      <p class="uk-card-title roboto">${club.clubName}</p>
      <p>${club.clubDescription}</p>
    </div></a><hr>
    `;
        })
    } else { // this is the else statement that i was right about 2024.06.09.22:43 per discord pinned message
        const allClubs = document.querySelector("#my-club");
        document.querySelector('#menuInstructions').innerHTML = `<h3 id="menuHeading" class="uk-card-title roboto">Please select your top 5 preferences for our club activities this semester.</h3>
        <p><strong class="red">You must select exactly 5 choices.</strong></p>`

        clubs.forEach((club) => {
            allClubs.innerHTML += `<div class="club-choice"><input id="${club.clubId}-${club.clubName}" class="club-input" type="checkbox"><a href="http://127.0.0.1:3000/club-info/${club.clubId}" class="uk-link-text">
        <div class="club">
          <p class="uk-card-title roboto">${club.clubName}</p>
          </div>
          <p id="${club.clubId}club-description">${club.clubDescription}</p>
        </div></a><hr>
        `;
        })
        document.querySelector('#card-footer').innerHTML = `<div class="text-center"><button id="submit" class="uk-button uk-button-primary">Submitch</button></div>`
        document.querySelector('#submit').addEventListener('click', async () => {
            const checkedClubs = document.querySelectorAll('.club-input:checked');
            if (checkedClubs.length > 5) {
                UIkit.notification({
                    message: 'You may not select more than 5 clubs!',
                    status: 'danger',
                    pos: 'top-center',
                    timeout: 5000
                });
            } else if (checkedClubs.length < 5) {
                UIkit.notification({
                    message: 'You must select exactly 5 clubs',
                    status: 'danger',
                    pos: 'top-center',
                    timeout: 5000
                });
            }
            else {
                document.querySelector('#status').style.display = "none"
                document.querySelector('#status-message').innerHTML = ""
                console.log(checkedClubs);
                const clubIds = [];
                checkedClubs.forEach((club) => {
                    clubIds.push({
                        clubId: club.id.split('-')[0],
                        clubName: club.id.split('-')[1],
                        clubDescription: document.getElementById(`${club.id.split('-')[0]}club-description`).innerHTML
                    })

                })
                selectedClubList(clubIds)
            }

        })
    }
}

function selectedClubList(clubs) {
    document.querySelector('#card-footer').innerHTML = `<div class="text-center"><button id="submit-selections" class="uk-button uk-button-primary">Submitch</button></div>`
    const allClubs = document.querySelector("#my-club");
    allClubs.innerHTML = "";
    document.querySelector('#menuInstructions').innerHTML = `<h3 id="menuHeading" class="uk-card-title roboto">Put the 5 clubs you chose in order from your favorite to the least favorite</h3>
        <p><strong class="red">Put your favorite club at the top.</strong></p>`
    clubs.forEach((club) => {
        allClubs.innerHTML += `<div id="${club.clubId}" class="uk-sortable-handle uk-flex"><span style="margin-top: 9px" class="uk-margin-small-right uk-text-center" uk-icon="icon: table"></span><a href="http://127.0.0.1:3000/club-info/${club.clubId}" class="uk-link-text">
    
          <p class="uk-card-title roboto">${club.clubName}</p>
          <p>${club.clubDescription}</p>
         
        </a><hr>
        </div>`;
    })
    document.querySelector('#submit-selections').addEventListener('click', async () => {
        const user = JSON.parse(localStorage.getItem("user"));
        const userId = user.userId;
        console.log('USERID', userId)
        const clubOrder = []
        const clubList = document.querySelectorAll('.uk-sortable-handle')
        clubList.forEach((club) => {
            clubOrder.push(club.id)
        })
        console.log(clubOrder)
        const response = await fetch("http://localhost:3000/setClubPrefs", {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ clubOrder: clubOrder, student: userId })
        });
        const userResult = await response.json();
        console.log(userResult);
        if (userResult.body === "Success") {
            UIkit.notification({
                message: 'Your club preferences have been saved!',
                status: 'success',
                pos: 'top-center',
                timeout: 5000
            });
        }
    })
}

function logout() {
    localStorage.removeItem("user");
    console.log("User has been cleared from local storage");
    window.location.href = "./index.html";
}