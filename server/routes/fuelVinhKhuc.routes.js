const express = require("express");
const router = express.Router();
const multer = require("multer");
const upload = multer({ storage: multer.memoryStorage() });

const controller = require("../controllers/fuelVinhKhuc.controller");

router.get("/", controller.getAll);
router.delete("/remove-by-month-year", controller.removeByMonthYear);
router.post("/import", upload.single("file"), controller.importExcel);
router.post("/update-vehicle-profit-fuel", controller.updateVehicleProfitFuel);
router.put("/:id", controller.update);
router.get("/fuel-vehicle", controller.getUniqueVehicleNos);
router.get("/by-month", controller.getVehicleProfitByMonth);

module.exports = router;
