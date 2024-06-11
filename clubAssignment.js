const db = require("./database.js");

//get object of all user ids and preference arrays
//get arrays of first, second, third, fourth, and fifth choices
//loop through first choices and apply sorting algorithm
//select student at random
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
//all users in club