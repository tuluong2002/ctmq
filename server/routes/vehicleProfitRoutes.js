const express = require("express");
const multer = require("multer");

const router = express.Router();

const {
  createMonthlyProfit,
  updateVehicleProfit,
  recalculateMonthlyProfit,
  getMonthlyProfit,
  getVehicleMonthlyProfit,
  exportMonthlyProfit,
  importMonthlyCost,
} = require("../controllers/vehicleProfitController");

// =====================================================
// MULTER
// Nhận file Excel vào memory
// =====================================================
const upload = multer({
  storage: multer.memoryStorage(),
});


// =====================================================
// TẠO KỲ LỢI NHUẬN
// =====================================================
// POST
// /api/vehicle-profit/create
//
// body:
// {
//   "maLoiNhuan": "LN.7.2026"
// }
router.post("/create", createMonthlyProfit);


// =====================================================
// XUẤT EXCEL LỢI NHUẬN THEO THÁNG
// =====================================================
// GET
// /api/vehicle-profit/export?maLoiNhuan=LN.7.2026
//
// Excel:
// STT | BSX | Doanh thu | Chi phí | Lợi nhuận | Mã LN
router.get("/export", exportMonthlyProfit);


// =====================================================
// NHẬP CHI PHÍ THEO THÁNG
// =====================================================
// POST
// /api/vehicle-profit/import-cost
//
// FormData:
// file = file Excel
//
// Excel:
// STT | BSX | Doanh thu | Chi phí | Lợi nhuận | Mã LN
router.post(
  "/import-cost",
  upload.single("file"),
  importMonthlyCost
);


// =====================================================
// TÍNH LẠI TOÀN BỘ KỲ
// =====================================================
// PUT
// /api/vehicle-profit/recalculate
//
// body:
// {
//   "maLoiNhuan": "LN.7.2026"
// }
router.put("/recalculate", recalculateMonthlyProfit);


// =====================================================
// CẬP NHẬT CHI PHÍ 1 XE + TÍNH LẠI LỢI NHUẬN
// =====================================================
// PUT
// /api/vehicle-profit/:bsx
//
// body:
// {
//   "maLoiNhuan": "LN.7.2026",
//   "chiPhi": 15000000
// }
router.put("/:bsx", updateVehicleProfit);


// =====================================================
// LẤY DANH SÁCH
// =====================================================
// GET
// /api/vehicle-profit?maLoiNhuan=LN.7.2026
router.get("/", getMonthlyProfit);


// =====================================================
// LẤY 1 XE
// =====================================================
// GET
// /api/vehicle-profit/29A-12345?maLoiNhuan=LN.7.2026
router.get("/:bsx", getVehicleMonthlyProfit);


module.exports = router;