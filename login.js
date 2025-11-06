const form = document.querySelector("#login");
const error = document.querySelector('#error');
const errorMsg = document.querySelector('#errormessage');
const serverStatus = document.querySelector('#server-status');
const teacherResetLink = document.querySelector('#teacher-reset-link');
let resetBtn = null;
let resetStatus = null;
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
            // Admins without an assigned club go to Admin Home
            try {
                const adminLevel = Number(user && user.isAdmin ? user.isAdmin : 0) || 0;
                const hasClub = !!(user && Number(user.clubId) > 0);
                if (adminLevel > 0 && !hasClub) {
                    window.location.href = `./home-admin.html`;
                } else if (user.isTeacher) {
                    window.location.href = `./home-teacher.html`;
                } else {
                    window.location.href = `./home-student.html`;
                }
            } catch (_) {
                // Fallback to existing behavior
                if (user.isTeacher) {
                    window.location.href = `./home-teacher.html`;
                } else {
                    window.location.href = `./home-student.html`;
                }
            }
        } else {
            const msg = `${responseStatus.error}` || 'Login failed.';
            // If password incorrect, append instructions first, then example
            const isPasswordError = /incorrect/i.test(msg) || /password/i.test(msg);
            const instructions = 'Format: MMDDYYYY + first 3 letters of first name (lowercase).';
            const example = 'Example: John Smith with birthday 5/7/2008 → 05072008joh.';
            errorMsg.innerHTML = isPasswordError
              ? `${msg}<br/><small>${instructions}<br/>${example}</small>`
              : msg;
            // If this is a teacher account, remove the student password hint
            try {
              const isTeacherAccount = !!(responseStatus && (responseStatus.isTeacher === true || responseStatus.isTeacher === 1));
              if (isPasswordError && isTeacherAccount) {
                errorMsg.textContent = msg;
              }
            } catch (_) { /* no-op */ }
            // Toggle teacher reset link visibility based on account role
            try {
              if (teacherResetLink) {
                const isTeacherAccount = !!(responseStatus && (responseStatus.isTeacher === true || responseStatus.isTeacher === 1));
                teacherResetLink.classList.toggle('hidden', !isTeacherAccount);
              }
            } catch (_) { /* no-op */ }
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
    const TTL = 8 * 60 * 60 * 1000;

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
    debounceCheckEmailRole();
});
document.querySelector('#password').addEventListener('input', () => {
    document.querySelector('#password').removeAttribute('aria-invalid');
});

// Password visibility toggle (icon and checkbox)
(function setupPasswordToggle(){
    const pwd = document.querySelector('#password');
    const iconToggle = document.querySelector('#toggle-password');
    const checkbox = document.querySelector('#toggle-password-checkbox');
    const setVisible = (visible) => {
        pwd.type = visible ? 'text' : 'password';
        if (iconToggle) {
            // Keep a consistent icon to ensure UIkit compatibility
            iconToggle.setAttribute('uk-icon', 'icon: eye');
            iconToggle.setAttribute('aria-label', visible ? 'Hide password' : 'Show password');
            iconToggle.setAttribute('title', visible ? 'Hide password' : 'Show password');
        }
        if (checkbox) checkbox.checked = !!visible;
    };
    if (iconToggle) {
        iconToggle.addEventListener('click', (e) => {
            e.preventDefault();
            setVisible(pwd.type === 'password');
            pwd.focus({ preventScroll: true });
        });
    }
    if (checkbox) {
        checkbox.addEventListener('change', (e) => setVisible(e.target.checked));
    }
})();

// Send reset email directly from the login form (teachers only)
async function sendResetEmail() {
    try {
        const email = (document.querySelector('#email').value || '').toLowerCase().trim();
        if (!email) {
            if (window.UIkit && UIkit.notification) UIkit.notification({ message: 'Enter your email first', status: 'warning', pos: 'top-center' });
            return;
        }
        if (!resetBtn) resetBtn = document.getElementById('reset-now');
        if (!resetStatus) resetStatus = document.getElementById('reset-status');
        const prev = resetBtn ? resetBtn.textContent : '';
        if (resetBtn) { resetBtn.disabled = true; resetBtn.textContent = 'Sending...'; }
        const resp = await fetch(`http://${serverAddress}:3000/request-password-reset`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email })
        });
        const json = await resp.json().catch(()=>({}));
        if (json && json.body === 'Success') {
            if (window.UIkit && UIkit.notification) UIkit.notification({ message: 'Reset email sent. Check your inbox (and spam).', status: 'success', pos: 'top-center' });
            if (resetStatus) {
                resetStatus.classList.remove('hidden');
                resetStatus.classList.remove('uk-text-danger');
                resetStatus.classList.add('uk-text-success');
                resetStatus.textContent = 'Password reset email sent. It should arrive within a few minutes. If it does not appear, please check your spam or junk folder.';
            }
        } else if (json && json.body === 'NotTeacher') {
            if (window.UIkit && UIkit.notification) UIkit.notification({ message: 'Password resets are only for teacher accounts.', status: 'warning', pos: 'top-center' });
            if (resetStatus) {
                resetStatus.classList.remove('hidden');
                resetStatus.classList.remove('uk-text-success');
                resetStatus.classList.add('uk-text-danger');
                resetStatus.textContent = 'This email is not associated with a teacher account. Only teachers can reset passwords here.';
            }
        } else {
            if (window.UIkit && UIkit.notification) UIkit.notification({ message: 'Unable to send reset email right now.', status: 'danger', pos: 'top-center' });
            if (resetStatus) {
                resetStatus.classList.remove('hidden');
                resetStatus.classList.remove('uk-text-success');
                resetStatus.classList.add('uk-text-danger');
                resetStatus.textContent = 'We could not send a reset email at this time. Please try again shortly.';
            }
        }
    } catch (e) {
        if (window.UIkit && UIkit.notification) UIkit.notification({ message: 'Unable to send reset email.', status: 'danger', pos: 'top-center' });
        if (resetStatus) {
            resetStatus.classList.remove('hidden');
            resetStatus.classList.remove('uk-text-success');
            resetStatus.classList.add('uk-text-danger');
            resetStatus.textContent = 'We could not send a reset email at this time. Please try again shortly.';
        }
    } finally {
        if (resetBtn) { resetBtn.disabled = false; resetBtn.textContent = 'Reset Password'; }
    }
}

// Hook reset button after DOM is ready
document.addEventListener('DOMContentLoaded', () => {
  resetBtn = document.getElementById('reset-now');
  resetStatus = document.getElementById('reset-status');
  if (resetBtn) resetBtn.addEventListener('click', sendResetEmail);
});

// Debounced email role checker to show reset link for teachers
let _roleTimer = null;
async function debounceCheckEmailRole() {
    if (_roleTimer) clearTimeout(_roleTimer);
    _roleTimer = setTimeout(checkEmailRole, 400);
}
async function checkEmailRole() {
    try {
        if (!teacherResetLink) return;
        const emailValue = (document.querySelector('#email').value || '').toLowerCase().trim();
        if (!emailValue) { teacherResetLink.classList.add('hidden'); return; }
        const resp = await fetch(`http://${serverAddress}:3000/check-reset-email?email=${encodeURIComponent(emailValue)}`);
        const json = await resp.json();
        let show = false;
        if (json && json.body && json.body !== 'User does not exist') {
            const payload = json.body;
            const isTeacher = !!(payload && (payload.isTeacher === 1 || payload.isTeacher === true));
            show = isTeacher === true;
        }
        teacherResetLink.classList.toggle('hidden', !show);
    } catch (_) {
        try { if (teacherResetLink) teacherResetLink.classList.add('hidden'); } catch (__) {}
    }
}
