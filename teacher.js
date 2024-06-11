const user = JSON.parse(localStorage.getItem("user"));

async function getUser() {
  if (user) {

    console.log(`User: ${user.firstName} ${user.lastName}`);
    console.log(user);
    if (!user.isTeacher) {
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
  await getTeacherDashboard();
}

getUser();

async function getTeacherDashboard() {
  const response = await fetch("http://localhost:3000/getAllClubs");
  const clubs = await response.json();

  const myApprovedClubs = await clubs.filter(
    (obj) => obj.primaryTeacherId === user.userId && obj.isApproved === 1
  );

  const myUnapprovedClubs = await clubs.filter(
    (obj) => obj.primaryTeacherId === user.userId && obj.isApproved === 0
  );
  document.querySelector("#current-clubs").innerHTML =
    myApprovedClubs.length || 0;
  document.querySelector("#pending-clubs").innerHTML =
    myUnapprovedClubs.length || 0;
  const myClubs = document.querySelector("#my-clubs");
  const unApprovedClubs = document.querySelector("#unapproved-clubs");
  myUnapprovedClubs.forEach((club) => {
    unApprovedClubs.innerHTML += `<a href="http://127.0.0.1:3000/club-info/${club.clubId}" class="uk-link-text">
    <div class="club">
      <p class="uk-card-title roboto">${club.clubName}</p>
      <p>${club.clubDescription}</p>
    </div></a><hr>
    `;
  });
  myApprovedClubs.forEach((club) => {
    myClubs.innerHTML += `<a href="http://127.0.0.1:3000/club-info/${club.clubId}" class="uk-link-text">
    <div class="club">
      <p class="uk-card-title roboto">${club.clubName}</p>
      <p>${club.clubDescription}</p>
    </div></a><hr>
    `;
  });
}

function logout() {
  localStorage.removeItem("user");
  console.log("User has been cleared from local storage");
  window.location.href = "./index.html";
}
