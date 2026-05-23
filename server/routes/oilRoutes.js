const express = require("express");
const router = express.Router();

const multer = require("multer");
const { Readable } = require("stream");

const cloudinary = require("../config/cloudinary");

const {
  createOilRecord,
  getOilRecordsByDate,
} = require("../controllers/oilController");

// ==========================
// MULTER MEMORY
// ==========================
const imageUpload = multer({
  storage: multer.memoryStorage(),
});

// ==========================
// UPLOAD CLOUDINARY
// ==========================
async function uploadToCloudinary(buffer, folder = "oil") {
  return new Promise((resolve, reject) => {
    const stream = cloudinary.uploader.upload_stream(
      { folder },
      (error, result) => {
        if (error) reject(error);
        else resolve(result.secure_url);
      }
    );

    const readable = new Readable();

    readable._read = () => {};

    readable.push(buffer);
    readable.push(null);

    readable.pipe(stream);
  });
}

// ==========================
// HANDLE IMAGE UPLOAD
// ==========================
async function handleImageUpload(req, res, next) {
  try {
    if (Array.isArray(req.files?.imageOil)) {
      const urls = [];

      for (const file of req.files.imageOil) {
        const url = await uploadToCloudinary(file.buffer, "oil/imageOil");

        urls.push(url);
      }

      req.body.imageOil = urls;
    }

    next();
  } catch (err) {
    console.error("Upload error:", err);

    return res.status(500).json({
      message: "Upload image failed",
      error: err.message,
    });
  }
}

// ================================
// THÊM BƠM DẦU
// ================================
router.post(
  "/",
  imageUpload.fields([
    {
      name: "imageOil",
      maxCount: 10,
    },
  ]),
  handleImageUpload,
  createOilRecord
);

// ================================
// LẤY DANH SÁCH
// ================================
router.get("/by-date", getOilRecordsByDate);

module.exports = router;
