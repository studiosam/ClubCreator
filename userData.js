// Session management (24h TTL)
const SESSION_TTL_MS = 8 * 60 * 60 * 1000;

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
      avatar.src = `https://ui-avatars.com/api/?name=${user.firstName}+${user.lastName}&background=005DB4&color=fff`;
    });
  }
}
document.querySelector(
  "#user-name"
).innerHTML = `${user.firstName} ${user.lastName}`;

if (user) {
  if (user.isAdmin) {
    buildAdminMenu();
    const level = Number(user.isAdmin || 0) || 0;
    const role = level > 1 ? 'SUPERADMIN' : 'ADMIN';
    document.querySelector("#user-name").classList.add("gold");
    document.querySelector("#user-name").innerHTML += `<div><a href="home-admin.html">${role}</a></div>`;
    document.querySelector("#homepage-link").href = "home-teacher.html";
    // After building admin menu, ensure active state is highlighted
    requestAnimationFrame(() => {
      highlightActiveNav();
      // Reveal super-admin controls if elevated
      revealSuperAdminControls();
      // Reveal admin-only controls across pages
      revealAdminControls();
    });
  } else if (user.isTeacher) {
    document.querySelector(
      "#user-name"
    ).innerHTML += `<div style="text-align:right"class="blue"><span>Teacher</span></div>`;
    document.querySelector("#homepage-link").href = "home-teacher.html";
    // Add a Students link for teachers (view-only)
    try {
      const menu = document.querySelector(".dash-nav");
      if (menu && !menu.querySelector('a[href="/users-students.html"]')) {
        menu.innerHTML += `<li><a href="/users-students.html"><span uk-icon="icon: users"></span>Students</a></li>`;
        // Re-highlight active nav after injection
        requestAnimationFrame(() => highlightActiveNav());
      }
    } catch (_) {}
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
  menu.innerHTML += `<div class= "text-center"><hr class="uk-margin-medium-right uk-margin-top"></div>
  <li><a class="gold" href="home-admin.html"><span uk-icon="icon: settings"></span>Admin Home</a></li>
  <li><a class="gold" href="/users-students.html"><span uk-icon="icon: pencil"></span>Students</a></li>
  <li><a class="gold" href="/users-teachers.html"><span uk-icon="icon: database"></span>Teachers</a></li>
  <li><a class="gold" href="/admin-metrics.html"><span uk-icon="icon: table"></span>Metrics</a></li>
`;
  // Highlight correct item after dynamic menu injection
  highlightActiveNav();
}

// Show buttons/links reserved for elevated admins (isAdmin > 1)
function revealSuperAdminControls() {
  try {
    const level = Number(user && user.isAdmin ? user.isAdmin : 0) || 0; // handles booleans and numbers
    const superOnly = document.querySelectorAll('[data-superonly]');
    superOnly.forEach((el) => {
      if (level > 1) {
        el.classList.remove('hidden');
        el.classList.add('super-visible');
        try { el.style.removeProperty('display'); } catch (_) {}
      } else {
        el.classList.remove('super-visible');
        el.classList.add('hidden');
        try { el.style.display = 'none'; } catch (_) {}
      }
    });
  } catch (_) { /* no-op */ }
}

// Show elements marked admin-only if current user is admin
function revealAdminControls() {
  try {
    const level = Number(user && user.isAdmin ? user.isAdmin : 0) || 0;
    const adminOnly = document.querySelectorAll('[data-adminonly]');
    adminOnly.forEach((el) => {
      if (level > 0) {
        el.classList.add('admin-visible');
        try { el.style.removeProperty('display'); } catch (_) {}
      } else {
        el.classList.remove('admin-visible');
        try { el.style.display = 'none'; } catch (_) {}
      }
    });
  } catch (_) { /* no-op */ }
}

function logout() {
  localStorage.removeItem("user");
  localStorage.removeItem("user_timestamp");
  console.log("User has been cleared from local storage");
  window.location.href = "./index.html";
}

// Highlight the current page in the left nav
function highlightActiveNav() {
  try {
    const currentPath = new URL(window.location.href).pathname;
    const links = document.querySelectorAll('#side-nav .dash-nav a[href]');
    if (!links.length) return;
    links.forEach((link) => {
      const li = link.closest('li');
      if (!li) return;
      const linkPath = new URL(link.getAttribute('href'), window.location.origin).pathname;
      if (linkPath === currentPath) {
        li.classList.add('uk-active');
      } else {
        li.classList.remove('uk-active');
      }
    });
  } catch (_) {
    // no-op
  }
}

// Run once on page load as well
document.addEventListener('DOMContentLoaded', () => {
  highlightActiveNav();
  revealSuperAdminControls();
  revealAdminControls();
});

