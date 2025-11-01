import dayjs from "dayjs";
import customParseFormat from "dayjs/plugin/customParseFormat";

dayjs.extend(customParseFormat);

/**
 * Validation utilities for user input
 */

/**
 * Validate phone number format (+998XXXXXXXXX)
 */
export function validatePhone(phone: string): {
  valid: boolean;
  error?: string;
} {
  const phoneRegex = /^\+998\d{9}$/;

  if (!phoneRegex.test(phone)) {
    return {
      valid: false,
      error: "Phone number must be in format +998XXXXXXXXX",
    };
  }

  return { valid: true };
}

/**
 * Validate date format (DD.MM.YYYY) and ensure it's in the past
 */
export function validateBirthDate(dateString: string): {
  valid: boolean;
  error?: string;
  date?: Date;
} {
  const parsed = dayjs(dateString, "DD.MM.YYYY", true);

  if (!parsed.isValid()) {
    return {
      valid: false,
      error: "Date must be in format DD.MM.YYYY",
    };
  }

  if (parsed.isAfter(dayjs())) {
    return {
      valid: false,
      error: "Birth date must be in the past",
    };
  }

  // Check reasonable age range (10-120 years old)
  const yearsAgo = dayjs().diff(parsed, "year");
  if (yearsAgo < 10 || yearsAgo > 120) {
    return {
      valid: false,
      error: "Please enter a valid birth date",
    };
  }

  return {
    valid: true,
    date: parsed.toDate(),
  };
}

/**
 * Validate full name (at least 2 words, minimum 3 characters each)
 */
export function validateFullName(name: string): {
  valid: boolean;
  error?: string;
} {
  const trimmed = name.trim();

  if (trimmed.length < 6) {
    return {
      valid: false,
      error: "Full name is too short",
    };
  }

  const words = trimmed.split(/\s+/);
  if (words.length < 2) {
    return {
      valid: false,
      error: "Please enter your full name (first and last name)",
    };
  }

  return { valid: true };
}

/**
 * Validate position/title (minimum 2 characters)
 */
export function validatePosition(position: string): {
  valid: boolean;
  error?: string;
} {
  const trimmed = position.trim();

  if (trimmed.length < 2) {
    return {
      valid: false,
      error: "Position is too short",
    };
  }

  return { valid: true };
}

/**
 * Validate organization address (minimum 5 characters)
 */
export function validateAddress(address: string): {
  valid: boolean;
  error?: string;
} {
  const trimmed = address.trim();

  if (trimmed.length < 5) {
    return {
      valid: false,
      error: "Address is too short",
    };
  }

  return { valid: true };
}

/**
 * Validate MFO code format (5-6 alphanumeric characters)
 */
export function validateMFOFormat(mfo: string): {
  valid: boolean;
  error?: string;
} {
  const mfoRegex = /^[0-9A-Za-z]{5,6}$/;

  if (!mfoRegex.test(mfo)) {
    return {
      valid: false,
      error: "MFO code must be 5-6 alphanumeric characters",
    };
  }

  return { valid: true };
}

/**
 * Convert date from DD.MM.YYYY to YYYY-MM-DD format for database
 */
export function convertDateForDatabase(dateString: string): string {
  const parsed = dayjs(dateString, "DD.MM.YYYY", true);
  return parsed.format("YYYY-MM-DD");
}
