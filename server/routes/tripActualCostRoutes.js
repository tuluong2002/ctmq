const express = require("express");

const router = express.Router();

const controller = require("../controllers/tripActualCostController");

// =====================================================
// TẠO DATA TỪ MÃ CHUYẾN
// =====================================================
router.post("/", controller.createFromTrip);

// =====================================================
// LẤY DANH SÁCH
// =====================================================
router.get("/", controller.getAll);

router.get("/users", controller.getUserList);

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

module.exports = router;
