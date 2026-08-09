const express = require("express");

const router = express.Router();

const {
  createScheduleError,
  getScheduleErrors,
  getScheduleErrorById,
  updateScheduleError,
  deleteScheduleError,
  checkOriginalTrip
} = require("../controllers/scheduleErrorController");

// =====================================================
// CHUYẾN SAI SÓT
// =====================================================

// Thêm
router.post("/", createScheduleError);

// Lấy danh sách
router.get("/", getScheduleErrors);

//Kiểm tra chuyến gốc
router.get("/check-trip/:maChuyen", checkOriginalTrip );

// Lấy chi tiết
router.get("/:id", getScheduleErrorById);

// Sửa
router.put("/:id", updateScheduleError);

// Xóa
router.delete("/:id", deleteScheduleError);

module.exports = router;