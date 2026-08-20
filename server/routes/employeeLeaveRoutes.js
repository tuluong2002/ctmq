const express = require("express");

const router = express.Router();

const {
  createLeave,
  getLeaves,
  getLeaveById,
  updateLeave,
  deleteLeave,
} = require("../controllers/employeeLeaveAdvanceController");

// =====================================================
// QUẢN LÝ NGHỈ NV/LX
// =====================================================

// Danh sách
router.get("/", getLeaves);

// Thêm
router.post("/", createLeave);

// Chi tiết
router.get("/:id", getLeaveById);

// Sửa
router.put("/:id", updateLeave);

// Xóa
router.delete("/:id", deleteLeave);

module.exports = router;
