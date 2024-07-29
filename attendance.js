const form = document.querySelector("form");

form.addEventListener("submit", (e) => {
    e.preventDefault();

    let date = document.querySelector("#date").value;

    getAttendanceFromDate(date);
})

async function getAttendanceFromDate(date) {
    const response = await fetch(`http://${serverAddress}:3000/getAttendanceFromDate`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ date: date })

    });

}

console.log(form);