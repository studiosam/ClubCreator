class Club {
  constructor(
    clubName,
    clubDescription,
    teacher1,
    teacher2,
    minSlots12,
    minSlots11,
    minSlots10,
    minSlots9,
    maxSlots
  ) {
    this.clubName = clubName;
    this.clubDescription = clubDescription;
    this.teachers = [teacher1];
    if (teacher2) {
      this.teachers.push(teacher2);
    }
    this.minSlots = [minSlots12, minSlots11, minSlots10, minSlots9];
    this.maxSlots = maxSlots;
    this.location = null;
  }
}
