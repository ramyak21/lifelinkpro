// Form validation. A rule is [isValid(value, allValues), message]; the first
// failing rule per field wins, and fields are checked in the order given.
import { isPastDate } from "./format";

// Same rule as the API and the browser's <input type="email">: text@text, no spaces
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+$/;

export const isBlank = (value) =>
  value === undefined || value === null || String(value).trim() === "";

export function validate(values, rules) {
  const errors = {};
  for (const [field, fieldRules] of Object.entries(rules)) {
    for (const [isValid, message] of fieldRules) {
      if (!isValid(values[field], values)) {
        errors[field] = message;
        break;
      }
    }
  }
  return errors;
}

export const required = (message) => [(value) => !isBlank(value), message];

export const email = (message = "Enter an email address in the format name@example.com.") => [
  (value) => isBlank(value) || EMAIL_PATTERN.test(String(value).trim()),
  message
];

// Digits plus common separators; 7–15 digits covers local and international numbers
export const phone = (message = "Enter a valid phone number, for example 98765 43210.") => [
  (value) => {
    if (isBlank(value)) return true;
    const text = String(value).trim();
    const digits = text.replace(/\D/g, "");
    return /^[0-9+\-\s()]+$/.test(text) && digits.length >= 7 && digits.length <= 15;
  },
  message
];

export const minLength = (length, message) => [
  (value) => isBlank(value) || String(value).length >= length,
  message
];

export const matches = (otherField, message) => [
  (value, values) => value === values[otherField],
  message
];

export const wholeNumberBetween = (min, max, message) => [
  (value) => {
    if (isBlank(value)) return true;
    const number = Number(value);
    return Number.isInteger(number) && number >= min && number <= max;
  },
  message
];

export const notInPast = (message) => [(value) => isBlank(value) || !isPastDate(value), message];
