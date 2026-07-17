// Password validation utility
export function validatePassword(password) {
  // At least 8 characters, one uppercase, one lowercase, one special character
  const regex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\W).{8,}$/;
  return regex.test(password);
}
