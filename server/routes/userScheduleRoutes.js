const express = require("express");
const router = express.Router();

const userScheduleController = require(
  "../controllers/userScheduleController"
);

// Tạo lịch trình
router.post("/", userScheduleController.createSchedule);

// Lấy theo ngày đi
router.get("/", userScheduleController.getSchedulesByDate);

// Lấy theo khoảng ngày đi
router.get("/range", userScheduleController.getSchedulesByRange);

// Lấy theo ngày tạo
router.get(
  "/by-created-date",
  userScheduleController.getSchedulesByCreatedDate
);

// Lấy theo khoảng ngày tạo
router.get(
  "/by-created-range",
  userScheduleController.getSchedulesByCreatedRange
);

// Xóa theo ngày đi
router.delete(
  "/",
  userScheduleController.deleteSchedulesByDate
);

// Xóa theo khoảng ngày đi
router.delete(
  "/range",
  userScheduleController.deleteSchedulesByRange
);

// Export theo ngày đi
router.get(
  "/export",
  userScheduleController.exportSchedule
);

// Export theo khoảng ngày đi
router.get(
  "/export-range",
  userScheduleController.exportScheduleRange
);

// Export theo ngày tạo
router.get(
  "/export-by-created-date",
  userScheduleController.exportScheduleByCreatedDate
);

// Export theo khoảng ngày tạo
router.get(
  "/export-by-created-range",
  userScheduleController.exportScheduleByCreatedRange
);

module.exports = router;