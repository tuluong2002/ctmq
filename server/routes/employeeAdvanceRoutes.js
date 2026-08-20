const express = require("express");

const router = express.Router();

const {
  createAdvance,
  getAdvances,
  getAdvanceById,
  updateAdvance,
  deleteAdvance,
} = require("../controllers/employeeLeaveAdvanceController");

// =====================================================
// QUẢN LÝ ỨNG TIỀN
// =====================================================

// Danh sách
router.get("/", getAdvances);

// Thêm
router.post("/", createAdvance);

// Chi tiết
router.get("/:id", getAdvanceById);

// Sửa
router.put("/:id", updateAdvance);

// Xóa
router.delete("/:id", deleteAdvance);

module.exports = router;
