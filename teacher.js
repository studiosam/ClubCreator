const user = JSON.parse(localStorage.getItem("user"));
async function getUser() {
  if (user) {
    console.log(`User: ${user.firstName} ${user.lastName}`);
    console.log(user);
    if (!user.isTeacher) {
      window.location.href = "https://www.youtube.com/watch?v=dQw4w9WgXcQ";
    }

    const userInfo = document.querySelector("#userInfo");
    userInfo.innerHTML = `
        <p id="name">
            Welcome, ${user.firstName.toUpperCase()} ${user.lastName.toUpperCase()}!
        </p>
        <p id="email">
            Email: ${user.email}
        </p>
        <p id="club">
            Club:
        </p>
        `;
  } else {
    console.log(`Nobody is logged in`);
  }
  await getAllApprovedClubs();
}

getUser();

async function getAllApprovedClubs() {
  const response = await fetch("http://localhost:3000/getAllClubs");
  const clubs = await response.json();

  const myApprovedClubs = await clubs.filter(
    (obj) => obj.primaryTeacherId === user.userId && obj.isApproved === 1
  );
  const myUnapprovedClubs = await clubs.filter(
    (obj) => obj.primaryTeacherId === user.userId && obj.isApproved === 0
  );
  const myClubs = document.querySelector("#club");
  myApprovedClubs.forEach((club) => {
    myClubs.innerHTML += `
    <div class="uk-margin uk-card uk-card-default uk-card-body">
      <h3 class="uk-card-title">${club.clubName}</h3>
      <p>${club.clubDescription}</p>
    </div>
    `;
  });
}

function logout() {
  localStorage.removeItem("user");
  console.log("User has been cleared from local storage");
  window.location.href = "./index.html";
}
