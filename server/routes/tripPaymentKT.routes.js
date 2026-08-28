const express = require("express");

const router = express.Router();

const multer = require("multer");

// =========================
// 📦 MULTER (IMPORT EXCEL)
// =========================

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB
});

// =========================
// 🎯 CONTROLLERS
// =========================

const {
  getAllTripPaymentKT,
  getUniqueDriverNames,
  getUniqueLicensePlates,
  deleteByMonth,
  importTripPaymentKTExcel,

  // =========================
  // VEHICLE PROFIT
  // =========================

  updateVehicleProfitThanhToanLichTrinh,
  getVehicleProfitThanhToanLichTrinh,
} = require("../controllers/tripPaymentKT.controller");

// =========================
// 🗑 XOÁ THEO KHOẢNG NGÀY
// =========================

router.delete("/delete-by-date", deleteByMonth);

// =========================
// 📋 DANH SÁCH + FILTER
// =========================

// Lấy tất cả
// filter: from, to, tenLaiXe[], bienSoXe[]
router.get("/", getAllTripPaymentKT);

// Danh sách tên lái xe
router.get("/drivers", getUniqueDriverNames);

// Danh sách biển số xe
router.get("/plates", getUniqueLicensePlates);

// =========================
// 📥 IMPORT EXCEL
// =========================

router.post("/import-excel", upload.single("file"), importTripPaymentKTExcel);

// =========================================================
// 💰 VEHICLE PROFIT - THANH TOÁN LỊCH TRÌNH
// =========================================================

// Cập nhật cpThanhToanLichTrinh
//
// POST:
// /trip-payment-kt/vehicle-profit/update
//
// Body:
// {
//   month: "2026-08"
// }

router.post("/vehicle-profit/update", updateVehicleProfitThanhToanLichTrinh);

// =========================================================
// 📊 LẤY VEHICLE PROFIT + cpThanhToanLichTrinh
// =========================================================
//
// GET:
// /trip-payment-kt/vehicle-profit?month=2026-08

router.get("/vehicle-profit", getVehicleProfitThanhToanLichTrinh);

module.exports = router;
