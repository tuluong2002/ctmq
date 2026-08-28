const express = require("express");

const multer = require("multer");

const upload = multer();

const ctrl = require("../controllers/epassMonth.controller");

const router = express.Router();

router.get("/", ctrl.getAll);

router.get("/unique-bsx", ctrl.getUniqueBSX);

router.delete("/by-month-year", ctrl.removeByMonthYear);

router.post("/import-excel", upload.single("file"), ctrl.importExcel);

// =====================================================
// VEHICLE PROFIT - EPASS MONTH
// =====================================================

// Cập nhật cpEpassMonth theo tháng
router.post("/vehicle-profit/update", ctrl.updateVehicleProfitEpassMonth);

// Lấy danh sách cpEpassMonth theo tháng
router.get("/vehicle-profit", ctrl.getVehicleProfitEpassMonth);

module.exports = router;
