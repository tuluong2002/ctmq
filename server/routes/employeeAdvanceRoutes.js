const express = require("express");

const router = express.Router();

const authMiddleware = require("../middleware/authMiddleware");

const {
  createAdvance,
  getAdvances,
  getAdvanceById,
  updateAdvance,
  deleteAdvance,
  getAdvanceHistory,
} = require("../controllers/employeeLeaveAdvanceController");

// =====================================================
// QUẢN LÝ ỨNG TIỀN
// =====================================================

router.get("/", getAdvances);

router.post("/", authMiddleware(), createAdvance);

router.get("/:id", getAdvanceById);

router.put("/:id", authMiddleware(), updateAdvance);

router.delete("/:id", deleteAdvance);

router.get("/:id/history", getAdvanceHistory);

module.exports = router;