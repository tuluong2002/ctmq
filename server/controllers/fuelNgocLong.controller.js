const ExcelJS = require("exceljs");
const FuelNgocLong = require("../models/FuelNgocLong");

/* =========================================================
   LẤY DỮ LIỆU CÓ THÊM FILTER
========================================================= */
exports.getAll = async (req, res) => {
  try {
    const { month, vehiclePlates } = req.query;

    const filter = {};

    // Lọc theo tháng
    if (month) {
      const [year, mon] = month.split("-");

      const startDate = new Date(Number(year), Number(mon) - 1, 1);

      const endDate = new Date(Number(year), Number(mon), 0, 23, 59, 59, 999);

      filter.dateFull = {
        $gte: startDate,
        $lte: endDate,
      };
    }

    // Lọc theo mảng vehiclePlate
    if (vehiclePlates) {
      let arr = [];

      try {
        arr = JSON.parse(vehiclePlates);

        if (!Array.isArray(arr)) {
          arr = [];
        }
      } catch {
        arr = [];
      }

      if (arr.length > 0) {
        filter.vehiclePlate = {
          $in: arr,
        };
      }
    }

    // =====================================================
    // isDontMatchCP = true đưa lên đầu
    // Trong từng nhóm vẫn sắp xếp ngày mới nhất trước
    // =====================================================
    const data = await FuelNgocLong.find(filter).sort({
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
      vehiclePlate,
      vehicleCode,
      amount,
      liter,
      mayDo,
      cumulativeMechanical1,
      cumulativeMechanical2,
      checkElectronic1,
      checkElectronic2,
      internalFuelPrice,
      fuelRemaining,
      infoVehicle,
      placeFuel,
    } = req.body;

    if (!id) {
      return res.status(400).json({
        message: "Thiếu ID dữ liệu cần sửa",
      });
    }

    const data = await FuelNgocLong.findById(id);

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
    data.vehiclePlate = vehiclePlate;
    data.vehicleCode = vehicleCode;

    data.amount = amount;
    data.liter = liter;
    data.mayDo = mayDo;

    data.cumulativeMechanical1 = cumulativeMechanical1;
    data.cumulativeMechanical2 = cumulativeMechanical2;

    data.checkElectronic1 = checkElectronic1;
    data.checkElectronic2 = checkElectronic2;

    data.internalFuelPrice = internalFuelPrice;
    data.fuelRemaining = fuelRemaining;

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
    console.error("LỖI UPDATE FUEL NGỌC LONG:", err);

    res.status(500).json({
      success: false,
      message: err.message,
    });
  }
};

/* =========================================================
   LẤY DANH SÁCH VEHICLEPLATE DUY NHẤT
========================================================= */
exports.getUniqueVehiclePlates = async (req, res) => {
  try {
    const vehiclePlates = await FuelNgocLong.distinct("vehiclePlate");

    vehiclePlates.sort((a, b) =>
      String(a).localeCompare(String(b), undefined, {
        sensitivity: "base",
      }),
    );

    res.json(vehiclePlates);
  } catch (err) {
    res.status(500).json({
      message: err.message,
    });
  }
};

/* =========================================================
   XOÁ THEO THÁNG / NĂM
========================================================= */
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

    const startDate = new Date(y, m - 1, 1);

    const endDate = new Date(y, m, 1);

    const result = await FuelNgocLong.deleteMany({
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

/* =========================================================
   PARSE NGÀY EXCEL

   HỖ TRỢ:
   - Date object
   - dd/mm/yyyy
   - d/m/yyyy
   - yyyy-mm-dd
   - Excel serial number
   - ExcelJS object { text / result }
========================================================= */
function parseExcelDate(value) {
  if (value === null || value === undefined || value === "") {
    return null;
  }

  // =========================
  // EXCELJS OBJECT
  // =========================
  if (typeof value === "object" && !(value instanceof Date)) {
    value = value.result ?? value.text ?? null;
  }

  // =========================
  // DATE OBJECT
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
    if (isNaN(value)) {
      return null;
    }

    // Excel epoch: 1899-12-30
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

    // =========================
    // dd/mm/yyyy
    // d/m/yyyy
    // =========================
    const vnMatch = str.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);

    if (vnMatch) {
      const day = Number(vnMatch[1]);

      const month = Number(vnMatch[2]);

      const year = Number(vnMatch[3]);

      const date = new Date(year, month - 1, day);

      // Kiểm tra ngày có thực sự hợp lệ
      if (
        date.getFullYear() === year &&
        date.getMonth() === month - 1 &&
        date.getDate() === day
      ) {
        return date;
      }

      return null;
    }

    // =========================
    // yyyy-mm-dd
    // =========================
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

    // =========================
    // THỬ CÁC DẠNG DATE KHÁC
    // =========================
    const parsed = new Date(str);

    if (!isNaN(parsed.getTime())) {
      return parsed;
    }
  }

  return null;
}

/* =========================================================
   CHUYỂN SANG NUMBER
========================================================= */
function toNumber(val) {
  if (val === null || val === undefined || val === "") {
    return null;
  }

  // ExcelJS object
  if (typeof val === "object") {
    val = val.result ?? val.text ?? null;
  }

  if (typeof val === "number") {
    return isNaN(val) ? null : val;
  }

  if (typeof val !== "string") {
    return null;
  }

  let s = val.trim();

  if (!s) {
    return null;
  }

  // Không có số
  if (!/\d/.test(s)) {
    return null;
  }

  // Quy ước VN:
  // . = phân cách hàng nghìn
  // , = số thập phân
  s = s.replace(/\./g, "").replace(",", ".");

  const num = Number(s);

  return isNaN(num) ? null : num;
}

/* =========================================================
   CHUYỂN OBJECT EXCELJS -> STRING
========================================================= */
function toStringValue(val) {
  if (val === null || val === undefined) {
    return "";
  }

  if (typeof val === "object") {
    val = val.text ?? val.result ?? "";
  }

  return String(val || "").trim();
}

/* =========================================================
   IMPORT EXCEL
========================================================= */
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

    let inserted = 0;
    let skipped = 0;
    let skippedDate = 0;

    const bulk = [];

    /*
      Excel có dòng tiêu đề
      bắt đầu từ dòng 2
    */
    for (let i = 2; i <= sheet.rowCount; i++) {
      const row = sheet.getRow(i);

      /* =======================
         1. NGÀY
      ======================= */
      const rawDateFull = row.getCell(1).value;

      const dateFull = parseExcelDate(rawDateFull);

      /* =======================
         2. NGÀY
      ======================= */
      const day = toNumber(row.getCell(2).value);

      /* =======================
         3. BIỂN SỐ XE
      ======================= */
      const vehiclePlate = toStringValue(row.getCell(3).value);

      // Không có biển số => bỏ dòng
      if (!vehiclePlate) {
        skipped++;
        continue;
      }

      /* =======================
         NGÀY KHÔNG HỢP LỆ
      ======================= */
      if (
        rawDateFull !== null &&
        rawDateFull !== undefined &&
        rawDateFull !== "" &&
        dateFull === null
      ) {
        skipped++;
        skippedDate++;

        console.warn(`Dòng ${i}: Ngày không hợp lệ:`, rawDateFull);

        continue;
      }

      /* =======================
         4. MÃ XE
      ======================= */
      const vehicleCode = toStringValue(row.getCell(4).value);

      /* =======================
         5. SỐ TIỀN
      ======================= */
      const amount = toNumber(row.getCell(5).value);

      /* =======================
         6. SỐ LÍT
      ======================= */
      const liter = toNumber(row.getCell(6).value);

      /*
        Không phải dòng dữ liệu
        nếu thiếu các thông tin
        bắt buộc.
      */
      if (!dateFull || day === null || amount === null || liter === null) {
        skipped++;
        continue;
      }

      /* =======================
         7. MÁY ĐỔ
      ======================= */
      const mayDo = toStringValue(row.getCell(7).value);

      /* =======================
         8. CỘNG DỒN CƠ MÁY 1
      ======================= */
      const cumulativeMechanical1 = toNumber(row.getCell(8).value);

      /* =======================
         9. CỘNG DỒN CƠ MÁY 2
      ======================= */
      const cumulativeMechanical2 = toNumber(row.getCell(9).value);

      /* =======================
         10. CHECK ĐIỆN TỬ MÁY 1
      ======================= */
      const checkElectronic1 = toNumber(row.getCell(10).value);

      /* =======================
         11. CHECK ĐIỆN TỬ MÁY 2
      ======================= */
      const checkElectronic2 = toNumber(row.getCell(11).value);

      /* =======================
         12. GIÁ DẦU NỘI BỘ
      ======================= */
      const internalFuelPrice = toNumber(row.getCell(12).value);

      /* =======================
         13. TỒN DẦU
      ======================= */
      const fuelRemaining = toNumber(row.getCell(13).value);

      /* =======================
         14. THÔNG TIN XE
      ======================= */
      const infoVehicle = toStringValue(row.getCell(14).value);

      /* =======================
         15. NƠI ĐỔ DẦU
      ======================= */
      const placeFuel = toStringValue(row.getCell(15).value);

      /* =======================
         PAYLOAD
      ======================= */
      bulk.push({
        dateFull,
        day,
        vehiclePlate,
        vehicleCode,
        amount,
        liter,
        mayDo,
        cumulativeMechanical1,
        cumulativeMechanical2,
        checkElectronic1,
        checkElectronic2,
        internalFuelPrice,
        fuelRemaining,
        infoVehicle,
        placeFuel,
      });
    }

    /* =======================
       INSERT DATABASE
    ======================= */
    if (bulk.length > 0) {
      await FuelNgocLong.insertMany(bulk);

      inserted = bulk.length;
    }

    /* =======================
       RESPONSE
    ======================= */
    res.json({
      success: true,
      inserted,
      skipped,
      skippedDate,
    });
  } catch (err) {
    console.error("IMPORT FUEL NGOC LONG ERROR:", err);

    res.status(500).json({
      message: err.message,
    });
  }
};
