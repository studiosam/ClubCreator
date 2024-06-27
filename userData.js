const userUpdate = fetch(
  `http://${serverAddress}:3000/getUserInfo?userId=${JSON.parse(localStorage.getItem("user")).userId
  }`
)
  .then((response) => response.json())
  .then((user) => {
    localStorage.setItem("user", JSON.stringify(user));
  });

const user = JSON.parse(localStorage.getItem("user"));
if (document.querySelector(".avatar")) {
  if (user.avatar) {
    document.querySelectorAll(".avatar").forEach((avatar) => {
      avatar.src = user.avatar;
    });
  } else {
    document.querySelectorAll(".avatar").forEach((avatar) => {
      avatar.src = `https://ui-avatars.com/api/?name=${user.firstName}+${user.lastName}&background=0D8ABC&color=fff`;
    });
  }
}
document.querySelector(
  "#user-name"
).innerHTML = `${user.firstName} ${user.lastName}`;

if (user) {
  if (user.isAdmin) {
    buildAdminMenu();
    document.querySelector("#user-name").classList.add("gold");
    document.querySelector(
      "#user-name"
    ).innerHTML += `<div><a href="home-admin.html">ADMIN</a></div>`;
    document.querySelector("#homepage-link").href = "home-teacher.html";
  } else if (user.isTeacher) {
    document.querySelector(
      "#user-name"
    ).innerHTML += `<div style="text-align:right"class="blue"><span>Teacher</span></div>`;
    document.querySelector("#homepage-link").href = "home-teacher.html";
  } else {
    console.log("student");
    document.querySelector(
      "#user-name"
    ).innerHTML += `<div style="text-align:right"class="blue"><span>Student</span></div>`;
    document.querySelector("#homepage-link").href = "home-student.html";
  }
}

async function buildAdminMenu() {
  const menu = document.querySelector(".dash-nav");
  menu.innerHTML += `<div class= "text-center"><hr class="uk-margin-medium-right uk-margin-top">
  <a href="home-admin.html"><li><p class="uk-margin-medium-right">ADMIN MENU</p></li></a>
  </div>
  <li><a class="gold" href="home-admin.html"><span uk-icon="icon: settings"></span>Admin Home</a></li>
  <li><a class="gold" href="/users-students.html"><span uk-icon="icon: pencil"></span>Students</a></li>
  <li><a class="gold" href="/users-teachers.html"><span uk-icon="icon: database"></span>Teachers</a></li>
`;
}

function logout() {
  localStorage.removeItem("user");
  console.log("User has been cleared from local storage");
  window.location.href = "./index.html";
}
