node_xj = require("xls-to-json");
const db = require("./database.js")
const bcrypt = require("bcrypt")
let allStudents = [];

function formatDOBToMMDDYYYY(dob) {
    if (!dob) return "";
    const s = dob.toString().trim();
    const m = s.match(/(\d{1,2})\D(\d{1,2})\D(\d{2,4})/);
    if (!m) return s.replace(/\D/g, "");
    let month = m[1].padStart(2, "0");
    let day = m[2].padStart(2, "0");
    let year = m[3];
    if (year.length === 2) {
        year = parseInt(year, 10) >= 70 ? `19${year}` : `20${year}`;
    } else {
        year = year.padStart(4, "0");
    }
    return `${month}${day}${year}`;
}

async function parseXls() {
    await node_xj(
        {
            input: "file.xls", // input xls
            output: null, // output json
            // specific sheetname
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
    const candidates = allStudents.filter((s) => s.First_Name);
    const prepared = await Promise.all(
        candidates.map(async (student) => {
            const firstName = student.First_Name;
            const lastName = student.Last_Name;
            const email = (student.Student_Email_DONOTUSE || "").toString().toLowerCase();
            const grade = student.Grade_Level;
            const passwordDate = formatDOBToMMDDYYYY(student.DOB);
            const firstThree = firstName.replace("'", "").substring(0, 3).toLowerCase();
            const passwordPlain = passwordDate + firstThree;
            const password = await encryptPassword(passwordPlain);
            return { firstName, lastName, email, grade, password };
        })
    );
    const result = await db.addStudentsBulk(prepared);
    console.log(`Imported: ${result.imported}, Skipped: ${result.skipped}`);
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
