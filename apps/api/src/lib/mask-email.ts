/** `h***@example.com`: enough to tell people apart, not to contact them. */
export const maskEmail = (email: string): string => {
  const at = email.lastIndexOf('@');
  if (at < 1) return email === '' ? '' : '***';
  return `${email.slice(0, 1)}***${email.slice(at)}`;
};
