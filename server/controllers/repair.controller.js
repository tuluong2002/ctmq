const ExcelJS = require("exceljs");
const Repair = require("../models/Repair");
const VehicleProfit = require("../models/VehicleProfit");

/* =======================
   LẤY DỮ LIỆU CÓ THÊM FILTER
   LỌC THEO THÁNG/NĂM NGÀY SỬA CHỮA
======================= */
exports.getAll = async (req, res) => {
  try {
    const { month, vehiclePlates, repairUnits } = req.query;

    const filter = {};

    // =====================================================
    // LỌC THEO THÁNG / NĂM
    // month dạng: 2026-08
    // LỌC THEO repairDate = NGÀY SỬA CHỮA
    // =====================================================
    if (month) {
      const [year, mon] = month.split("-");

      const y = Number(year);
      const m = Number(mon);

      if (Number.isFinite(y) && Number.isFinite(m) && m >= 1 && m <= 12) {
        // Đầu tháng
        const startDate = new Date(y, m - 1, 1);

        // Đầu tháng tiếp theo
        const endDate = new Date(y, m, 1);

        filter.repairDate = {
          $gte: startDate,
          $lt: endDate,
        };
      }
    }

    // =====================================================
    // LỌC THEO MẢNG vehiclePlate
    // =====================================================
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
    // LỌC THEO MẢNG repairUnit
    // =====================================================
    if (repairUnits) {
      let arr = [];

      try {
        arr = JSON.parse(repairUnits);

        if (!Array.isArray(arr)) {
          arr = [];
        }
      } catch {
        arr = [];
      }

      if (arr.length > 0) {
        filter.repairUnit = {
          $in: arr,
        };
      }
    }

    // =====================================================
    // LẤY DỮ LIỆU
    // =====================================================
    const data = await Repair.find(filter).sort({
      repairDate: -1,
    });

    res.json(data);
  } catch (err) {
    res.status(500).json({
      message: err.message,
    });
  }
};

/* =======================
   LẤY DANH SÁCH vehiclePlate DUY NHẤT
======================= */
exports.getUniqueVehiclePlates = async (req, res) => {
  try {
    const vehiclePlates = await Repair.distinct("vehiclePlate");

    vehiclePlates.sort((a, b) =>
      a.localeCompare(b, undefined, {
        sensitivity: "base",
      }),
    );

    res.json(vehiclePlates);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

/* =======================
   LẤY DANH SÁCH repairUnit DUY NHẤT
======================= */
exports.getUniqueRepairUnits = async (req, res) => {
  try {
    const repairUnits = await Repair.distinct("repairUnit");

    repairUnits.sort((a, b) =>
      a.localeCompare(b, undefined, {
        sensitivity: "base",
      }),
    );

    res.json(repairUnits);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

/* =======================
   XOÁ THEO THÁNG / NĂM
   THEO NGÀY SỬA CHỮA
======================= */
exports.removeByMonthYear = async (req, res) => {
  try {
    const { month, year } = req.body;

    const m = Number(month);
    const y = Number(year);

    // =====================================================
    // KIỂM TRA THÁNG / NĂM
    // =====================================================
    if (
      !Number.isInteger(m) ||
      !Number.isInteger(y) ||
      m < 1 ||
      m > 12 ||
      y < 1900 ||
      y > 3000
    ) {
      return res.status(400).json({
        success: false,
        message: "Tháng hoặc năm không hợp lệ",
      });
    }

    // =====================================================
    // ĐẦU THÁNG
    // =====================================================
    const startDate = new Date(y, m - 1, 1);

    // =====================================================
    // ĐẦU THÁNG TIẾP THEO
    // =====================================================
    const endDate = new Date(y, m, 1);

    // =====================================================
    // XOÁ THEO repairDate
    // =====================================================
    const result = await Repair.deleteMany({
      repairDate: {
        $gte: startDate,
        $lt: endDate,
      },
    });

    return res.json({
      success: true,
      deletedCount: result.deletedCount,
      month: m,
      year: y,
      message: `Đã xoá ${result.deletedCount} bản ghi sửa chữa tháng ${String(
        m,
      ).padStart(2, "0")}/${y}`,
    });
  } catch (err) {
    console.error("REMOVE REPAIR BY MONTH YEAR ERROR:", err);

    return res.status(500).json({
      success: false,
      message: err.message,
    });
  }
};

/* =========================================================
   HELPER: LẤY GIÁ TRỊ THỰC TỪ EXCELJS
========================================================= */
const getExcelValue = (cell) => {
  if (!cell) return "";

  let value = cell.value;

  if (value === null || value === undefined) {
    return "";
  }

  // ==========================================
  // STRING / NUMBER / BOOLEAN
  // ==========================================
  if (
    typeof value === "string" ||
    typeof value === "number" ||
    typeof value === "boolean"
  ) {
    return value;
  }

  // ==========================================
  // DATE
  // ==========================================
  if (value instanceof Date) {
    return value;
  }

  // ==========================================
  // RICH TEXT
  //
  // ExcelJS:
  // {
  //   richText: [
  //      { text: "..." },
  //      { text: "..." }
  //   ]
  // }
  // ==========================================
  if (value.richText && Array.isArray(value.richText)) {
    return value.richText.map((item) => item?.text || "").join("");
  }

  // ==========================================
  // FORMULA
  //
  // {
  //   formula: "...",
  //   result: "..."
  // }
  // ==========================================
  if (value.result !== undefined) {
    return getExcelObjectValue(value.result);
  }

  // ==========================================
  // HYPERLINK
  // ==========================================
  if (value.text !== undefined) {
    return getExcelObjectValue(value.text);
  }

  // ==========================================
  // OBJECT KHÁC
  // ==========================================
  return getExcelObjectValue(value);
};

/* =========================================================
   HELPER: XỬ LÝ OBJECT EXCEL
========================================================= */
const getExcelObjectValue = (value) => {
  if (value === null || value === undefined) {
    return "";
  }

  if (
    typeof value === "string" ||
    typeof value === "number" ||
    typeof value === "boolean"
  ) {
    return value;
  }

  if (value instanceof Date) {
    return value;
  }

  // Rich text
  if (value.richText && Array.isArray(value.richText)) {
    return value.richText.map((item) => item?.text || "").join("");
  }

  // Formula
  if (value.result !== undefined) {
    return getExcelObjectValue(value.result);
  }

  // Text
  if (value.text !== undefined) {
    return getExcelObjectValue(value.text);
  }

  // Hyperlink
  if (value.hyperlink !== undefined) {
    return value.text || value.hyperlink || "";
  }

  return String(value);
};

/* =========================================================
   HELPER: CHUYỂN NUMBER
========================================================= */
const toNumber = (value) => {
  if (value === null || value === undefined || value === "") {
    return 0;
  }

  // Nếu object ExcelJS
  value = getExcelObjectValue(value);

  if (value === null || value === undefined || value === "") {
    return 0;
  }

  if (typeof value === "number") {
    return Number.isFinite(value) ? value : 0;
  }

  let str = String(value).trim();

  if (!str) {
    return 0;
  }

  // Bỏ khoảng trắng
  str = str.replace(/\s/g, "");

  // Bỏ ký hiệu tiền
  str = str.replace(/₫/g, "").replace(/đ/gi, "");

  // ==========================================
  // 1.280.000
  // 280.000
  // ==========================================
  if (/^\d{1,3}(\.\d{3})+$/.test(str)) {
    str = str.replace(/\./g, "");
  }

  // ==========================================
  // 1,280,000
  // ==========================================
  else if (/^\d{1,3}(,\d{3})+$/.test(str)) {
    str = str.replace(/,/g, "");
  }

  // ==========================================
  // 123,45
  // ==========================================
  else {
    str = str.replace(",", ".");
  }

  const number = Number(str);

  return Number.isFinite(number) ? number : 0;
};

/* =========================================================
   HELPER: VAT
========================================================= */
const parseVAT = (value) => {
  if (value === null || value === undefined || value === "") {
    return 0;
  }

  value = getExcelObjectValue(value);

  if (value === null || value === undefined || value === "") {
    return 0;
  }

  if (typeof value === "number") {
    if (value > 0 && value < 1) {
      return value * 100;
    }

    return value;
  }

  let str = String(value).trim();

  if (!str) {
    return 0;
  }

  const hasPercent = str.includes("%");

  str = str.replace("%", "").replace(",", ".").trim();

  const number = Number(str);

  if (!Number.isFinite(number)) {
    return 0;
  }

  if (!hasPercent && number > 0 && number < 1) {
    return number * 100;
  }

  return number;
};

/* =========================================================
   HELPER: ĐỌC NGÀY EXCEL
========================================================= */
const parseExcelDate = (value) => {
  if (value === null || value === undefined || value === "") {
    return null;
  }

  // ==========================================
  // OBJECT EXCELJS
  // ==========================================
  if (
    typeof value === "object" &&
    !(value instanceof Date) &&
    !Array.isArray(value)
  ) {
    if (value.result !== undefined) {
      return parseExcelDate(value.result);
    }

    if (value.text !== undefined) {
      return parseExcelDate(value.text);
    }

    if (value.richText && Array.isArray(value.richText)) {
      const text = value.richText.map((item) => item?.text || "").join("");

      return parseExcelDate(text);
    }

    return null;
  }

  // ==========================================
  // DATE
  // ==========================================
  if (value instanceof Date) {
    if (Number.isNaN(value.getTime())) {
      return null;
    }

    return value;
  }

  // ==========================================
  // EXCEL SERIAL DATE
  // Ví dụ:
  // 46342
  // ==========================================
  if (typeof value === "number") {
    if (!Number.isFinite(value)) {
      return null;
    }

    const excelEpoch = new Date(Date.UTC(1899, 11, 30));

    const date = new Date(excelEpoch.getTime() + value * 24 * 60 * 60 * 1000);

    return Number.isNaN(date.getTime()) ? null : date;
  }

  // ==========================================
  // STRING
  // ==========================================
  let str = String(value).trim();

  if (!str) {
    return null;
  }

  str = str.replace(/\s+/g, "");

  // ==========================================
  // DD/MM/YYYY
  //
  // 11/11/2026
  // ==========================================
  let match = str.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);

  if (match) {
    const day = Number(match[1]);
    const month = Number(match[2]);
    const year = Number(match[3]);

    const date = new Date(year, month - 1, day);

    if (
      date.getFullYear() !== year ||
      date.getMonth() !== month - 1 ||
      date.getDate() !== day
    ) {
      return null;
    }

    return date;
  }

  // ==========================================
  // DD-MM-YYYY
  // ==========================================
  match = str.match(/^(\d{1,2})-(\d{1,2})-(\d{4})$/);

  if (match) {
    const day = Number(match[1]);
    const month = Number(match[2]);
    const year = Number(match[3]);

    const date = new Date(year, month - 1, day);

    if (
      date.getFullYear() !== year ||
      date.getMonth() !== month - 1 ||
      date.getDate() !== day
    ) {
      return null;
    }

    return date;
  }

  // ==========================================
  // YYYY-MM-DD
  // ==========================================
  match = str.match(/^(\d{4})-(\d{1,2})-(\d{1,2})$/);

  if (match) {
    const year = Number(match[1]);
    const month = Number(match[2]);
    const day = Number(match[3]);

    const date = new Date(year, month - 1, day);

    if (
      date.getFullYear() !== year ||
      date.getMonth() !== month - 1 ||
      date.getDate() !== day
    ) {
      return null;
    }

    return date;
  }

  // ==========================================
  // ISO / DATE STRING KHÁC
  // ==========================================
  const date = new Date(str);

  if (Number.isNaN(date.getTime())) {
    return null;
  }

  return date;
};

/* =========================================================
   HELPER: LẤY MÃ CUỐI CÙNG CỦA THÁNG / NĂM
========================================================= */
const getNextRepairCode = async (repairDate) => {
  const month = repairDate.getMonth() + 1;
  const year = repairDate.getFullYear();

  const prefix = `SX.${month}.${year}.`;

  const lastRepair = await Repair.findOne({
    repairCode: {
      $regex: `^${prefix}\\d+$`,
    },
  })
    .sort({
      repairCode: -1,
    })
    .select("repairCode")
    .lean();

  let lastNumber = 0;

  if (lastRepair?.repairCode) {
    const match = lastRepair.repairCode.match(
      new RegExp(`^SX\\.${month}\\.${year}\\.(\\d+)$`),
    );

    if (match) {
      lastNumber = Number(match[1]) || 0;
    }
  }

  const nextNumber = lastNumber + 1;

  return `SX.${month}.${year}.${String(nextNumber).padStart(4, "0")}`;
};

/* =========================================================
   IMPORT EXCEL
   LƯU TỪNG DÒNG MỘT
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
        message: "File Excel không có sheet dữ liệu",
      });
    }

    let totalValid = 0;
    let inserted = 0;
    let failed = 0;

    const errors = [];

    /*
      ======================================================
      CỘT EXCEL

      1  - STT
      2  - MÃ SỐ THUẾ
      3  - ĐƠN VỊ SỬA CHỮA
      4  - NGÀY SỬA CHỮA
      5  - BIỂN SỐ XE
      6  - CHI TIẾT SỬA CHỮA
      7  - ĐVT
      8  - SL
      9  - ĐƠN GIÁ
      10 - THÀNH TIỀN
      11 - VAT
      12 - TỔNG CỘNG
      13 - GHI CHÚ
      14 - SỐ HÓA ĐƠN
      15 - NGƯỜI PHỤ TRÁCH
      16 - PHIẾU CHI SỐ
      17 - NGÀY THANH TOÁN
      ======================================================
    */

    for (let i = 2; i <= sheet.rowCount; i++) {
      try {
        const row = sheet.getRow(i);

        /* ================================================
           NGÀY SỬA CHỮA
           ================================================ */

        const repairDateValue = getExcelValue(row.getCell(4));

        const repairDate = parseExcelDate(repairDateValue);

        /*
         * CHỈ TRƯỜNG HỢP KHÔNG CÓ / KHÔNG ĐỌC ĐƯỢC
         * NGÀY SỬA CHỮA THÌ BỎ DÒNG
         */
        if (!repairDate) {
          continue;
        }

        totalValid++;

        /* ================================================
           CÁC TRƯỜNG
           ================================================ */

        const taxCode = getExcelValue(row.getCell(2));

        const repairUnit = getExcelValue(row.getCell(3));

        const vehiclePlate = getExcelValue(row.getCell(5));

        const repairDetails = getExcelValue(row.getCell(6));

        const unit = getExcelValue(row.getCell(7));

        const quantity = toNumber(getExcelValue(row.getCell(8)));

        const unitPrice = toNumber(getExcelValue(row.getCell(9)));

        const totalAmount = toNumber(getExcelValue(row.getCell(10)));

        const vat = parseVAT(getExcelValue(row.getCell(11)));

        const grandTotal = toNumber(getExcelValue(row.getCell(12)));

        const note = getExcelValue(row.getCell(13));

        const invoiceNumber = getExcelValue(row.getCell(14));

        const personInCharge = getExcelValue(row.getCell(15));

        const paymentVoucherNumber = getExcelValue(row.getCell(16));

        const paymentDate = parseExcelDate(getExcelValue(row.getCell(17)));

        /* ================================================
           CHUẨN HÓA STRING
           ================================================ */

        const taxCodeString =
          taxCode === null || taxCode === undefined
            ? ""
            : String(taxCode).trim();

        const repairUnitString =
          repairUnit === null || repairUnit === undefined
            ? ""
            : String(repairUnit).trim();

        const vehiclePlateString =
          vehiclePlate === null || vehiclePlate === undefined
            ? ""
            : String(vehiclePlate).trim();

        const repairDetailsString =
          repairDetails === null || repairDetails === undefined
            ? ""
            : String(repairDetails).trim();

        const unitString =
          unit === null || unit === undefined ? "" : String(unit).trim();

        const noteString =
          note === null || note === undefined ? "" : String(note).trim();

        const invoiceNumberString =
          invoiceNumber === null || invoiceNumber === undefined
            ? ""
            : String(invoiceNumber).trim();

        const personInChargeString =
          personInCharge === null || personInCharge === undefined
            ? ""
            : String(personInCharge).trim();

        const paymentVoucherNumberString =
          paymentVoucherNumber === null || paymentVoucherNumber === undefined
            ? ""
            : String(paymentVoucherNumber).trim();

        /* ================================================
           TẠO MÃ CHO RIÊNG DÒNG NÀY
           ================================================ */

        const repairCode = await getNextRepairCode(repairDate);

        /* ================================================
           TẠO DATA CHO RIÊNG DÒNG NÀY
           ================================================ */

        const repairData = {
          repairCode,

          taxCode: taxCodeString,

          repairUnit: repairUnitString,

          repairDate,

          vehiclePlate: vehiclePlateString,

          repairDetails: repairDetailsString,

          unit: unitString,

          quantity,

          unitPrice,

          totalAmount,

          vat,

          grandTotal,

          note: noteString,

          invoiceNumber: invoiceNumberString,

          personInCharge: personInChargeString,

          paymentVoucherNumber: paymentVoucherNumberString,

          paymentDate,
        };

        /* ================================================
           LƯU NGAY DÒNG NÀY
           ================================================ */

        await Repair.create(repairData);

        inserted++;

        console.log(`Import Repair dòng ${i}: ${repairCode}`);
      } catch (rowError) {
        /*
         * DÒNG NÀY LỖI THÌ CHỈ BỎ DÒNG NÀY
         * KHÔNG ẢNH HƯỞNG CÁC DÒNG SAU
         */

        failed++;

        errors.push({
          row: i,
          message: rowError.message,
        });

        console.error(`Lỗi import Repair dòng ${i}:`, rowError);
      }
    }

    /* ================================================
       RESPONSE
    ================================================ */

    return res.json({
      success: true,

      totalValid,

      inserted,

      failed,

      errors,

      message: `Import hoàn tất: ${inserted} dòng thành công, ${failed} dòng lỗi`,
    });
  } catch (err) {
    console.error("Lỗi import Repair:", err);

    return res.status(500).json({
      message: err.message,
    });
  }
};

/* =========================================================
   CẬP NHẬT CHI PHÍ SỬA XE THEO THÁNG

   FE gửi:
   {
     month: "2026-08"
   }

   NGUỒN:
   Repair
      -> vehiclePlate
      -> repairDate
      -> grandTotal

   LOGIC:
   - FE gửi tháng/năm
   - Tạo mã lợi nhuận: LN.THÁNG.NĂM
   - Chỉ lấy dữ liệu sửa xe trong đúng tháng đó
   - Repair.vehiclePlate đối chiếu VehicleProfit.bsx
   - BSX trong VehicleProfit có thể có thêm text
   - Tách phần BSX thực tế trước khi so khớp
   - Match:
        cộng grandTotal vào cpSuaXe
   - Không match:
        không cộng
   - Dùng $set để chạy nhiều lần không bị cộng trùng
   - VehicleProfit không có dữ liệu sửa xe trong tháng
        => cpSuaXe = 0
========================================================= */

exports.updateVehicleProfitRepair = async (req, res) => {
  try {
    // =====================================================
    // 1. LẤY THÁNG FE GỬI XUỐNG
    // =====================================================

    const { month } = req.body;

    if (!month) {
      return res.status(400).json({
        success: false,
        message: "Vui lòng gửi tháng. Ví dụ: 2026-08",
      });
    }

    const [yearStr, monthStr] = String(month).split("-");

    const year = Number(yearStr);
    const monthNumber = Number(monthStr);

    if (
      !Number.isInteger(year) ||
      !Number.isInteger(monthNumber) ||
      monthNumber < 1 ||
      monthNumber > 12
    ) {
      return res.status(400).json({
        success: false,
        message: "Tháng không hợp lệ. Ví dụ: 2026-08",
      });
    }

    // =====================================================
    // 2. MÃ LỢI NHUẬN
    // =====================================================

    const maLoiNhuan = `LN.${monthNumber}.${year}`;

    // =====================================================
    // 3. NGÀY ĐẦU THÁNG / NGÀY ĐẦU THÁNG SAU
    // =====================================================

    const fromDate = new Date(year, monthNumber - 1, 1);

    const toDate = new Date(year, monthNumber, 1);

    // =====================================================
    // 4. LẤY REPAIR TRONG ĐÚNG THÁNG
    //
    // DÙNG repairDate ĐỂ XÁC ĐỊNH THÁNG
    // =====================================================

    const repairs = await Repair.find({
      repairDate: {
        $gte: fromDate,
        $lt: toDate,
      },

      vehiclePlate: {
        $exists: true,
        $nin: [null, ""],
      },

      grandTotal: {
        $ne: null,
      },
    }).lean();

    // =====================================================
    // 5. CHUẨN HÓA REPAIR
    // =====================================================

    const repairData = [];

    for (const item of repairs) {
      repairData.push({
        _id: item._id,

        vehiclePlate: String(item.vehiclePlate || "")
          .trim()
          .toUpperCase(),

        grandTotal: Number(item.grandTotal),
      });
    }

    // =====================================================
    // 6. HÀM CHUẨN HÓA CHUỖI XE
    //
    // Bỏ:
    // - khoảng trắng
    // - dấu -
    // - dấu .
    //
    // VD:
    //
    // "89H121123"
    // => "89H121123"
    //
    // "89H-121.123"
    // => "89H121123"
    // =====================================================

    const normalizeVehicleNo = (value) => {
      return String(value || "")
        .trim()
        .toUpperCase()
        .replace(/[\s\-–—.]/g, "");
    };

    // =====================================================
    // 7. HÀM LẤY BSX THỰC TẾ TỪ VehicleProfit.bsx
    //
    // VD:
    //
    // "89H121123"
    // => "89H121123"
    //
    // "89H121123 XE CON"
    // => "89H121123"
    //
    // "89H121123 - XE CON"
    // => "89H121123"
    //
    // "89H-121.123 - TEXT"
    // => "89H121123"
    // =====================================================

    const extractBsx = (value) => {
      const raw = String(value || "")
        .trim()
        .toUpperCase();

      if (!raw) {
        return "";
      }

      // ===================================================
      // CHUẨN HÓA DẤU NGĂN CÁCH
      // ===================================================

      const normalized = raw.replace(/[\s\-–—.]/g, "");

      /*
        BSX dạng phổ biến:

        89H121123
        89A16935
        29C12345

        Cho phép:
        2 số
        1-2 chữ
        5-6 số
      */

      const match = normalized.match(/\d{2}[A-Z]{1,2}\d{5,6}/);

      if (match) {
        return match[0];
      }

      // ===================================================
      // FALLBACK
      // ===================================================

      return raw
        .split(/[\s\-–—]+/)[0]
        .replace(/[.\s\-–—]/g, "")
        .trim();
    };

    // =====================================================
    // 8. LẤY VEHICLE PROFIT CỦA ĐÚNG MÃ LỢI NHUẬN
    // =====================================================

    const vehicleProfits = await VehicleProfit.find({
      maLoiNhuan,
    }).lean();

    // =====================================================
    // 9. CHUẨN HÓA BSX VEHICLE PROFIT
    // =====================================================

    const normalizedProfits = vehicleProfits
      .map((profit) => {
        const bsx = extractBsx(profit.bsx);

        return {
          ...profit,
          normalizedBsx: bsx,
        };
      })
      .filter((profit) => profit.normalizedBsx);

    // =====================================================
    // 10. MAP TIỀN THEO VEHICLE PROFIT
    // =====================================================

    const profitMap = new Map();

    let matchedCount = 0;
    let notMatchedCount = 0;

    let matchedAmount = 0;
    let notMatchedAmount = 0;

    // =====================================================
    // 11. DUYỆT TỪNG DÒNG REPAIR
    // =====================================================

    for (const repair of repairData) {
      const vehiclePlate = normalizeVehicleNo(repair.vehiclePlate);

      const grandTotal = Number(repair.grandTotal);

      // ===================================================
      // GRAND TOTAL KHÔNG HỢP LỆ
      // ===================================================

      if (!Number.isFinite(grandTotal)) {
        notMatchedCount++;

        continue;
      }

      // ===================================================
      // KHÔNG CÓ BIỂN SỐ
      // ===================================================

      if (!vehiclePlate) {
        notMatchedCount++;

        notMatchedAmount += grandTotal;

        continue;
      }

      // ===================================================
      // TÌM VEHICLE PROFIT KHỚP BSX
      //
      // vehiclePlate phải chứa BSX thực tế
      // ===================================================

      const matchedProfits = normalizedProfits.filter((profit) => {
        return vehiclePlate.includes(profit.normalizedBsx);
      });

      // ===================================================
      // KHÔNG MATCH
      //
      // => KHÔNG CỘNG TIỀN
      // ===================================================

      if (matchedProfits.length === 0) {
        notMatchedCount++;

        notMatchedAmount += grandTotal;

        continue;
      }

      // ===================================================
      // MATCH
      //
      // => CỘNG grandTotal
      // ===================================================

      const matchedProfit = matchedProfits[0];

      matchedCount++;

      matchedAmount += grandTotal;

      // ===================================================
      // MAP TIỀN VÀO VEHICLE PROFIT
      // ===================================================

      const key = String(matchedProfit._id);

      if (!profitMap.has(key)) {
        profitMap.set(key, {
          id: matchedProfit._id,

          bsx: matchedProfit.bsx,

          maLoiNhuan: matchedProfit.maLoiNhuan,

          amount: 0,
        });
      }

      profitMap.get(key).amount += grandTotal;
    }

    // =====================================================
    // 12. CẬP NHẬT cpSuaXe
    //
    // QUAN TRỌNG:
    //
    // Tất cả VehicleProfit của tháng đều được SET lại.
    //
    // Có sửa xe:
    //    => tổng grandTotal
    //
    // Không có:
    //    => 0
    //
    // Không dùng $inc.
    // =====================================================

    const bulkOps = [];

    for (const item of vehicleProfits) {
      const key = String(item._id);

      const repairAmount = profitMap.get(key)?.amount || 0;

      bulkOps.push({
        updateOne: {
          filter: {
            _id: item._id,
          },

          update: {
            $set: {
              cpSuaXe: repairAmount,
            },
          },
        },
      });
    }

    // =====================================================
    // 13. BULK UPDATE VEHICLE PROFIT
    // =====================================================

    if (bulkOps.length > 0) {
      await VehicleProfit.bulkWrite(bulkOps);
    }

    // =====================================================
    // 14. LOG
    // =====================================================

    console.log("\n=========================================================");

    console.log("📊 CẬP NHẬT CHI PHÍ SỬA XE");

    console.log("=========================================================");

    console.log("Mã lợi nhuận:", maLoiNhuan);

    console.log("Tổng dòng Repair:", repairData.length);

    console.log("Match:", matchedCount);

    console.log("Không match:", notMatchedCount);

    console.log("Tiền match:", matchedAmount.toLocaleString("vi-VN"));

    console.log("Tiền không match:", notMatchedAmount.toLocaleString("vi-VN"));

    console.log(
      "Tổng grandTotal:",
      (matchedAmount + notMatchedAmount).toLocaleString("vi-VN"),
    );

    console.log("VehicleProfit cập nhật:", bulkOps.length);

    console.log("=========================================================\n");

    // =====================================================
    // 15. RESPONSE
    // =====================================================

    return res.json({
      success: true,

      message: `Đã cập nhật chi phí sửa xe ${maLoiNhuan}`,

      maLoiNhuan,

      month,

      totalRepair: repairData.length,

      matchedCount,

      notMatchedCount,

      matchedAmount,

      notMatchedAmount,

      totalAmount: matchedAmount + notMatchedAmount,

      updatedCount: bulkOps.length,

      details: Array.from(profitMap.values()),
    });
  } catch (error) {
    console.error("LỖI UPDATE VEHICLE PROFIT REPAIR:", error);

    return res.status(500).json({
      success: false,

      message: "Lỗi cập nhật chi phí sửa xe vào VehicleProfit",

      error: error.message,
    });
  }
};

/* =========================================================
   LẤY DANH SÁCH CHI PHÍ SỬA XE THEO THÁNG

   FE gửi:
   /vehicle-profit/repair-cost?month=2026-08

   Trả về:
   - _id
   - maLoiNhuan
   - bsx
   - cpSuaXe
========================================================= */
exports.getVehicleRepairCostByMonth = async (req, res) => {
  try {
    const { month } = req.query;

    if (!month) {
      return res.status(400).json({
        message: "Vui lòng gửi tháng",
      });
    }

    // month = 2026-08
    const [year, mon] = month.split("-");

    const y = Number(year);
    const m = Number(mon);

    if (!Number.isInteger(y) || !Number.isInteger(m) || m < 1 || m > 12) {
      return res.status(400).json({
        message: "Tháng không hợp lệ. Ví dụ: 2026-08",
      });
    }

    // Mã lợi nhuận dạng LN.8.2026
    const maLoiNhuan = `LN.${m}.${y}`;

    // =====================================================
    // LẤY VEHICLE PROFIT
    // CHỈ LẤY THÔNG TIN LIÊN QUAN CP SỬA XE
    // =====================================================

    const data = await VehicleProfit.find(
      {
        maLoiNhuan,
      },
      {
        _id: 1,
        maLoiNhuan: 1,
        bsx: 1,
        company: 1,
        cpSuaXe: 1,
      },
    )
      .sort({
        bsx: 1,
      })
      .lean();

    return res.json(data);
  } catch (error) {
    console.error("Lỗi getVehicleRepairCostByMonth:", error);

    return res.status(500).json({
      message: "Lỗi lấy danh sách chi phí sửa xe theo tháng",

      error: error.message,
    });
  }
};
