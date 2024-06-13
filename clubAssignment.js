const db = require("./database.js");
const fetch = require("node-fetch");

//get object of all user ids and preference arrays
async function getStudents() {
    const response = await fetch('http://127.0.0.1:3000/getAllStudents')
    const users = await response.json();
    return users
}

//get object of all user ids and preference arrays of students without clubs


//loop through all students' first choices and apply sorting algorithm
async function choiceLoop(thisStudent) {
    //if random student
    if (thisStudent.clubPreferences) {
        for (let choiceNumber = 0; choiceNumber < thisStudent.clubPreferences.split(',').length; choiceNumber++) {
            //if reversingArray
            // thisStudent = reverseArray function
            const thisStudentChoice = await getChoice(thisStudent, choiceNumber);

            const choiceClubObject = await getClubById(thisStudentChoice);


            //check grade level slots available for student's choice
            const studentGrade = thisStudent.grade;
            // console.log(studentGrade);
            const gradeKey = `minSlots${studentGrade}`;
            const gradeSlotsAvailable = choiceClubObject[gradeKey];
            // console.log(gradeSlotsAvailable)
            if (gradeSlotsAvailable > 0 && thisStudent.clubId === null) {
                //assign clubId to student
                // console.log('GRADE SLOTS ARE AVALLL?')
                await db.assignClub(thisStudent, choiceClubObject.clubId);
                //recalculate minSlots per grade level
                await db.updateClubValue(choiceClubObject.clubId, gradeKey, gradeSlotsAvailable - 1)
                await db.updateClubValue(choiceClubObject.clubId, "maxSlots", choiceClubObject.maxSlots - 1)
                return true
            } else {
                //add student Id to the queue array
                // console.log('No Slots Bitch')
                console.log('No Slots Available')
            }
        }
    }
}

//get club object for student's choice
async function getClubById(id) {
    // console.log('Get Club By Id', id)
    const response = await fetch(`http://127.0.0.1:3000/getClubById?club=${id}`);
    const club = await response.json();
    return club;
}

//get the choice of the random student
async function getChoice(student, ordinant) {

    // console.log(student.clubPreferences)
    if (student.clubPreferences) {

        const choice = student.clubPreferences.split(",")[ordinant];
        console.log(`${student.firstName} ${student.lastName} has a choice of club ${choice}`)
        return choice;
    }
}

//select student at random
async function getRandomStudentOrder() { // **NEED TO CHANGE THIS TO FIND A RANDOM STUDENT WHO DOES NOT ALREADY HAVE A CLUBID **
    const students = await getStudents();
    const studentsWithoutOrder = students.filter((student) => student.clubId === null)
    if (studentsWithoutOrder.length > 0) {
        const randomStudentOrder = [];
        do {
            const rand = Math.floor(Math.random() * studentsWithoutOrder.length);
            const randomStudent = studentsWithoutOrder.splice(rand, 1);
            randomStudentOrder.push(randomStudent);
        } while (studentsWithoutOrder.length > 0)
        return randomStudentOrder
    } else {

        return 'No Students Without Clubs'
    }
}

async function choiceRound(studentOrder) {
    for (let i = 0; i < studentOrder.length; i++) {
        console.log(studentOrder[i][0].clubId)
        if (studentOrder[i][0].clubId !== null) {
            return 'Already Has Club'
        } else {
            const choice = await choiceLoop(studentOrder[i][0]);
            // console.log('Choice', choice);
        }
    }
}

async function main() {
    const studentOrder = await getRandomStudentOrder();
    if (studentOrder === 'No Students Without Clubs') {
        console.log('No Students Without Clubs')
        return 'No Students Without Clubs'
    }

    await choiceRound(studentOrder);

}

main()