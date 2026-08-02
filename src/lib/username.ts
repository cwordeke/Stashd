const USERNAME_REGEX = /^[a-zA-Z0-9_]+$/;
export const USERNAME_MIN_LEN = 3;
export const USERNAME_MAX_LEN = 24;

export function validateUsername(username: string): string | null {
  const trimmed = username.trim();
  if (
    trimmed.length < USERNAME_MIN_LEN ||
    trimmed.length > USERNAME_MAX_LEN
  ) {
    return `Username must be ${USERNAME_MIN_LEN}–${USERNAME_MAX_LEN} characters`;
  }
  if (!USERNAME_REGEX.test(trimmed)) {
    return "Username can only contain letters, numbers, and underscores";
  }
  return null;
}

export function normalizeUsername(username: string): string {
  return username.trim().toLowerCase();
}
