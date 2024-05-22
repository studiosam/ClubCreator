class Teacher {
  constructor(firstName, lastName, club, room, password, isTeacher) {
    this.firstName = firstName;
    this.lastName = lastName;
    this.club = club;
    this.room = room;
    this.username = firstName.toLowerCase().trim() + lastName.toLowerCase().trim();
    this.password = password;
    this.isTeacher = isTeacher;
  }
}
