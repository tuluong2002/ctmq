const express = require("express");

const router = express.Router();

const {
  createDeNghiThanhToan,
  getDeNghiThanhToan,
  getNCCUnique,
  getOneDeNghiThanhToan,
  updateDeNghiThanhToan,
  deleteDeNghiThanhToan,
  printDeNghiThanhToan,
  cancelDeNghiThanhToan,
} = require("../controllers/deNghiThanhToanController");

// Nếu project có authMiddleware thì import ở đây
// const authMiddleware = require("../middleware/authMiddleware");

/* =========================================================
   DANH SÁCH
   GET /api/de-nghi-thanh-toan?month=8&year=2026
========================================================= */

router.get(
  "/",
  // authMiddleware,
  getDeNghiThanhToan
);

router.get("/ncc-unique", getNCCUnique);

/* =========================================================
   LẤY 1 PHIẾU
========================================================= */

router.get(
  "/:id",
  // authMiddleware,
  getOneDeNghiThanhToan
);

/* =========================================================
   THÊM
========================================================= */

router.post(
  "/",
  // authMiddleware,
  createDeNghiThanhToan
);

/* =========================================================
   SỬA
========================================================= */

router.put(
  "/:id",
  // authMiddleware,
  updateDeNghiThanhToan
);

/* =========================================================
   XÓA
========================================================= */

router.delete(
  "/:id",
  // authMiddleware,
  deleteDeNghiThanhToan
);

/* =========================================================
   IN PHIẾU
   POST /api/de-nghi-thanh-toan/:id/print
========================================================= */

router.post(
  "/:id/print",
  // authMiddleware,
  printDeNghiThanhToan
);

/* =========================================================
   HỦY PHIẾU THANH TOÁN
   PATCH /api/de-nghi-thanh-toan/:id/huy-phieu-tt
========================================================= */

router.patch(
  "/:id/huy-phieu-tt",
  // authMiddleware,
  cancelDeNghiThanhToan
);

module.exports = router;
