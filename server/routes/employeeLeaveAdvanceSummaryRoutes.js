const express = require("express");

const router = express.Router();

const {
  getSummary,
} = require("../controllers/employeeLeaveAdvanceController");

// =====================================================
// TỔNG HỢP NGHỈ / ỨNG TIỀN
// =====================================================

router.get("/", getSummary);

module.exports = router;