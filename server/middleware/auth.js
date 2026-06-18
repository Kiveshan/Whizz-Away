import jwt from "jsonwebtoken"
import { secretKey } from "../config/secrets.js"

// Strict JWT verification. Every request reaching this middleware MUST present a
// valid token (Authorization: Bearer <jwt>, or ?token=<jwt> for download links).
// Public/pre-auth endpoints are NOT handled here — they are mounted ahead of the
// global guard in routes/index.js. There is intentionally no NODE_ENV-based bypass.
const verifyToken = (req, res, next) => {
  const authHeader = req.headers.authorization
  const headerToken = authHeader ? authHeader.split(" ")[1] : null
  const token = headerToken || req.query.token

  if (!token) {
    return res.status(401).json({
      error: "Authentication required",
      message: "No token provided",
      code: "NO_TOKEN",
    })
  }

  try {
    const decoded = jwt.verify(token, secretKey)
    req.user = decoded
    return next()
  } catch (err) {
    if (err.name === "TokenExpiredError") {
      return res.status(401).json({
        error: "Token expired",
        message: "Your session has expired. Please log in again.",
        code: "TOKEN_EXPIRED",
      })
    } else if (err.name === "JsonWebTokenError") {
      return res.status(401).json({
        error: "Invalid token",
        message: "Invalid authentication token. Please log in again.",
        code: "INVALID_TOKEN",
      })
    }
    return res.status(401).json({
      error: "Authentication failed",
      message: "Failed to authenticate token. Please log in again.",
      code: "AUTH_FAILED",
    })
  }
}

const verifyAdminAccess = (req, res, next) => {
  if (!req.user) {
    return res.status(401).json({
      error: "Authentication required",
      message: "You must be logged in to access this resource",
      code: "NO_USER",
    })
  }

  const ADMIN_ROLE_ID = 7
  if (req.user.roleid !== ADMIN_ROLE_ID) {
    return res.status(403).json({
      error: "Unauthorized",
      message: "You do not have permission to access this resource",
      code: "INSUFFICIENT_PERMISSIONS",
    })
  }

  return next()
}

export { verifyToken, verifyAdminAccess }
