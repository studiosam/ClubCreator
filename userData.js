const userUpdate = fetch(`http://localhost:3000/getUserInfo?userId=${JSON.parse(localStorage.getItem("user")).userId}`)
  .then((response) => response.json())
  .then((user) => {
    localStorage.setItem("user", JSON.stringify(user))
  })

const userType = JSON.parse(localStorage.getItem("user"));
if (user) {
  if (user.isAdmin) {
    buildAdminMenu();
    document.querySelector("#user-name").classList.add("gold");
    document.querySelector(
      "#user-name"
    ).innerHTML += `<div><a href="home-admin.html">ADMIN</a></div>`;
  }
}

async function buildAdminMenu() {
  const menu = document.querySelector(".dash-nav");
  menu.innerHTML += `<div class= "text-center"><hr class="uk-margin-medium-right uk-margin-top">
  <li><p class="uk-margin-medium-right">ADMIN MENU</p></li>
  </div>
  <li><a class="gold" href="http://127.0.0.1:3000/users/students"><span uk-icon="icon: pencil"></span>Students</a></li>
  <li><a class="gold" href="http://127.0.0.1:3000/users/teachers"><span uk-icon="icon: database"></span>Teachers</a></li>
`;
}