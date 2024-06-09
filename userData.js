const userType = JSON.parse(localStorage.getItem("user"));
if (user) {
  if (user.isAdmin) {
    document.querySelector("#user-name").classList.add("gold");
    document.querySelector(
      "#user-name"
    ).innerHTML += `<div><a href="home-admin.html">ADMIN</a></div>`;
  }
}
