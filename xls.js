node_xj = require("xls-to-json");
const db = require("./database.js")
const bcrypt = require("bcrypt")
let allStudents = [];


async function parseXls() {
    await node_xj(
        {
            input: "file.xls", // input xls
            output: null, // output json
            sheet: "sheet", // specific sheetname
            rowsToSkip: 0, // number of rows to skip at the top of the sheet; defaults to 0
            allowEmptyKey: false, // avoids empty keys in the output, example: {"": "something"}; default: true
        },
        async function (err, result) {
            if (err) {
                console.error(err);
            } else {
                allStudents = result
                addStudents(allStudents);
            }
        }
    );

}


async function addStudents(allStudents) {
    console.log(allStudents);
    allStudents.forEach(async (student) => {
        if (student.firstName) {
            const passwordDate = student.DOB.split("/").join("");
            const firstThree = student.firstName.replace("'", "").substring(0, 3).toLowerCase();
            const password = passwordDate + firstThree;
            student.password = await encryptPassword(password);
            student.isTeacher = false
            await db.addUser(student)
            console.log(`Student added: ${student.firstName}`)
        }
    })
}

async function encryptPassword(password) {
    try {
        // Generate a salt
        const salt = await bcrypt.genSalt(10);

        // Hash the password
        const hashedPassword = await bcrypt.hash(password, salt);

        // Return the hashed password
        return hashedPassword;
    } catch (error) {
        console.error("Error encrypting password:", error);
    }
}

parseXls();