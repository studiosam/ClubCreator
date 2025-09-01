const form = document.querySelector("#login");
const error = document.querySelector('#error');
const errorMsg = document.querySelector('#errormessage');
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
    const submitBtn = document.querySelector('#submit');
    const emailInput = document.querySelector('#email');
    const passwordInput = document.querySelector('#password');

    // Reset prior error state
    emailInput.removeAttribute('aria-invalid');
    passwordInput.removeAttribute('aria-invalid');
    error.classList.add('hidden');
    errorMsg.textContent = '';

    // Basic client-side validation
    const email = (form.email.value || '').toLowerCase().trim();
    const password = form.password.value || '';
    if (!email || !password) {
        if (!email) emailInput.setAttribute('aria-invalid', 'true');
        if (!password) passwordInput.setAttribute('aria-invalid', 'true');
        errorMsg.textContent = 'Please enter your email and password.';
        error.classList.remove('hidden');
        if (!email) { emailInput.focus(); } else { passwordInput.focus(); }
        return;
    }

    console.log('login');
    submitBtn.disabled = true;
    const prevLabel = submitBtn.textContent;
    submitBtn.textContent = 'Signing in…';
    form.setAttribute('aria-busy', 'true');

    try {
        const response = await fetch(`http://${serverAddress}:3000/login`, {
            method: "post",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ email, password })
        });
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
            errorMsg.textContent = `${responseStatus.error}` || 'Login failed.';
            error.classList.remove('hidden');
            emailInput.setAttribute('aria-invalid', 'true');
            passwordInput.setAttribute('aria-invalid', 'true');
        }
    } catch (e) {
        console.error(e);
        errorMsg.textContent = 'Unable to sign in right now.';
        error.classList.remove('hidden');
    } finally {
        submitBtn.disabled = false;
        submitBtn.textContent = prevLabel;
        form.removeAttribute('aria-busy');
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

// Remove error state as user types
document.querySelector('#email').addEventListener('input', () => {
    document.querySelector('#email').removeAttribute('aria-invalid');
});
document.querySelector('#password').addEventListener('input', () => {
    document.querySelector('#password').removeAttribute('aria-invalid');
});
