import dayjs from "dayjs";
import utc from "dayjs/plugin/utc";
import timezone from "dayjs/plugin/timezone";

// Configure dayjs with timezone support
dayjs.extend(utc);
dayjs.extend(timezone);

// Set default timezone to Asia/Tashkent
const TIMEZONE = "Asia/Tashkent";

/**
 * Format date to DD.MM.YYYY in Asia/Tashkent timezone
 */
export function formatDate(date: Date | string): string {
  return dayjs(date).tz(TIMEZONE).format("DD.MM.YYYY");
}

/**
 * Format date to DD.MM.YYYY HH:mm in Asia/Tashkent timezone
 */
export function formatDateTime(date: Date | string): string {
  return dayjs(date).tz(TIMEZONE).format("DD.MM.YYYY HH:mm");
}

/**
 * Get dayjs instance with Asia/Tashkent timezone
 */
export function getDateInTashkent(date?: Date | string) {
  return date ? dayjs(date).tz(TIMEZONE) : dayjs().tz(TIMEZONE);
}

/**
 * Calculate days difference from now
 */
export function getDaysFromNow(date: Date | string): number {
  return dayjs(date).tz(TIMEZONE).diff(dayjs().tz(TIMEZONE), "day");
}

/**
 * Parse date from DD.MM.YYYY format in Asia/Tashkent timezone
 */
export function parseDate(dateString: string) {
  return dayjs(dateString, "DD.MM.YYYY").tz(TIMEZONE);
}
