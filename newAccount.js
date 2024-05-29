const form = document.querySelector("#createAccount");

form.addEventListener("submit", (event) => {
    event.preventDefault();
    createAccount();
});

async function createAccount() {
    const userEmail = form.email.value;
    const formData = new FormData(form);
    formData.set("username", userEmail.toLowerCase().trim());
    const jsonData = new URLSearchParams(formData);
    console.log(jsonData);
    const response = await fetch("http://127.0.0.1:3000/addAccount",
        {
            method: "POST", headers: { "Content-Type": "application/x-www-form-urlencoded" },
            body: jsonData
        });
    const responseStatus = await response.json();
    console.log(responseStatus.body);
    if (responseStatus.body === "true") {
        const element = document.querySelector("#success");
        element.innerHTML = `<p> ${responseStatus.user.email} 
        Account created successfully.
        </p>
        <a href="./index.html"><button>Click here to log in</button></a>`
        form.remove();
    } else {
        console.log("failed login"); // handle failed login on screen
    }
} 