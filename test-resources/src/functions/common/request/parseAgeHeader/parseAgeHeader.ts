export function parseAgeHeader(ageHeader: string | undefined): number {
  const age = Number(ageHeader);

  if (Number.isNaN(age) || !Number.isInteger(age) || age < 0) {
    return 0;
  } else {
    return age;
  }
}
