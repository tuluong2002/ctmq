const express = require("express");

const router = express.Router();

const {
  createOilRecord,
  getOilRecords,
} = require("../controllers/oilController");

// ================================
// THÊM BƠM DẦU
// ================================
router.post("/", createOilRecord);

// ================================
// LẤY DANH SÁCH
// ================================

module.exports = router;
