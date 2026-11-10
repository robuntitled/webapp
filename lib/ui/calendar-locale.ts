/** Italian short month labels for Calendar dropdowns (it-IT). */
export function formatCalendarMonthDropdownIt(date: Date): string {
  return date
    .toLocaleString('it-IT', { month: 'short' })
    .replace(/\.$/, '')
    .trim()
    .toLowerCase();
}
