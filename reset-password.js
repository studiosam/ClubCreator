const form = document.querySelector("#reset");
const urlLink = new URLSearchParams(window.location.search.replace("?", ""));
let token = urlLink.get("token");
const tokenInput = document.querySelector("#token");

// If token present in URL, prefill and lock the input to prevent edits
if (token && tokenInput) {
  tokenInput.value = token;
  tokenInput.readOnly = true;
  tokenInput.setAttribute("aria-readonly", "true");
  tokenInput.title = "Reset code auto-filled from your secure link";
}
const successMessage = document.querySelector("#success");
const successMessageBox = document.querySelector("#successDiv");
const password = document.querySelector("#password");
const confirmPassword = document.querySelector("#confirmPassword");
const resetButton = document.querySelector("#reset-btn");
console.log(token);
form.addEventListener("submit", (event) => {
  event.preventDefault();
  reset();
});

async function reset() {
  const password = form.password.value;
  const formData = new FormData(form);
  // Try to extract a valid token from input or URL.
  const inputRaw = (tokenInput && tokenInput.value) ? tokenInput.value.trim() : "";
  const extractToken = (value) => {
    if (!value) return "";
    try {
      // If a full URL is pasted, parse the token query param
      if (value.includes("token=")) {
        // Try direct URL
        try {
          const u = new URL(value, window.location.origin);
          const t = new URLSearchParams(u.search).get("token");
          if (t) return t.trim();
        } catch (_) {
          // Fallback: parse query string after '?'
          const qIndex = value.indexOf("?");
          if (qIndex !== -1) {
            const qs = value.substring(qIndex + 1);
            const t2 = new URLSearchParams(qs).get("token");
            if (t2) return t2.trim();
          }
        }
      }
    } catch (_) {}
    // Look for a 40-char hex token in the string
    const m = value.match(/[A-Fa-f0-9]{40}/);
    if (m) return m[0];
    return value.trim();
  };
  const effectiveToken = extractToken(inputRaw) || (token ? token.trim() : "");
  if (!effectiveToken) {
    UIkit.notification({
      message: "Reset code required. Paste the code from your email.",
      status: "warning",
      pos: "top-center",
      timeout: 5000,
    });
    return;
  }
  formData.set("token", effectiveToken);
  const jsonData = new URLSearchParams(formData);
  const response = await fetch(
    `http://${serverAddress}:3000/request-password-confirm`,
    {
      method: "post",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: jsonData,
    }
  );
  const responseStatus = await response.json();
  console.log(responseStatus);
  if (response.ok && responseStatus && responseStatus.body === "Success") {
    UIkit.notification({
      message: "Password Reset Successfully!",
      status: "success",
      pos: "top-center",
      timeout: 5000,
    });
    form.innerHTML = `<p class="text-center uk-text-success">Password Successfully Reset!</p><a class="uk-text-large" href="http://${serverAddress}/index.html">Return To Login Screen</a>`;
  } else {
    UIkit.notification({
      message: responseStatus && responseStatus.reason ? `Error: ${responseStatus.reason}` : "Error Resetting Password",
      status: "danger",
      pos: "top-center",
      timeout: 5000,
    });
  }
}

async function getUser() {
  const user = JSON.parse(localStorage.getItem("user"));

  if (user) {
    console.log(`${user}`);
    if (user.isTeacher) {
      window.location.href = "./home-teacher.html";
    } else {
      window.location.href = "./home-student.html";
    }
  } else {
    console.log(`Nobody is logged in`);
  }
}

confirmPassword.addEventListener("keyup", () => {
  if (password.value !== confirmPassword.value) {
    resetButton.disabled = true;
    successMessageBox.classList.add("uk-alert-danger");
    successMessageBox.style.display = "block";
    successMessage.innerHTML = "Passwords Do Not Match";
  } else {
    resetButton.disabled = false;
    successMessageBox.style.display = "none";
    successMessage.innerHTML = "";
  }
});
password.addEventListener("keyup", () => {
  if (password.value !== confirmPassword.value) {
    resetButton.disabled = true;
    successMessageBox.classList.add("uk-alert-danger");
    successMessageBox.style.display = "block";
    successMessage.innerHTML = "Passwords Do Not Match";
  } else {
    resetButton.disabled = false;
    successMessageBox.style.display = "none";
    successMessage.innerHTML = "";
  }
});

getUser();
