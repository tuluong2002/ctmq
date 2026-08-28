const express = require("express");
const router = express.Router();
const repairController = require("../controllers/repair.controller");
const multer = require("multer");

const upload = multer({ storage: multer.memoryStorage() }); // dùng memory storage cho Excel

/* =======================
   LẤY TẤT CẢ (có filter)
======================= */
router.get("/", repairController.getAll);

/* =======================
   LẤY DANH SÁCH vehiclePlate DUY NHẤT
======================= */
router.get("/unique-vehiclePlates", repairController.getUniqueVehiclePlates);

/* =======================
   LẤY DANH SÁCH repairUnit DUY NHẤT
======================= */
router.get("/unique-repairUnits", repairController.getUniqueRepairUnits);

router.get("/repair-cost", repairController.getVehicleRepairCostByMonth);

/* =======================
   XOÁ TẤT CẢ
======================= */
router.delete("/month-year", repairController.removeByMonthYear);

/* =======================
   IMPORT EXCEL
======================= */
router.post("/import", upload.single("file"), repairController.importExcel);
router.post("/update-repair-cost", repairController.updateVehicleProfitRepair);

module.exports = router;
