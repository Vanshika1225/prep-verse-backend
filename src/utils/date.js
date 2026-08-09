export const getDayKey = (date = new Date(), timeZone = "Asia/Kolkata") => {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(date);
};
