const VehiclePlate = require("../models/VehiclePlate");
const mongoose = require("mongoose");
const fs = require("fs");
const path = require("path");
const XLSX = require("xlsx");
const ExcelJS = require("exceljs");

/* ==============================
   LẤY DANH SÁCH
============================== */
const listVehicles = async (req, res) => {
  try {
    const { q } = req.query;
    const filter = {};

    if (q) {
      const re = new RegExp(q, "i");
      filter.$or = [{ plateNumber: re }, { company: re }, { vehicleType: re }];
    }

    const vehicles = await VehiclePlate.find(filter).sort({ createdAt: -1 });

    res.json(vehicles);
  } catch (err) {
    console.error("Lỗi lấy danh sách xe:", err);
    res.status(500).json({ error: "Lỗi server khi lấy danh sách xe" });
  }
};

/* ==============================
   LẤY 1 XE
============================== */
const getVehicle = async (req, res) => {
  try {
    const { id } = req.params;
    if (!mongoose.isValidObjectId(id))
      return res.status(400).json({ error: "ID không hợp lệ" });

    const v = await VehiclePlate.findById(id);
    if (!v) return res.status(404).json({ error: "Không tìm thấy xe" });

    res.json(v);
  } catch (err) {
    console.error("Lỗi lấy xe:", err);
    res.status(500).json({ error: "Lỗi server" });
  }
};

/* ==============================
   TẠO MỚI
============================== */
const createVehicle = async (req, res) => {
  try {
    const body = req.body || {};

    const vehicleData = {
      plateNumber: body.plateNumber || "",
      company: body.company || "",
      vehicleType: body.vehicleType || "",
      length: body.length || "",
      width: body.width || "",
      height: body.height || "",
      norm: body.norm || "",

      // ✅ Mảng ảnh
      registrationImage: (body.registrationImage || []).map((f) => f.url || f),
      inspectionImage: (body.inspectionImage || []).map((f) => f.url || f),

      // 🎯 Ngày
      resDay: body.resDay || null,
      resExpDay: body.resExpDay || null,
      insDay: body.insDay || null,
      insExpDay: body.insExpDay || null,

      // 🎯 Thêm giấy đi đường và ghi chú
      dayTravel: body.dayTravel || null,
      note: body.note || "",
      bhTNDS: body.bhTNDS || null,
      bhVC: body.bhVC || null,

      createdBy: req.user?.username || body.createdBy || "",
    };

    const saved = await VehiclePlate(vehicleData).save();
    res.status(201).json(saved);
  } catch (err) {
    console.error("Lỗi khi tạo xe:", err);
    res.status(500).json({ error: err.message });
  }
};

/* ==============================
   CẬP NHẬT
============================== */
const updateVehicle = async (req, res) => {
  try {
    const { id } = req.params;
    if (!mongoose.isValidObjectId(id))
      return res.status(400).json({ error: "ID không hợp lệ" });

    const vehicle = await VehiclePlate.findById(id);
    if (!vehicle) return res.status(404).json({ error: "Không tìm thấy xe" });

    const body = req.body || {};

    Object.assign(vehicle, {
      plateNumber: body.plateNumber ?? vehicle.plateNumber,
      company: body.company ?? vehicle.company,
      vehicleType: body.vehicleType ?? vehicle.vehicleType,
      length: body.length ?? vehicle.length,
      width: body.width ?? vehicle.width,
      height: body.height ?? vehicle.height,
      norm: body.norm ?? vehicle.norm,

      // ✅ Mảng ảnh: thay thế nếu có gửi mới
      registrationImage: body.registrationImage
        ? body.registrationImage.map((f) => f.url || f)
        : vehicle.registrationImage,

      inspectionImage: body.inspectionImage
        ? body.inspectionImage.map((f) => f.url || f)
        : vehicle.inspectionImage,

      // 🎯 Ngày
      resDay: body.resDay ?? vehicle.resDay,
      resExpDay: body.resExpDay ?? vehicle.resExpDay,
      insDay: body.insDay ?? vehicle.insDay,
      insExpDay: body.insExpDay ?? vehicle.insExpDay,

      // 🎯 Giấy đi đường và ghi chú
      dayTravel: body.dayTravel ?? vehicle.dayTravel,
      note: body.note ?? vehicle.note,
      bhTNDS: body.bhTNDS ?? vehicle.bhTNDS,
      bhVC: body.bhVC ?? vehicle.bhVC,
    });

    await vehicle.save();
    res.json(vehicle);
  } catch (err) {
    console.error("Lỗi khi cập nhật xe:", err);
    res.status(500).json({ error: err.message });
  }
};

/* ==============================
   XÓA
============================== */
const deleteVehicle = async (req, res) => {
  try {
    const { id } = req.params;
    if (!mongoose.isValidObjectId(id))
      return res.status(400).json({ error: "ID không hợp lệ" });

    const vehicle = await VehiclePlate.findById(id);
    if (!vehicle) return res.status(404).json({ error: "Không tìm thấy xe" });

    // Xóa file ảnh nếu có
    for (const img of vehicle.registrationImage || []) {
      const oldPath = path.join(process.cwd(), img.replace(/^\//, ""));
      if (fs.existsSync(oldPath)) fs.unlinkSync(oldPath);
    }
    for (const img of vehicle.inspectionImage || []) {
      const oldPath = path.join(process.cwd(), img.replace(/^\//, ""));
      if (fs.existsSync(oldPath)) fs.unlinkSync(oldPath);
    }

    await vehicle.deleteOne();
    res.json({ message: "Đã xóa thành công" });
  } catch (err) {
    console.error("Lỗi khi xóa xe:", err);
    res.status(500).json({ error: err.message });
  }
};

/* ==============================
   IMPORT EXCEL
============================== */
const importVehiclesFromExcel = async (req, res) => {
  try {
    if (!req.file)
      return res.status(400).json({ error: "Chưa upload file Excel" });

    const mode = req.query.mode || "add";

    const workbook = XLSX.read(req.file.buffer, { type: "buffer" });
    const sheet = workbook.Sheets[workbook.SheetNames[0]];
    const rows = XLSX.utils.sheet_to_json(sheet);

    let imported = 0,
      updated = 0,
      skipped = 0;
    const errors = [];

    const parseDate = (str) => {
      if (!str) return null;
      if (typeof str === "number")
        return new Date(Math.round((str - 25569) * 86400 * 1000));
      if (typeof str === "string") {
        const parts = str.split("/");
        if (parts.length !== 3) return null;
        const [day, month, year] = parts.map(Number);
        if (!day || !month || !year) return null;
        return new Date(year, month - 1, day);
      }
      return null;
    };

    for (const [idx, row] of rows.entries()) {
      try {
        const plate =
          row["BSX"]?.toString().trim() || row["BIỂN SỐ XE"]?.toString().trim();
        if (!plate) {
          skipped++;
          continue;
        }

        const data = {
          plateNumber: plate,
          company: row["Đơn vị vận tải"] || "",
          vehicleType: row["Loại xe"] || "",
          length: row["Dài"] || "",
          width: row["Rộng"] || "",
          height: row["Cao"] || "",
          norm: row["ĐỊNH MỨC"] || "",

          // Ngày
          resDay: parseDate(row["Ngày đăng ký"]),
          resExpDay: parseDate(row["Ngày hết hạn đăng ký"]),
          insDay: parseDate(row["Ngày đăng kiểm"]),
          insExpDay: parseDate(row["Ngày hết hạn đăng kiểm"]),

          // Giấy đi đường và ghi chú
          dayTravel: parseDate(row["Giấy đi đường"]),
          note: row["Ghi chú"] || "",
          bhTNDS: parseDate(row["Bảo hiểm TNDS"]),
          bhVC: parseDate(row["Bảo hiểm VC"]),
        };

        const existing = await VehiclePlate.findOne({ plateNumber: plate });

        if (!existing) {
          await VehiclePlate.create(data);
          imported++;
        } else if (mode === "overwrite") {
          await VehiclePlate.updateOne({ plateNumber: plate }, data);
          updated++;
        } else {
          skipped++;
        }
      } catch (err) {
        errors.push({ row: idx + 2, error: err.message });
      }
    }

    res.json({
      message: "Import hoàn tất",
      imported,
      updated,
      skipped,
      errors,
    });
  } catch (err) {
    console.error("Lỗi import Excel:", err);
    res.status(500).json({ error: err.message });
  }
};

/* ==============================
   LẤY THÔNG SỐ XE
============================== */
const listVehicleNames = async (req, res) => {
  try {
    const vehicles = await VehiclePlate.find(
      {},
      {
        plateNumber: 1,
        vehicleType: 1,
        length: 1,
        width: 1,
        height: 1,
        norm: 1,
      },
    );
    res.json(vehicles);
  } catch (error) {
    res.status(500).json({ error: "Không thể lấy danh sách xe" });
  }
};

/* ==============================
   TOGGLE CẢNH BÁO
============================== */
const toggleWarning = async (req, res) => {
  try {
    const { id } = req.params;
    const schedule = await VehiclePlate.findById(id);
    if (!schedule) return res.status(404).json({ error: "Không tìm thấy" });

    schedule.warning = !schedule.warning;
    await schedule.save();

    res.json({
      success: true,
      message: schedule.warning ? "Đã bật cảnh báo" : "Đã tắt cảnh báo",
      warning: schedule.warning,
    });
  } catch (err) {
    console.error("❌ Lỗi toggle cảnh báo:", err);
    res.status(500).json({ error: err.message });
  }
};

/* ==============================
   XÓA TẤT CẢ XE
============================== */
const deleteAllVehicles = async (req, res) => {
  try {
    const vehicles = await VehiclePlate.find();

    for (const vehicle of vehicles) {
      for (const img of vehicle.registrationImage || []) {
        const regPath = path.join(process.cwd(), img.replace(/^\//, ""));
        if (fs.existsSync(regPath)) fs.unlinkSync(regPath);
      }
      for (const img of vehicle.inspectionImage || []) {
        const insPath = path.join(process.cwd(), img.replace(/^\//, ""));
        if (fs.existsSync(insPath)) fs.unlinkSync(insPath);
      }
    }

    await VehiclePlate.deleteMany();
    res.json({
      message: "Đã xóa tất cả xe thành công",
      count: vehicles.length,
    });
  } catch (err) {
    console.error("Lỗi xóa tất cả xe:", err);
    res.status(500).json({ error: err.message });
  }
};

/* ==============================
   EXPORT DS XE (FORM MẪU)
============================== */
const exportVehicles = async (req, res) => {
  try {
    // 1️⃣ LẤY DATA
    const vehicles = await VehiclePlate.find({}).sort({
      createdAt: 1,
    });

    if (!vehicles.length) {
      return res.status(400).json({
        message: "Không có dữ liệu xe",
      });
    }

    // 2️⃣ LOAD FILE MẪU
    const workbook = new ExcelJS.Workbook();

    await workbook.xlsx.readFile(
      path.join(__dirname, "../templates/DS_XE.xlsx"),
    );

    const sheet = workbook.getWorksheet("Vehicles");

    if (!sheet) {
      return res.status(500).json({
        message: "Không tìm thấy sheet DS XE",
      });
    }

    // 3️⃣ GHI DỮ LIỆU TỪ DÒNG 2
    const startRow = 2;

    vehicles.forEach((v, index) => {
      const row = sheet.getRow(startRow + index);

      row.getCell("A").value = index + 1; // STT
      row.getCell("B").value = v.plateNumber || ""; // BSX
      row.getCell("C").value = v.company || ""; // Đơn vị vận tải
      row.getCell("D").value = v.vehicleType || ""; // Loại xe
      row.getCell("E").value = v.length || ""; // Dài
      row.getCell("F").value = v.width || ""; // Rộng
      row.getCell("G").value = v.height || ""; // Cao
      row.getCell("H").value = v.norm || ""; // Định mức
      row.getCell("J").value = v.resDay ? new Date(v.resDay) : null; // Ngày đăng ký
      row.getCell("K").value = v.resExpDay ? new Date(v.resExpDay) : null; // Ngày hết hạn đăng ký
      row.getCell("M").value = v.insDay ? new Date(v.insDay) : null; // Ngày đăng kiểm
      row.getCell("N").value = v.insExpDay ? new Date(v.insExpDay) : null; // Ngày hết hạn đăng kiểm
      row.getCell("O").value = v.dayTravel ? new Date(v.dayTravel) : null; // Giấy đi đường
      row.getCell("P").value = v.note || ""; // Ghi chú
      row.getCell("Q").value = v.bhTNDS ? new Date(v.bhTNDS) : null; // Bảo hiểm TNDS
      row.getCell("R").value = v.bhVC ? new Date(v.bhVC) : null; // Bảo hiểm VC

      row.commit();
    });

    // 4️⃣ TRẢ FILE
    res.setHeader(
      "Content-Disposition",
      "attachment; filename=DANH_SACH_XE.xlsx",
    );

    res.setHeader(
      "Content-Type",
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    );

    await workbook.xlsx.write(res);
    res.end();
  } catch (err) {
    console.error("❌ Export vehicles error:", err);

    res.status(500).json({
      message: "Lỗi xuất danh sách xe",
    });
  }
};

module.exports = {
  listVehicles,
  getVehicle,
  createVehicle,
  updateVehicle,
  deleteVehicle,
  importVehiclesFromExcel,
  listVehicleNames,
  toggleWarning,
  deleteAllVehicles,
  exportVehicles,
};
