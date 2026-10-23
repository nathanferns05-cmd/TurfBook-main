/** Strips spaces, dashes and a +91 / 91 / 0 prefix, leaving the 10-digit mobile number. */
export function normalizeIndianPhone(phone: string) {
  const digits = phone.replace(/[\s\-()]/g, "").replace(/^(\+91|91|0)(?=\d{10}$)/, "");
  return digits;
}

/** Indian mobile numbers are 10 digits starting with 6, 7, 8 or 9. */
export function isIndianPhone(phone: string) {
  return /^[6-9]\d{9}$/.test(normalizeIndianPhone(phone));
}

export const PHONE_ERROR = "Enter a valid 10-digit Indian mobile number (starting with 6, 7, 8 or 9).";
