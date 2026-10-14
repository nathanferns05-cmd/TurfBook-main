export const PASSWORD_RULES = [
  { id: "length", label: "At least 8 characters", test: (p: string) => p.length >= 8 },
  { id: "upper", label: "One uppercase letter (A-Z)", test: (p: string) => /[A-Z]/.test(p) },
  { id: "lower", label: "One lowercase letter (a-z)", test: (p: string) => /[a-z]/.test(p) },
  { id: "digit", label: "One number (0-9)", test: (p: string) => /[0-9]/.test(p) },
  { id: "symbol", label: "One special character (!@#$%...)", test: (p: string) => /[^A-Za-z0-9]/.test(p) },
];

export function isStrongPassword(password: string) {
  return PASSWORD_RULES.every((rule) => rule.test(password));
}

export const PASSWORD_ERROR =
  "Password must be 8+ characters with uppercase, lowercase, a number and a special character.";