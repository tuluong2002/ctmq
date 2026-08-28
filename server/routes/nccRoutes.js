const express = require("express");
const multer = require("multer");

const router = express.Router();

const {
  getAllNCC,
  importNCC,
  deleteAllNCC,
} = require("../controllers/NCCController");

/* =========================================================
   MULTER
   Lưu file vào RAM để ExcelJS đọc trực tiếp
========================================================= */

const upload = multer({
  storage: multer.memoryStorage(),

  limits: {
    fileSize: 20 * 1024 * 1024, // 20MB
  },

  fileFilter: (req, file, cb) => {
    const allowedExtensions = [".xlsx", ".xls"];

    const fileName = file.originalname.toLowerCase();

    const isExcel = allowedExtensions.some((ext) => fileName.endsWith(ext));

    if (!isExcel) {
      return cb(new Error("Chỉ được phép import file Excel (.xlsx, .xls)"));
    }

    cb(null, true);
  },
});

/* =========================================================
   ROUTES
========================================================= */

// Lấy danh sách
router.get("/", getAllNCC);

// Import Excel
router.post("/import", upload.single("file"), importNCC);

// Xoá tất cả
router.delete("/delete-all", deleteAllNCC);

module.exports = router;
