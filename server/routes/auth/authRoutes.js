import express from "express";
import {
  login,
  logout,
  getUserInfo,
  getUserRole,
  checkEmail,
  register,
} from "../../controllers/auth/authController.js";
import { verifyToken } from "../../middleware/auth.js";

const router = express.Router();

router.post("/login", login);
router.post("/logout", logout);
router.get("/user-info", verifyToken, getUserInfo);
router.get("/api/user-role", verifyToken, getUserRole);
router.get("/check-email", checkEmail);
router.post("/register", register);

export default router;
