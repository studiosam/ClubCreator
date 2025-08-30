const form = document.querySelector("#login");
const error = document.querySelector('#error');
const serverStatus = document.querySelector('#server-status');
checkServerStatus()

async function checkServerStatus() {
    try {
        let status = await fetch(`http://${serverAddress}:3000/`)
        if (status.ok) {

            console.log('Sever Online')
        }
    } catch (e) {
        console.log('Server Offline')
        document.querySelector('#password').disabled = true
        document.querySelector('#email').disabled = true
        serverStatus.innerHTML = `<h1 class="server-status">Server Offline</h1>
            <p>Please Contact An Adminstrator</p>`
    }

}

form.addEventListener("submit", (event) => {
    event.preventDefault();
    login();
})

async function login() {
    console.log('login');
    document.querySelector('#submit').disabled = true
    const email = form.email.value.toLowerCase().trim() || "";
    const password = form.password.value || "";
    const response = await fetch(`http://${serverAddress}:3000/login`, { method: "post", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ email: email, password: password }) });
    const responseStatus = await response.json();
    console.log(responseStatus);
    if (responseStatus.body) {
        const user = responseStatus.userObject;
        setUser(user);
        if (user.isTeacher) {
            window.location.href = `./home-teacher.html`;
        } else {
            window.location.href = `./home-student.html`;
        }
    } else {
        document.querySelector('#submit').disabled = false
        document.querySelector('#errormessage').innerHTML = `${responseStatus.error}`;
        error.style.display = "block"
        console.log("failed login"); // handle failed login on screen
    }
}

function logout() {
    localStorage.removeItem("user");
    localStorage.removeItem("user_timestamp");
    console.log("User has been cleared from local storage");
    window.location.href = "./index.html";
}

function setUser(userInfo) {
    const user = JSON.stringify(userInfo);
    localStorage.setItem("user", user);
    // Record login timestamp for session expiry (24h)
    localStorage.setItem("user_timestamp", String(Date.now()));
}

async function getUser() {
    const userRaw = localStorage.getItem("user");
    const tsRaw = localStorage.getItem("user_timestamp");
    const ts = tsRaw ? parseInt(tsRaw, 10) : 0;
    const TTL = 24 * 60 * 60 * 1000;

    if (userRaw && ts && Date.now() - ts <= TTL) {
        const user = JSON.parse(userRaw);
        console.log(`${user}`);
        if (user.isTeacher) {
            window.location.href = "./home-teacher.html";
        } else {
            window.location.href = "./home-student.html";
        }
    } else {
        // Clear any stale session data
        localStorage.removeItem("user");
        localStorage.removeItem("user_timestamp");
        console.log(`Nobody is logged in`);
    }
}
getUser()
