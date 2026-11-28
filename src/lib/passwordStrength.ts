/** 0-5: length plus character variety. Drives the five stars that light up under a new password. */
export function strengthOf(password: string) {
  let score = 0
  if (password.length >= 6) score += 1
  if (password.length >= 10) score += 1
  if (/[a-z]/.test(password) && /[A-Z]/.test(password)) score += 1
  if (/\d/.test(password)) score += 1
  if (/[^A-Za-z0-9]/.test(password)) score += 1
  return score
}

/** "lu.khach@journie.vn" becomes "l•••h@journie.vn", enough to recognise without showing it whole. */
export function maskEmail(email: string) {
  const [name, domain] = email.split('@')
  if (!domain) return email
  return `${name.slice(0, 1)}${'•'.repeat(Math.max(1, Math.min(4, name.length - 2)))}${name.length > 1 ? name.slice(-1) : ''}@${domain}`
}
