function classifyDate(dateObj) {
  const now = new Date();

  // One year ago from now
  const oneYearAgo = new Date(now);
  oneYearAgo.setFullYear(now.getFullYear() - 1);

  // One year ahead from now
  const oneYearFromNow = new Date(now);
  oneYearFromNow.setFullYear(now.getFullYear() + 1);

  if (dateObj <= now && dateObj > oneYearAgo) {
    return "past"; // within last year or today
  } else if (dateObj <= oneYearAgo) {
    return "ancient"; // more than a year ago
  } else if (dateObj > now && dateObj <= oneYearFromNow) {
    return "future"; // within the next year
  } else if (dateObj > oneYearFromNow) {
    return "distant future"; // more than a year from now
  }
}