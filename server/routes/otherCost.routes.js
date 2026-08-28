const express = require("express");
const router = express.Router();
const multer = require("multer");

const upload = multer();

const otherCostController = require("../controllers/otherCost.controller.js");

// =====================================================
// LẤY TẤT CẢ CHI PHÍ KHÁC
// Có thể filter theo:
// ?month=08&year=2026
// ?suppliers=["ABC","XYZ"]
// =====================================================
router.get("/", otherCostController.getAll);

// =====================================================
// LẤY DANH SÁCH ĐƠN VỊ NHÀ CUNG CẤP DUY NHẤT
// =====================================================
router.get("/unique-suppliers", otherCostController.getUniqueSuppliers);

// =====================================================
// XOÁ TẤT CẢ CHI PHÍ KHÁC THEO THÁNG
// =====================================================
router.delete("/remove-by-month-year", otherCostController.removeByMonthYear);

// =====================================================
// IMPORT EXCEL
// Form field: file
// =====================================================
router.post(
  "/import-excel",
  upload.single("file"),
  otherCostController.importExcel,
);

module.exports = router;
