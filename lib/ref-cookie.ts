// Código de indicação salvo pelo RefTracker (cookie rifa_ref)
export function getRefCookie() {
  const match = document.cookie.match(/(?:^|;\s*)rifa_ref=([^;]+)/)
  return match ? decodeURIComponent(match[1]) : null
}
