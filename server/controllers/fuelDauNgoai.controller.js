const ExcelJS = require("exceljs");
const FuelDauNgoai = require("../models/FuelDauNgoai");

/* =========================================================
   HELPER: PARSE NGÀY EXCEL
   HỖ TRỢ:
   - Date
   - dd/mm/yyyy
   - d/m/yyyy
   - yyyy-mm-dd
   - Excel serial number
========================================================= */
const parseExcelDate = (value) => {
  if (value === null || value === undefined || value === "") {
    return null;
  }

  // =========================
  // ĐÃ LÀ DATE
  // =========================
  if (value instanceof Date) {
    if (!isNaN(value.getTime())) {
      return value;
    }

    return null;
  }

  // =========================
  // EXCEL SERIAL NUMBER
  // =========================
  if (typeof value === "number") {
    // Excel tính từ 1899-12-30
    const excelEpoch = new Date(Date.UTC(1899, 11, 30));

    const date = new Date(excelEpoch.getTime() + value * 24 * 60 * 60 * 1000);

    if (!isNaN(date.getTime())) {
      return date;
    }

    return null;
  }

  // =========================
  // STRING
  // =========================
  if (typeof value === "string") {
    const str = value.trim();

    if (!str) {
      return null;
    }

    // -----------------------------------------
    // dd/mm/yyyy hoặc d/m/yyyy
    // -----------------------------------------
    const vnMatch = str.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);

    if (vnMatch) {
      const day = Number(vnMatch[1]);
      const month = Number(vnMatch[2]);
      const year = Number(vnMatch[3]);

      const date = new Date(year, month - 1, day);

      // Kiểm tra ngày hợp lệ
      if (
        date.getFullYear() === year &&
        date.getMonth() === month - 1 &&
        date.getDate() === day
      ) {
        return date;
      }

      return null;
    }

    // -----------------------------------------
    // yyyy-mm-dd
    // -----------------------------------------
    const isoMatch = str.match(/^(\d{4})-(\d{1,2})-(\d{1,2})$/);

    if (isoMatch) {
      const year = Number(isoMatch[1]);
      const month = Number(isoMatch[2]);
      const day = Number(isoMatch[3]);

      const date = new Date(year, month - 1, day);

      if (
        date.getFullYear() === year &&
        date.getMonth() === month - 1 &&
        date.getDate() === day
      ) {
        return date;
      }

      return null;
    }

    // -----------------------------------------
    // Thử parse các dạng Date khác
    // -----------------------------------------
    const parsed = new Date(str);

    if (!isNaN(parsed.getTime())) {
      return parsed;
    }
  }

  return null;
};

/* =======================
   LẤY DỮ LIỆU CÓ THÊM FILTER
======================= */
exports.getAll = async (req, res) => {
  try {
    const { month, vehicleNos } = req.query;

    const filter = {};

    // =======================
    // LỌC THEO THÁNG
    // =======================
    if (month) {
      const [year, mon] = month.split("-");

      const startDate = new Date(Number(year), Number(mon) - 1, 1);

      const endDate = new Date(Number(year), Number(mon), 0, 23, 59, 59, 999);

      filter.dateFull = {
        $gte: startDate,
        $lte: endDate,
      };
    }

    // =======================
    // LỌC THEO VEHICLENO
    // =======================
    if (vehicleNos) {
      let arr = [];

      try {
        arr = JSON.parse(vehicleNos);

        if (!Array.isArray(arr)) {
          arr = [];
        }
      } catch {
        arr = [];
      }

      if (arr.length > 0) {
        filter.vehicleNo = {
          $in: arr,
        };
      }
    }

    // =====================================================
    // isDontMatchCP = true đưa lên đầu
    // Trong từng nhóm vẫn sắp xếp ngày mới nhất trước
    // =====================================================
    const data = await FuelDauNgoai.find(filter).sort({
      isDontMatchCP: -1,
      dateFull: -1,
    });

    res.json(data);
  } catch (err) {
    res.status(500).json({
      message: err.message,
    });
  }
};

/* =========================================================
   SỬA 1 DÒNG NHIÊN LIỆU
========================================================= */
exports.update = async (req, res) => {
  try {
    const { id } = req.params;

    const {
      dateFull,
      day,
      vehicleNo,
      vehicleCode,
      amount,
      liter,
      fuelPrice,
      note,
      infoVehicle,
      placeFuel,
    } = req.body;

    if (!id) {
      return res.status(400).json({
        message: "Thiếu ID dữ liệu cần sửa",
      });
    }

    const data = await FuelDauNgoai.findById(id);

    if (!data) {
      return res.status(404).json({
        message: "Không tìm thấy dữ liệu nhiên liệu",
      });
    }

    // =======================
    // CẬP NHẬT DỮ LIỆU
    // =======================
    data.dateFull = dateFull;
    data.day = day;
    data.vehicleNo = vehicleNo;
    data.vehicleCode = vehicleCode;

    data.amount = amount;
    data.liter = liter;
    data.fuelPrice = fuelPrice;
    data.note = note;

    data.infoVehicle = infoVehicle;
    data.placeFuel = placeFuel;

    // KHÔNG sửa isDontMatchCP ở đây
    // Hàm cập nhật chi phí theo tháng sẽ tính lại.

    await data.save();

    res.json({
      success: true,
      message: "Cập nhật dữ liệu thành công",
      data,
    });
  } catch (err) {
    console.error("LỖI UPDATE FUEL DẦU NGOÀI:", err);

    res.status(500).json({
      success: false,
      message: err.message,
    });
  }
};

/* =======================
   LẤY DANH SÁCH VEHICLENO DUY NHẤT
======================= */
exports.getUniqueVehicleNos = async (req, res) => {
  try {
    const vehicleNos = await FuelDauNgoai.distinct("vehicleNo");

    vehicleNos.sort((a, b) =>
      a.localeCompare(b, undefined, {
        sensitivity: "base",
      }),
    );

    res.json(vehicleNos);
  } catch (err) {
    res.status(500).json({
      message: err.message,
    });
  }
};

/* =======================
   XOÁ THEO THÁNG / NĂM
======================= */
exports.removeByMonthYear = async (req, res) => {
  try {
    const { month, year } = req.body;

    const m = Number(month);
    const y = Number(year);

    if (!m || !y || m < 1 || m > 12) {
      return res.status(400).json({
        message: "Tháng hoặc năm không hợp lệ",
      });
    }

    // =======================
    // ĐẦU THÁNG
    // =======================
    const startDate = new Date(y, m - 1, 1);

    // =======================
    // ĐẦU THÁNG TIẾP THEO
    // =======================
    const endDate = new Date(y, m, 1);

    const result = await FuelDauNgoai.deleteMany({
      dateFull: {
        $gte: startDate,
        $lt: endDate,
      },
    });

    res.json({
      success: true,
      deletedCount: result.deletedCount,
      month: m,
      year: y,
    });
  } catch (err) {
    res.status(500).json({
      message: err.message,
    });
  }
};

/* =======================
   IMPORT EXCEL
======================= */
exports.importExcel = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        message: "Không có file Excel",
      });
    }

    const workbook = new ExcelJS.Workbook();

    await workbook.xlsx.load(req.file.buffer);

    const sheet = workbook.worksheets[0];

    if (!sheet) {
      return res.status(400).json({
        message: "File Excel không có sheet",
      });
    }

    let totalValid = 0;
    let inserted = 0;
    let skippedDate = 0;

    const bulk = [];

    // =======================
    // DUYỆT TỪNG DÒNG
    // =======================
    for (let i = 2; i <= sheet.rowCount; i++) {
      const row = sheet.getRow(i);

      // =======================
      // LẤY DỮ LIỆU
      // =======================
      const rawDateFull = row.getCell(1).value;

      const day = row.getCell(2).value;

      const vehicleNo = row.getCell(3).value;

      const vehicleCode = row.getCell(4).value;

      const amount = row.getCell(5).value;

      const liter = row.getCell(6).value;

      const fuelPrice = row.getCell(7).value;

      const note = row.getCell(8).value;

      const infoVehicle = row.getCell(9).value;

      const placeFuel = row.getCell(10).value;

      // =======================
      // BỎ DÒNG KHÔNG CÓ SỐ XE
      // =======================
      if (
        vehicleNo === null ||
        vehicleNo === undefined ||
        String(vehicleNo).trim() === ""
      ) {
        continue;
      }

      totalValid++;

      // =======================
      // PARSE DATE
      // =======================
      const dateFull = parseExcelDate(rawDateFull);

      // =======================
      // NẾU CÓ NGÀY NHƯNG NGÀY
      // KHÔNG HỢP LỆ
      // =======================
      if (
        rawDateFull !== null &&
        rawDateFull !== undefined &&
        rawDateFull !== "" &&
        dateFull === null
      ) {
        skippedDate++;

        console.warn(`Dòng ${i}: Ngày không hợp lệ:`, rawDateFull);

        continue;
      }

      // =======================
      // THÊM VÀO BULK
      // =======================
      bulk.push({
        dateFull,

        day:
          day !== null && day !== undefined && day !== "" ? Number(day) : null,

        vehicleNo: String(vehicleNo).trim(),

        vehicleCode:
          vehicleCode !== null && vehicleCode !== undefined
            ? String(vehicleCode).trim()
            : "",

        amount:
          amount !== null && amount !== undefined && amount !== ""
            ? Number(amount)
            : 0,

        liter:
          liter !== null && liter !== undefined && liter !== ""
            ? Number(liter)
            : 0,

        fuelPrice:
          fuelPrice !== null && fuelPrice !== undefined && fuelPrice !== ""
            ? Number(fuelPrice)
            : 0,

        note: note !== null && note !== undefined ? String(note).trim() : "",

        infoVehicle:
          infoVehicle !== null && infoVehicle !== undefined
            ? String(infoVehicle).trim()
            : "",

        placeFuel:
          placeFuel !== null && placeFuel !== undefined
            ? String(placeFuel).trim()
            : "",
      });
    }

    // =======================
    // INSERT DATABASE
    // =======================
    if (bulk.length > 0) {
      await FuelDauNgoai.insertMany(bulk);

      inserted = bulk.length;
    }

    // =======================
    // RESPONSE
    // =======================
    res.json({
      success: true,
      totalValid,
      inserted,
      skippedDate,
    });
  } catch (err) {
    console.error("IMPORT FUEL DAU NGOAI ERROR:", err);

    res.status(500).json({
      message: err.message,
    });
  }
};
