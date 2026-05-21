export const isLiteUser = () => {
  try {
    const user = JSON.parse(localStorage.getItem("user") || "{}")
    return user.subscription_tier === "lite"
  } catch {
    return false
  }
}
