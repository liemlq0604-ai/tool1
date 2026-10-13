const formatter = new Intl.DateTimeFormat('en-GB', {
  timeZone: 'Asia/Ho_Chi_Minh', day: 'numeric', month: 'long', year: 'numeric',
});

export function exportDate(now = new Date()) {
  const parts = Object.fromEntries(formatter.formatToParts(now).map(part => [part.type, part.value]));
  return `${parts.day}-${parts.month.toLowerCase()}-${parts.year}`;
}
