async function getUser() {
  if (user) {
    console.log(`User: ${user.firstName} ${user.lastName}`);
    console.log(user);
    if (!user.isTeacher) {
      window.location.href = "https://www.youtube.com/watch?v=dQw4w9WgXcQ";
    }

    //getTeacherDashboard();
  } else {
    console.log(`Nobody is logged in`);
    window.location.href = "/";
  }
}
getUser();
const form = document.querySelector("#clubCreation");
form.addEventListener("submit", async (event) => {
  event.preventDefault();
  await createClub();
});
if (document.querySelector("#cover-input")) {
  document.querySelector("#cover-input").addEventListener('input', () => {
    if (document.querySelector("#cover-input").value) {
      document.querySelector('#selected-confirmation').classList.remove('hidden')
    }
  })
}
async function createClub() {
  const user = JSON.parse(localStorage.getItem("user"));
  const formData = new FormData(form);
  formData.set("teacherId", user.userId);
  formData.set("requiredCosponsors", formData.get("coSponsorsNeeded"));

  // Remove URLSearchParams as it doesn't support file uploads
  const response = await fetch(`http://${serverAddress}:3000/addClub`, {
    method: "post",
    body: formData,
  });

  const responseStatus = await response.json();
  form.reset();
  if (responseStatus.body === "Success") {
    document.querySelector("#status-message").innerHTML = `${responseStatus.clubInfo.preferredClub} Successfully Created!`;
    document.querySelector("#status").classList.add("uk-alert-success");
    document.querySelector("#status").style.display = "block";
  } else {
    document.querySelector("#status-message").innerHTML = `Error : ${responseStatus.body}`;
    document.querySelector("#status").classList.add("uk-alert-danger");
    document.querySelector("#status").style.display = "block";
  }
}

async function getAllClubs() {

  const response = await fetch(`http://${serverAddress}:3000/getAllClubs`);
  const clubs = await response.json();

  const filteredClubs = clubs.filter((obj) => obj.isApproved !== 0);

  filteredClubs.forEach(async (club) => {
    const response = await fetch(
      `http://${serverAddress}:3000/get-cosponsors/${club.clubId}`
    );
    const coSponsors = await response.json();

    const currentCoSponsors = coSponsors.cosponsors.length;
    const coSponsorsStillNeeded =
      club.coSponsorsNeeded - currentCoSponsors;
    if (coSponsorsStillNeeded > 0) {
      document.querySelector("#existingClubsList").innerHTML += `<li class="club-create-list-clubs"><span>${club.clubName}</span><button>Co-Sponsor</button></li>`
    } else {
      document.querySelector("#existingClubsList").innerHTML += `<li class="club-create-list-clubs"><span>${club.clubName}</span></li>`
    }

  })



}

getAllClubs();