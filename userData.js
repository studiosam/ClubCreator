// Session management (24h TTL)
const SESSION_TTL_MS = 24 * 60 * 60 * 1000;

function isSessionExpired() {
  const tsRaw = localStorage.getItem("user_timestamp");
  const ts = tsRaw ? parseInt(tsRaw, 10) : 0;
  if (!ts) return true;
  return Date.now() - ts > SESSION_TTL_MS;
}

function forceLogoutAndRedirect() {
  localStorage.removeItem("user");
  localStorage.removeItem("user_timestamp");
  window.location.href = "./index.html";
}

// Early check before any usage
const existingUserRaw = localStorage.getItem("user");
if (!existingUserRaw || isSessionExpired()) {
  forceLogoutAndRedirect();
}

const userUpdate = fetch(
  `http://${serverAddress}:3000/getUserInfo?userId=${JSON.parse(localStorage.getItem("user")).userId
  }`
)
  .then((response) => response.json())
  .then((user) => {
    // Refresh user object and session timestamp on page load
    localStorage.setItem("user", JSON.stringify(user));
    localStorage.setItem("user_timestamp", String(Date.now()));
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
    //document.querySelector('#create-link').remove()
    //document.querySelector('#account-settings').remove()
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
  localStorage.removeItem("user_timestamp");
  console.log("User has been cleared from local storage");
  window.location.href = "./index.html";
}
