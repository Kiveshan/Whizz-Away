import express from "express";
import rateLimit from "express-rate-limit";
import {
  login,
  logout,
  getUserInfo,
  getUserRole,
  checkEmail,
  checkCompanyReg,
  register,
} from "../../controllers/auth/authController.js";
import { verifyToken } from "../../middleware/auth.js";

const router = express.Router();

const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: "Too many login attempts. Please try again in 15 minutes.", code: "RATE_LIMITED" },
});

router.post("/login", loginLimiter, login);
router.post("/logout", logout);
router.get("/user-info", verifyToken, getUserInfo);
router.get("/api/user-role", verifyToken, getUserRole);
router.get("/check-email", checkEmail);
router.get("/check-company-reg", checkCompanyReg);
router.post("/register", register);

export default router;
