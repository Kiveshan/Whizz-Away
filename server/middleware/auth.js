import jwt from "jsonwebtoken"
import { secretKey } from "../config/secrets.js"

const verifyToken = (req, res, next) => {
  const authHeader = req.headers.authorization
  const publicEndpoints = [
    "/api/clients",
    "/api/shipment-types",
    "/api/check-auth",
    "/test-connection",
    "/check-email",
    "/api/instructions",
    "/api/client-instruction-stats",
  ]

  const isPublicEndpoint =
    publicEndpoints.some((endpoint) => req.url === endpoint || req.url.startsWith(`${endpoint}?`)) ||
    req.url.match(/^\/api\/instruction\/\d+$/) ||
    req.url.match(/^\/api\/containers\/\d+$/)

  if (!authHeader) {
    console.log("No Authorization header for:", req.url)
    if (isPublicEndpoint) {
      console.log("Allowing unauthenticated access to public endpoint:", req.url)
      req.user = null
      return next()
    }

    if (
      (req.url === "/api/client-instruction-stats" ||
        req.url.startsWith("/api/instructions") ||
        req.url.match(/^\/api\/instruction\/\d+$/) ||
        req.url.match(/^\/api\/containers\/\d+$/)) &&
      process.env.NODE_ENV !== "production"
    ) {
      console.log("DEV MODE: Allowing unauthenticated access to:", req.url)
      req.user = {
        name: "Development",
        surname: "User",
        roleid: 1,
        userid: 0,
        email: "dev@example.com",
      }
      return next()
    }

    if (req.url === "/api/client-instruction-stats" && process.env.NODE_ENV !== "production") {
      console.log("DEV MODE: Allowing unauthenticated access to:", req.url)
      req.user = {
        name: "Development",
        surname: "User",
        roleid: 1,
        userid: 0,
        email: "dev@example.com",
      }
      return next()
    }

    if (req.query.token) {
      req.headers.authorization = `Bearer ${req.query.token}`
    } else {
      return res.status(401).json({
        error: "Authentication required",
        message: "No token provided",
        code: "NO_TOKEN",
      })
    }
  }

  if (req.headers.authorization) {
    const token = req.headers.authorization.split(" ")[1]
    if (!token) {
      console.log("No token provided")
      return res.status(401).json({
        error: "Authentication required",
        message: "No token provided",
        code: "NO_TOKEN",
      })
    }

    try {
      const decoded = jwt.verify(token, secretKey)
      console.log("Token verified for user:", decoded.name, decoded.email)
      req.user = decoded
      next()
    } catch (err) {
      console.error("Token verification failed:", err)

      if (process.env.NODE_ENV !== "production" && isPublicEndpoint) {
        console.log("DEV MODE: Allowing access with invalid token for public endpoint")
        req.user = null
        return next()
      }

      // Handle specific JWT errors
      if (err.name === "TokenExpiredError") {
        console.log("Token has expired")
        return res.status(401).json({
          error: "Token expired",
          message: "Your session has expired. Please log in again.",
          code: "TOKEN_EXPIRED",
        })
      } else if (err.name === "JsonWebTokenError") {
        console.log("Invalid token")
        return res.status(401).json({
          error: "Invalid token",
          message: "Invalid authentication token. Please log in again.",
          code: "INVALID_TOKEN",
        })
      } else {
        console.log("Token verification failed")
        return res.status(401).json({
          error: "Authentication failed",
          message: "Failed to authenticate token. Please log in again.",
          code: "AUTH_FAILED",
        })
      }
    }
  }
}

const verifyAdminAccess = (req, res, next) => {
  console.log("Verifying admin access with token...")
  if (!req.user) {
    console.log("No user data in request")
    return res.status(401).json({
      error: "Authentication required",
      message: "You must be logged in to access this resource",
      code: "NO_USER",
    })
  }

  const ADMIN_ROLE_ID = 7
  console.log(`User has roleid ${req.user.roleid}`)
  if (req.user.roleid !== ADMIN_ROLE_ID) {
    console.log(`User has roleid ${req.user.roleid}, which is not admin`)
    return res.status(403).json({
      error: "Unauthorized",
      message: "You do not have permission to access this resource",
      code: "INSUFFICIENT_PERMISSIONS",
    })
  }

  console.log("Admin access verified")
  next()
}

export { verifyToken, verifyAdminAccess }
