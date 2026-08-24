const express = require("express");
const router = express.Router();
const multer = require("multer");
const upload = multer({ storage: multer.memoryStorage() });

const controller = require("../controllers/fuelNgocLong.controller");

router.get("/", controller.getAll);
router.delete("/", controller.removeAll);
router.post("/import", upload.single("file"), controller.importExcel);
router.get("/fuel-vehicle", controller.getUniqueVehiclePlates)

module.exports = router;
