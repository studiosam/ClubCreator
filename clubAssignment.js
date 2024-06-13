const db = require("./database.js");
const fetch = require("node-fetch");

//get object of all user ids and preference arrays
async function getStudents() {
    const response = await fetch('http://127.0.0.1:3000/getAllStudents')
    const users = await response.json();
    return users
}

//loop through all students' first choices and apply sorting algorithm
async function choiceLoop(choiceNumber) {
    //if random student
    const thisStudent = await getRandomStudent()
    //if reversingArray
    // thisStudent = reverseArray function
    const thisStudentChoice = await getChoice(thisStudent, choiceNumber);

    const choiceClubObject = await getClubById(thisStudentChoice);
    console.log(choiceClubObject);

    //check grade level slots available for student's choice
    const studentGrade = thisStudent.grade;
    console.log(studentGrade);
    const gradeKey = `minSlots${studentGrade}`;
    const gradeSlotsAvailable = choiceClubObject[gradeKey];
    console.log(gradeSlotsAvailable)
    if (gradeSlotsAvailable > 0) {
        //assign clubId to student
        console.log('GRADE SLOTS ARE AVALLL?')
        await db.assignClub(thisStudent, choiceClubObject.clubId);
        //recalculate minSlots per grade level
        await db.updateClubValue(choiceClubObject.clubId, gradeKey, gradeSlotsAvailable - 1)
        await db.updateClubValue(choiceClubObject.clubId, "maxSlots", choiceClubObject.maxSlots - 1)
        //return true
    } else {
        console.log("nevergonnagiveyouupnevergonnaletyoudownnevergonnarunaroudnanddesertyou");
        //check if we need the queue array
        //add student name to the queue array or remove it
    }
}

//get club object for student's choice
async function getClubById(id) {
    const response = await fetch(`http://127.0.0.1:3000/getClubById?club=${id}`);
    const club = await response.json();
    return club;
}

//get the choice of the random student
async function getChoice(student, ordinant) {
    if (student.clubPreferences) {
        const choice = student.clubPreferences.split(",")[ordinant];
        console.log(`${student.firstName} ${student.lastName} has a choice of club ${choice}`)
        return choice;
    }
}

//select student at random
async function getRandomStudent() { // **NEED TO CHANGE THIS TO FIND A RANDOM STUDENT WHO DOES NOT ALREADY HAVE A CLUBID **
    const students = await getStudents();
    const rand = Math.floor(Math.random() * students.length);
    return students[rand];
}

async function main() {
    const choice = await choiceLoop(1);
    console.log(choice);
}

main();

//check student's first choice
//if first choice has an opening for their grade level, assign student to that club and remove them from the object
//if there is no opening, store the id to a queue array
//loop through second choices in reverse order of the queue array
//select student at the end of the queue array
//check student's second choice
//if second choice has an opening for their grade level, assign student to that club and remove them from the object
//remove student from queue array
//loop through third choices and apply sorting algorithm
//select student at random
//check student's third choice
//if third choice has an opening for their grade level, assign student to that club and remove them from the object
//if there is no opening, store the id to a queue array
//loop through fourth choices in reverse order of the queue array
//select student at the end of the queue array
//check student's fourth choice
//if fourth choice has an opening for their grade level, assign student to that club and remove them from the object
//remove student from queue array
//get array of fifth choices
//if fifth choice has an opening for their grade level, assign student to that club and remove them from the object
//i dont know what to do if it doesn't
//all users in club