const ExcelJS = require("exceljs");
const OtherCost = require("../models/OtherCost");

/* =========================================================
   LẤY DỮ LIỆU CÓ FILTER
   - month: YYYY-MM
   - supplier
========================================================= */
exports.getAll = async (req, res) => {
  try {
    const { month, suppliers } = req.query;

    const filter = {};

    /* =====================================================
       LỌC THEO THÁNG / NĂM
       THEO costDate = NGÀY PHÁT SINH
       
       Ví dụ:
       ?month=2026-08
    ===================================================== */
    if (month) {
      const [year, mon] = month.split("-");

      const y = Number(year);
      const m = Number(mon);

      if (Number.isFinite(y) && Number.isFinite(m) && m >= 1 && m <= 12) {
        const startDate = new Date(y, m - 1, 1);

        const endDate = new Date(y, m, 1);

        filter.costDate = {
          $gte: startDate,
          $lt: endDate,
        };
      }
    }

    /* =====================================================
       LỌC THEO ĐƠN VỊ NHÀ CUNG CẤP
    ===================================================== */
    if (suppliers) {
      let arr = [];

      try {
        arr = JSON.parse(suppliers);

        if (!Array.isArray(arr)) {
          arr = [];
        }
      } catch {
        arr = [];
      }

      if (arr.length > 0) {
        filter.supplier = {
          $in: arr,
        };
      }
    }

    /* =====================================================
       LẤY DATA
    ===================================================== */
    const data = await OtherCost.find(filter).sort({
      costDate: -1,
    });

    res.json(data);
  } catch (err) {
    console.error("GET OTHER COST ERROR:", err);

    res.status(500).json({
      message: err.message,
    });
  }
};

/* =========================================================
   LẤY DANH SÁCH NHÀ CUNG CẤP DUY NHẤT
========================================================= */
exports.getUniqueSuppliers = async (req, res) => {
  try {
    const suppliers = await OtherCost.distinct("supplier");

    suppliers.sort((a, b) =>
      String(a).localeCompare(String(b), undefined, {
        sensitivity: "base",
      }),
    );

    res.json(suppliers);
  } catch (err) {
    console.error("GET UNIQUE SUPPLIERS ERROR:", err);

    res.status(500).json({
      message: err.message,
    });
  }
};

/* =========================================================
   XOÁ THEO THÁNG / NĂM
   THEO costDate = NGÀY PHÁT SINH
========================================================= */
exports.removeByMonthYear = async (req, res) => {
  try {
    const { month, year } = req.body;

    const m = Number(month);
    const y = Number(year);

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

    /* =====================================================
       ĐẦU THÁNG
    ===================================================== */
    const startDate = new Date(y, m - 1, 1);

    /* =====================================================
       ĐẦU THÁNG TIẾP THEO
    ===================================================== */
    const endDate = new Date(y, m, 1);

    /* =====================================================
       XOÁ THEO NGÀY PHÁT SINH
    ===================================================== */
    const result = await OtherCost.deleteMany({
      costDate: {
        $gte: startDate,
        $lt: endDate,
      },
    });

    res.json({
      success: true,
      deletedCount: result.deletedCount,
      month: m,
      year: y,
      message: `Đã xoá ${result.deletedCount} bản ghi chi phí khác tháng ${String(
        m,
      ).padStart(2, "0")}/${y}`,
    });
  } catch (err) {
    console.error("REMOVE OTHER COST BY MONTH YEAR ERROR:", err);

    res.status(500).json({
      success: false,
      message: err.message,
    });
  }
};

/* =========================================================
   HELPER: LẤY GIÁ TRỊ THỰC TỪ EXCELJS
========================================================= */
const getExcelValue = (cell) => {
  if (!cell) {
    return "";
  }

  let value = cell.value;

  if (value === null || value === undefined) {
    return "";
  }

  /* STRING / NUMBER / BOOLEAN */
  if (
    typeof value === "string" ||
    typeof value === "number" ||
    typeof value === "boolean"
  ) {
    return value;
  }

  /* DATE */
  if (value instanceof Date) {
    return value;
  }

  /* RICH TEXT */
  if (value.richText && Array.isArray(value.richText)) {
    return value.richText.map((item) => item?.text || "").join("");
  }

  /* FORMULA */
  if (value.result !== undefined) {
    return getExcelObjectValue(value.result);
  }

  /* TEXT / HYPERLINK */
  if (value.text !== undefined) {
    return getExcelObjectValue(value.text);
  }

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

  /* RICH TEXT */
  if (value.richText && Array.isArray(value.richText)) {
    return value.richText.map((item) => item?.text || "").join("");
  }

  /* FORMULA */
  if (value.result !== undefined) {
    return getExcelObjectValue(value.result);
  }

  /* TEXT */
  if (value.text !== undefined) {
    return getExcelObjectValue(value.text);
  }

  /* HYPERLINK */
  if (value.hyperlink !== undefined) {
    return value.text || value.hyperlink || "";
  }

  return String(value);
};

/* =========================================================
   HELPER: CHUYỂN NUMBER
   Hỗ trợ:
   1.280.000
   280.000
   1,280,000
   123,45
========================================================= */
const toNumber = (value) => {
  if (value === null || value === undefined || value === "") {
    return 0;
  }

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

  /* Bỏ khoảng trắng */
  str = str.replace(/\s/g, "");

  /* Bỏ ký hiệu tiền */
  str = str.replace(/₫/g, "").replace(/đ/gi, "");

  /* 1.280.000 */
  if (/^\d{1,3}(\.\d{3})+$/.test(str)) {
    str = str.replace(/\./g, "");
  } else if (/^\d{1,3}(,\d{3})+$/.test(str)) {
    /* 1,280,000 */
    str = str.replace(/,/g, "");
  } else {
    /* 123,45 */
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
   HELPER: TẠO MÃ CHI PHÍ
   CP.tháng.năm.xxxx

   Ví dụ:
   CP.8.2026.0001
   CP.8.2026.0002
========================================================= */
const getNextOtherCostCode = async (costDate) => {
  const month = costDate.getMonth() + 1;

  const year = costDate.getFullYear();

  const prefix = `CP.${month}.${year}.`;

  const lastCost = await OtherCost.findOne({
    costCode: {
      $regex: `^${prefix}\\d+$`,
    },
  })
    .sort({
      costCode: -1,
    })
    .select("costCode")
    .lean();

  let lastNumber = 0;

  if (lastCost?.costCode) {
    const match = lastCost.costCode.match(
      new RegExp(`^CP\\.${month}\\.${year}\\.(\\d+)$`),
    );

    if (match) {
      lastNumber = Number(match[1]) || 0;
    }
  }

  const nextNumber = lastNumber + 1;

  return `CP.${month}.${year}.${String(nextNumber).padStart(4, "0")}`;
};

/* =========================================================
   HELPER: ĐỌC NGÀY EXCEL
   Hỗ trợ:
   - Date
   - Excel serial
   - DD/MM/YYYY
   - DD/MM/YYYY HH:mm:ss
   - DD-MM-YYYY
   - DD-MM-YYYY HH:mm:ss
   - YYYY-MM-DD
   - YYYY-MM-DD HH:mm:ss
   - ISO
========================================================= */
const parseExcelDate = (value) => {
  if (value === null || value === undefined || value === "") {
    return null;
  }

  /* =====================================================
     OBJECT EXCELJS
  ===================================================== */

  if (
    typeof value === "object" &&
    !(value instanceof Date) &&
    !Array.isArray(value)
  ) {
    // Formula
    if (value.result !== undefined) {
      return parseExcelDate(value.result);
    }

    // Text
    if (value.text !== undefined) {
      return parseExcelDate(value.text);
    }

    // Rich text
    if (value.richText && Array.isArray(value.richText)) {
      const text = value.richText.map((item) => item?.text || "").join("");

      return parseExcelDate(text);
    }

    return null;
  }

  /* =====================================================
     DATE OBJECT
  ===================================================== */

  if (value instanceof Date) {
    if (Number.isNaN(value.getTime())) {
      return null;
    }

    return value;
  }

  /* =====================================================
     EXCEL SERIAL DATE
  ===================================================== */

  if (typeof value === "number") {
    if (!Number.isFinite(value)) {
      return null;
    }

    // Excel epoch
    const excelEpoch = new Date(Date.UTC(1899, 11, 30));

    const date = new Date(excelEpoch.getTime() + value * 24 * 60 * 60 * 1000);

    if (Number.isNaN(date.getTime())) {
      return null;
    }

    return date;
  }

  /* =====================================================
     STRING
  ===================================================== */

  let str = String(value).trim();

  if (!str) {
    return null;
  }

  // Bỏ khoảng trắng dư
  str = str.replace(/\s+/g, " ");

  /* =====================================================
     DD/MM/YYYY
     DD/MM/YYYY HH:mm
     DD/MM/YYYY HH:mm:ss
  ===================================================== */

  let match = str.match(
    /^(\d{1,2})\/(\d{1,2})\/(\d{4})(?:\s+(\d{1,2}):(\d{1,2})(?::(\d{1,2}))?)?$/,
  );

  if (match) {
    const day = Number(match[1]);
    const month = Number(match[2]);
    const year = Number(match[3]);

    const hour = Number(match[4] || 0);
    const minute = Number(match[5] || 0);
    const second = Number(match[6] || 0);

    const date = new Date(year, month - 1, day, hour, minute, second);

    if (
      date.getFullYear() !== year ||
      date.getMonth() !== month - 1 ||
      date.getDate() !== day
    ) {
      return null;
    }

    return date;
  }

  /* =====================================================
     DD-MM-YYYY
     DD-MM-YYYY HH:mm
     DD-MM-YYYY HH:mm:ss
  ===================================================== */

  match = str.match(
    /^(\d{1,2})-(\d{1,2})-(\d{4})(?:\s+(\d{1,2}):(\d{1,2})(?::(\d{1,2}))?)?$/,
  );

  if (match) {
    const day = Number(match[1]);
    const month = Number(match[2]);
    const year = Number(match[3]);

    const hour = Number(match[4] || 0);
    const minute = Number(match[5] || 0);
    const second = Number(match[6] || 0);

    const date = new Date(year, month - 1, day, hour, minute, second);

    if (
      date.getFullYear() !== year ||
      date.getMonth() !== month - 1 ||
      date.getDate() !== day
    ) {
      return null;
    }

    return date;
  }

  /* =====================================================
     YYYY-MM-DD
     YYYY-MM-DD HH:mm
     YYYY-MM-DD HH:mm:ss
  ===================================================== */

  match = str.match(
    /^(\d{4})-(\d{1,2})-(\d{1,2})(?:\s+(\d{1,2}):(\d{1,2})(?::(\d{1,2}))?)?$/,
  );

  if (match) {
    const year = Number(match[1]);
    const month = Number(match[2]);
    const day = Number(match[3]);

    const hour = Number(match[4] || 0);
    const minute = Number(match[5] || 0);
    const second = Number(match[6] || 0);

    const date = new Date(year, month - 1, day, hour, minute, second);

    if (
      date.getFullYear() !== year ||
      date.getMonth() !== month - 1 ||
      date.getDate() !== day
    ) {
      return null;
    }

    return date;
  }

  /* =====================================================
     ISO / DATE STRING KHÁC
  ===================================================== */

  const parsed = new Date(str);

  if (!Number.isNaN(parsed.getTime())) {
    return parsed;
  }

  return null;
};

/* =========================================================
   IMPORT EXCEL
   LƯU TỪNG DÒNG MỘT

   CỘT EXCEL:

   1  - MÃ SỐ THUẾ
   2  - ĐƠN VỊ NHÀ CUNG CẤP
   3  - NGÀY PHÁT SINH
   4  - CHI TIẾT CHI PHÍ
   5  - THÀNH TIỀN
   6  - VAT
   7  - TỔNG CỘNG
   8  - GHI CHÚ
   9  - SỐ HÓA ĐƠN
   10 - NGƯỜI PHỤ TRÁCH
   11 - PHIẾU CHI SỐ
   12 - NGÀY THANH TOÁN
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

    console.log("========================================");
    console.log("IMPORT OTHER COST");
    console.log("Sheet:", sheet.name);
    console.log("Số dòng:", sheet.rowCount);
    console.log("========================================");

    /* =====================================================
       DUYỆT TỪNG DÒNG
    ===================================================== */

    for (let i = 2; i <= sheet.rowCount; i++) {
      try {
        const row = sheet.getRow(i);

        /* =================================================
           KIỂM TRA DÒNG TRỐNG
        ================================================= */

        const rowValues = [];

        for (let c = 1; c <= 12; c++) {
          rowValues.push(getExcelValue(row.getCell(c)));
        }

        const isEmptyRow = rowValues.every(
          (value) =>
            value === null ||
            value === undefined ||
            String(value).trim() === "",
        );

        if (isEmptyRow) {
          continue;
        }

        /* =================================================
           1. MÃ SỐ THUẾ
        ================================================= */

        const taxCode = getExcelValue(row.getCell(2));

        /* =================================================
           2. NHÀ CUNG CẤP
        ================================================= */

        const supplier = getExcelValue(row.getCell(3));

        /* =================================================
           3. NGÀY PHÁT SINH
        ================================================= */

        const rawCostDate = getExcelValue(row.getCell(4));

        const costDate = parseExcelDate(rawCostDate);

        console.log(`Dòng ${i} - raw ngày:`, rawCostDate, "=>", costDate);

        /*
         * Không có ngày phát sinh thì KHÔNG lưu
         */
        if (!costDate) {
          failed++;

          errors.push({
            row: i,
            message: `Ngày phát sinh không hợp lệ: ${String(
              rawCostDate || "",
            )}`,
          });

          console.error(`Dòng ${i}: ngày phát sinh không hợp lệ`, rawCostDate);

          continue;
        }

        totalValid++;

        /* =================================================
           4. CHI TIẾT CHI PHÍ
        ================================================= */

        const costDetails = getExcelValue(row.getCell(5));

        /* =================================================
           5. THÀNH TIỀN
        ================================================= */

        const totalAmount = toNumber(getExcelValue(row.getCell(6)));

        /* =================================================
           6. VAT
        ================================================= */

        const vat = parseVAT(getExcelValue(row.getCell(7)));

        /* =================================================
           7. TỔNG CỘNG
        ================================================= */

        const grandTotal = toNumber(getExcelValue(row.getCell(8)));

        /* =================================================
           8. GHI CHÚ
        ================================================= */

        const note = getExcelValue(row.getCell(9));

        /* =================================================
           9. SỐ HÓA ĐƠN
        ================================================= */

        const invoiceNumber = getExcelValue(row.getCell(10));

        /* =================================================
           10. NGƯỜI PHỤ TRÁCH
        ================================================= */

        const personInCharge = getExcelValue(row.getCell(11));

        /* =================================================
           11. PHIẾU CHI SỐ
        ================================================= */

        const paymentVoucherNumber = getExcelValue(row.getCell(12));

        /* =================================================
           12. NGÀY THANH TOÁN
        ================================================= */

        const rawPaymentDate = getExcelValue(row.getCell(13));

        const paymentDate = parseExcelDate(rawPaymentDate);

        /* =================================================
           CHUẨN HÓA STRING
        ================================================= */

        const toStringValue = (value) => {
          if (value === null || value === undefined) {
            return "";
          }

          return String(value).trim();
        };

        const taxCodeString = toStringValue(taxCode);

        const supplierString = toStringValue(supplier);

        const costDetailsString = toStringValue(costDetails);

        const noteString = toStringValue(note);

        const invoiceNumberString = toStringValue(invoiceNumber);

        const personInChargeString = toStringValue(personInCharge);

        const paymentVoucherNumberString = toStringValue(paymentVoucherNumber);

        /* =================================================
           TẠO MÃ CHI PHÍ
           CP.tháng.năm.xxxx

           Ví dụ:
           CP.8.2026.0001
        ================================================= */

        const costCode = await getNextOtherCostCode(costDate);

        /* =================================================
           DATA
        ================================================= */

        const otherCostData = {
          costCode,

          taxCode: taxCodeString,

          supplier: supplierString,

          costDate,

          costDetails: costDetailsString,

          totalAmount,

          vat,

          grandTotal,

          note: noteString,

          invoiceNumber: invoiceNumberString,

          personInCharge: personInChargeString,

          paymentVoucherNumber: paymentVoucherNumberString,

          paymentDate,
        };

        /* =================================================
           LƯU NGAY DÒNG NÀY
        ================================================= */

        const created = await OtherCost.create(otherCostData);

        if (created?._id) {
          inserted++;

          console.log(`✅ Import dòng ${i}: ${costCode}`);
        }
      } catch (rowError) {
        failed++;

        errors.push({
          row: i,
          message: rowError.message,
        });

        console.error(`❌ Lỗi import dòng ${i}:`, rowError);
      }
    }

    /* =====================================================
       RESPONSE
    ===================================================== */

    console.log("========================================");
    console.log("IMPORT HOÀN TẤT");
    console.log("Tổng hợp lệ:", totalValid);
    console.log("Đã lưu:", inserted);
    console.log("Lỗi:", failed);
    console.log("========================================");

    return res.json({
      success: true,

      totalValid,

      inserted,

      failed,

      errors,

      message: `Import hoàn tất: ${inserted} dòng thành công, ${failed} dòng lỗi`,
    });
  } catch (err) {
    console.error("IMPORT OTHER COST ERROR:", err);

    return res.status(500).json({
      success: false,
      message: err.message,
    });
  }
};
