const form = document.querySelector("#clubCreation");

form.addEventListener("submit", async (event) => {
    event.preventDefault();
    await createClub();
})

async function createClub() {
    console.log("whatever ass i don't know just something you're taking so loooooooooOOOOOOOOOOng dude PLEASE/nI KNEW IT")
    const user = JSON.parse(localStorage.getItem("user"));
    const formData = new FormData(form);
    formData.set("teacherId", user.userId);
    const jsonData = new URLSearchParams(formData);
    const response = await fetch("http://127.0.0.1:3000/addClub", {
        method: "post",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: jsonData
    });
    const responseStatus = await response.json();

}