import express from "express";
const router = express.Router();
import {
  getUsers,
  pingAdmin,
  updateUser,
  getDashboardStats,
  getConfig,
  updateConfig,
  getSystemLogs,
} from "../controllers/adminController.js";
import { authorizeRoles, verifyToken } from "../middlewares/authMiddleware.js";

router.use(verifyToken, authorizeRoles("ADMIN"));
//dashboard
router.get("/dashboard", getDashboardStats);
//user management
router.get("/ping", pingAdmin);
router.get("/users", getUsers);
router.patch("/users/:id", updateUser);
//system configuration
router.get("/system-config", getConfig);
router.put("/system-config", updateConfig);
//system diary
router.get("/logs", getSystemLogs)
export default router;
