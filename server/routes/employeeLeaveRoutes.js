const express = require("express");

const router = express.Router();

const authMiddleware = require("../middleware/authMiddleware");

const {
  createLeave,
  getLeaves,
  getLeaveById,
  updateLeave,
  deleteLeave,
  getLeaveHistory,
} = require("../controllers/employeeLeaveAdvanceController");

// =====================================================
// QUẢN LÝ NGHỈ NV/LX
// =====================================================

router.get("/", getLeaves);

router.post("/", authMiddleware(), createLeave);

router.get("/:id", getLeaveById);

router.put("/:id", authMiddleware(), updateLeave);

router.delete("/:id", deleteLeave);

router.get("/:id/history", getLeaveHistory);

module.exports = router;