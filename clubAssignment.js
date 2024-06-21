const fetch = require("node-fetch");
const { updateClubValue, assignClub, getTeachersOrStudentsInClub } = require("./database.js")

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
            const thisStudentChoice = await getChoice(thisStudent, choiceNumber);
            // console.log(`This student Choice = ${thisStudentChoice}`)
            const choiceClubObject = await getClubById(thisStudentChoice);
            // console.log(`Choice Club Object = ${choiceClubObject}`)
            const clubRoster = await getTeachersOrStudentsInClub(choiceClubObject.clubId, thisStudent.isTeacher);
            // console.log(`Choice Club Roster = ${clubRoster}`)
            const studentGrade = thisStudent.grade;
            // console.log(`Student Grade = ${studentGrade}`)
            const gradeKey = `minSlots${studentGrade}`;
            // console.log(`Grade Key = ${gradeKey}`)
            const gradeSlotsAvailable = choiceClubObject[gradeKey];
            // console.log(`Slots available in this club for that grade = ${gradeSlotsAvailable}`)
            const studentsInSameGrade = clubRoster.filter((student) => student.grade === thisStudent.grade).length;
            // console.log(`Students in same grade in this club = ${studentsInSameGrade}`)
            const maxSlotsAvailable = choiceClubObject[`maxSlots`];
            // console.log(choiceClubObject);
            const studentRoster = await getTeachersOrStudentsInClub(choiceClubObject.clubId, thisStudent.isTeacher);
            const studentsInClub = studentRoster.length;
            const allMinSlotsFilled = (choiceClubObject.minSlots9 == 0 && choiceClubObject.minSlots10 == 0 && choiceClubObject.minSlots11 == 0 && choiceClubObject.minSlots12 == 0)
            // ** CHECK IF ALL GRADE SLOTS ARE SATISFIED AND IF SO THEN LET THEM IN IF THERE ARE SLOTS ******
            // console.log(gradeSlotsAvailable)
            if ((studentsInSameGrade < gradeSlotsAvailable || allMinSlotsFilled) && maxSlotsAvailable - studentsInClub > 0 && thisStudent.clubId === null) {
                await assignClub(thisStudent, choiceClubObject.clubId);
                //recalculate minSlots per grade level
                return true
            } else {
                //add student Id to the queue array
                // console.log('No Slots Bitch')
                console.log('No Slots Available')
            }
        }
    }
}

//loop through all students' first choices and apply sorting algorithm
async function choiceLoopNoGrade(thisStudent) {
    //if random student
    if (thisStudent.clubPreferences) {
        for (let choiceNumber = 0; choiceNumber < thisStudent.clubPreferences.split(',').length; choiceNumber++) {
            const thisStudentChoice = await getChoice(thisStudent, choiceNumber);
            const choiceClubObject = await getClubById(thisStudentChoice);
            const maxSlotsAvailable = choiceClubObject[`maxSlots`];
            // console.log(choiceClubObject);
            const studentRoster = await getTeachersOrStudentsInClub(choiceClubObject.clubId, thisStudent.isTeacher);
            const studentsInClub = studentRoster.length;
            // console.log(gradeSlotsAvailable)
            if (studentsInClub < maxSlotsAvailable && thisStudent.clubId === null) {
                await assignClub(thisStudent, choiceClubObject.clubId);
                return true
            } else {
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

        if (studentOrder[i][0].clubId !== null) {
            return 'Already Has Club'
        } else {
            const choice = await choiceLoop(studentOrder[i][0]);
            // console.log('Choice', choice);
        }
    }
}

async function choiceRoundNoGrade(studentOrder) {
    for (let i = 0; i < studentOrder.length; i++) {

        if (studentOrder[i][0].clubId !== null) {
            return 'Already Has Club'
        } else {
            const choice = await choiceLoopNoGrade(studentOrder[i][0]);
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
    await choiceRoundNoGrade(studentOrder);
    return true
}

module.exports = {
    main
}