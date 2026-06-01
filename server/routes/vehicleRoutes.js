// routes/vehicles.js
const express = require("express");
const router = express.Router();
const multer = require("multer");
const {
  listVehicles,
  getVehicle,
  createVehicle,
  updateVehicle,
  deleteVehicle,
  importVehiclesFromExcel,
  exportVehicles,
  listVehicleNames,
  toggleWarning,
  deleteAllVehicles,
} = require("../controllers/vehicleController");
const cloudinary = require("../config/cloudinary"); // file config cloudinary
const { Readable } = require("stream");

// --------------------------
// Multer MemoryStorage (lưu file tạm trong RAM)
// --------------------------
const memoryStorage = multer.memoryStorage();
const upload = multer({ storage: memoryStorage });
const path = require("path");

// --------------------------
// Helper upload file lên Cloudinary
// --------------------------
async function uploadToCloudinary(file, folder = "vehicles") {
  return new Promise((resolve, reject) => {
    const stream = cloudinary.uploader.upload_stream(
      {
        folder,
        resource_type: "raw",
        public_id: path.parse(file.originalname).name,
      },
      (error, result) => {
        if (error) reject(error);
        else resolve(result);
      },
    );

    const readable = new Readable();
    readable._read = () => {};
    readable.push(file.buffer);
    readable.push(null);
    readable.pipe(stream);
  });
}

async function handleVehicleFileUpload(req, res, next) {
  try {
    const files = req.files || {};

    if (Array.isArray(files.registrationImage)) {
      const uploaded = [];

      for (const file of files.registrationImage) {
        const result = await uploadToCloudinary(file);

        uploaded.push(result.secure_url);
      }

      req.body.registrationImage = uploaded;
    }

    if (Array.isArray(files.inspectionImage)) {
      const uploaded = [];

      for (const file of files.inspectionImage) {
        const result = await uploadToCloudinary(file);

        uploaded.push({
          url: result.secure_url,
          originalName: file.originalname,
          mimeType: file.mimetype,
          size: file.size,
        });
      }

      req.body.inspectionImage = uploaded;
    }

    next();
  } catch (err) {
    console.error("Vehicle upload error:", err);

    return res.status(500).json({
      message: "Upload vehicle files failed",
      error: err.message,
    });
  }
}

// --------------------------
// Routes
// --------------------------
router.get("/", listVehicles);
router.get("/export", exportVehicles);
router.get("/:id", getVehicle);

router.post(
  "/",
  upload.fields([
    { name: "registrationImage", maxCount: 5 },
    { name: "inspectionImage", maxCount: 5 },
  ]),
  handleVehicleFileUpload,
  createVehicle,
);

router.put(
  "/:id",
  upload.fields([
    { name: "registrationImage", maxCount: 5 },
    { name: "inspectionImage", maxCount: 5 },
  ]),
  handleVehicleFileUpload,
  updateVehicle,
);

router.delete("/all", deleteAllVehicles);
router.delete("/:id", deleteVehicle);

// Import Excel (MemoryStorage)
const excelStorage = multer.memoryStorage();
const excelUpload = multer({ storage: excelStorage });
router.post("/import", excelUpload.single("file"), importVehiclesFromExcel);

router.get("/names/list", listVehicleNames);
router.put("/warning/:id", toggleWarning);

module.exports = router;
