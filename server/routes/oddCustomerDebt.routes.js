const express = require("express");
const multer = require("multer");
const router = express.Router();

// controller
const oddDebtCtrl = require("../controllers/oddCustomerDebt.controller");

// upload file vào memory
const upload = multer({
  storage: multer.memoryStorage(),
});

// ===============================
// 📌 CÔNG NỢ KHÁCH LẺ (KH = 26)
// ===============================

// 🔹 Tạo công nợ theo khoảng ngày
// POST /api/odd-debt/create
router.post("/create", oddDebtCtrl.createOddDebtByDate);

// 🔹 Sync / cập nhật lại tiền các chuyến trong công nợ
// POST /api/odd-debt/sync
router.post("/sync", oddDebtCtrl.syncOddDebtByDate);

router.get("/filter-all", oddDebtCtrl.getAllOddDebtFilterOptions);

// 🔹 Lấy danh sách công nợ KH lẻ
// GET /api/odd-debt?startDate=&endDate=&page=&limit=
router.get("/all", oddDebtCtrl.getOddCustomerDebt);

// 🔹 Import tiền từ Excel
router.post(
  "/import-trip-fee",
  upload.single("file"),
  oddDebtCtrl.importTripFee,
);

// ===============================
// 📌 THANH TOÁN THEO CHUYẾN
// ===============================

// 🔹 Lịch sử thanh toán 1 chuyến
// GET /api/odd-debt/payment/:maChuyenCode
router.get("/payment/:maChuyenCode", oddDebtCtrl.getTripPaymentHistory);

// 🔹 Thêm thanh toán cho chuyến
// POST /api/odd-debt/payment
router.post("/payment", oddDebtCtrl.addTripPayment);

router.post("/trip-payment/bulk", oddDebtCtrl.addBulkTripPayment);

// 🔹 Xoá 1 lần thanh toán
// DELETE /api/odd-debt/payment/:paymentId
router.delete("/payment/:paymentId", oddDebtCtrl.deleteTripPayment);

// ===============================
// ✏️ CẬP NHẬT THÔNG TIN PHỤ
// ===============================

// 🔹 Cập nhật nameCustomer cho nhiều chuyến
// PUT /api/odd-debt/name-customer
router.put("/name-customer", oddDebtCtrl.updateTripNameCustomer);

// 🔹 Cập nhật noteOdd cho nhiều chuyến
// PUT /api/odd-debt/note
router.put("/note", oddDebtCtrl.updateTripNoteOdd);

// routes/schCustomerOdd.js
router.put("/update-money", oddDebtCtrl.updateOddTripMoney);

router.post("/sync-to-base-by-date", oddDebtCtrl.syncOddToBaseByDate);

router.put("/highlight", oddDebtCtrl.updateHighlight);

// ===============================
// 🔒 KHOÁ / MỞ KHOÁ CHUYẾN KH LẺ
// ===============================

// 🔒 Khoá chuyến theo khoảng ngày giao
// POST /api/odd-debt/lock-by-date
router.post("/lock-by-date", oddDebtCtrl.lockOddTripsByDate);

// 🔁 Toggle khoá / mở 1 chuyến
// POST /api/odd-debt/toggle-lock
router.post("/toggle-lock", oddDebtCtrl.toggleLockOddTrip);

//xuất file excel
router.post("/export-excel-by-range", oddDebtCtrl.exportOddDebtByDateRange);

module.exports = router;
