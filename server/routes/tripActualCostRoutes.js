const express = require("express");

const router = express.Router();

const controller = require("../controllers/tripActualCostController");

// =====================================================
// TẠO DATA TỪ MÃ CHUYẾN
// =====================================================
router.post("/", controller.createFromTrip);

router.post("/export-excel", controller.exportExcel);

// =====================================================
// LẤY DANH SÁCH
// =====================================================
router.get("/", controller.getAll);

router.get("/users", controller.getUserList);

// =====================================================
// ĐỔI TRẠNG THÁI IS PROCESSED
// false <-> true
// =====================================================

router.patch("/:id/toggle-processed", controller.toggleProcessed);

// =====================================================
// LẤY CHI TIẾT
// =====================================================
router.get("/:id", controller.getById);

// =====================================================
// CẬP NHẬT GIÁ TRỊ THỰC TẾ
// =====================================================
router.put("/:id", controller.updateActual);

// =====================================================
// CẬP NHẬT VỀ CHUYẾN GỐC
// =====================================================
router.put("/:id/update-original", controller.updateToOriginalTrip);

router.delete("/:id", controller.delete);

module.exports = router;
