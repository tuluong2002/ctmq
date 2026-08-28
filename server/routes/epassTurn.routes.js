const express = require("express");
const multer = require("multer");
const upload = multer();

const ctrl = require("../controllers/epassTurn.controller");

const router = express.Router();

/* ================= CRUD ================= */
router.get("/", ctrl.getAll);
router.delete("/by-month-year", ctrl.removeByMonthYear);

/* ================= FILTER ================= */
router.get("/unique-bsx", ctrl.getUniqueBsx);

/* ================= IMPORT ================= */
router.post("/import-excel", upload.single("file"), ctrl.importExcel);

router.post("/vehicle-profit/update", ctrl.updateVehicleProfitEpassTurn);

router.get("/vehicle-profit", ctrl.getVehicleProfitEpassTurn);

module.exports = router;
