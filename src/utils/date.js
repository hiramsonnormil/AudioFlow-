export function addMonths(date, months = 1) {
  const initial = date instanceof Date ? new Date(date.getTime()) : new Date(date);
  initial.setMonth(initial.getMonth() + months);
  return initial;
}
