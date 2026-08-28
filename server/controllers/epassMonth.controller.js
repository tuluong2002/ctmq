const ExcelJS = require("exceljs");
const EpassMonth = require("../models/EpassMonth");
const VehicleProfit = require("../models/VehicleProfit");

/* =========================================================
   XOÁ THEO THÁNG / NĂM
   body:
   {
     month: 8,
     year: 2026
   }

   LỌC THEO dayBuy = NGÀY MUA
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

    // Đầu tháng
    const startDate = new Date(y, m - 1, 1);

    // Đầu tháng tiếp theo
    const endDate = new Date(y, m, 1);

    // XÓA THEO NGÀY MUA dayBuy
    const result = await EpassMonth.deleteMany({
      dayBuy: {
        $gte: startDate,
        $lt: endDate,
      },
    });

    res.json({
      success: true,
      deletedCount: result.deletedCount,
      month: m,
      year: y,
      message: `Đã xoá ${result.deletedCount} bản ghi Epass có ngày mua trong tháng ${String(
        m,
      ).padStart(2, "0")}/${y}`,
    });
  } catch (err) {
    console.error("REMOVE EPASS BY DAYBUY ERROR:", err);

    res.status(500).json({
      success: false,
      message: err.message,
    });
  }
};

/* =========================================================
   LẤY DANH SÁCH BIỂN SỐ XE DUY NHẤT
========================================================= */
exports.getUniqueBSX = async (req, res) => {
  try {
    const list = await EpassMonth.distinct("bienSoXe");

    list.sort((a, b) =>
      String(a).localeCompare(String(b), undefined, {
        sensitivity: "base",
      }),
    );

    res.json(list);
  } catch (err) {
    console.error("GET UNIQUE EPASS BSX ERROR:", err);

    res.status(500).json({
      message: err.message,
    });
  }
};

/* =========================================================
   LẤY DATA
   FILTER:
   - month = YYYY-MM
   - bienSoXe = JSON ARRAY

   Ví dụ:

   ?month=2026-08
   ?bienSoXe=["30A-123","29B-456"]

   Hoặc:

   ?month=2026-08&bienSoXe=["30A-123","29B-456"]
========================================================= */
exports.getAll = async (req, res) => {
  try {
    const { month, bienSoXe } = req.query;

    const filter = {};

    /* =====================================================
       LỌC THEO THÁNG / NĂM

       Dùng dayBuy làm ngày chính để lọc
    ===================================================== */

    if (month) {
      const [year, mon] = String(month).split("-");

      const y = Number(year);
      const m = Number(mon);

      if (Number.isInteger(y) && Number.isInteger(m) && m >= 1 && m <= 12) {
        const startDate = new Date(y, m - 1, 1);

        const endDate = new Date(y, m, 1);

        filter.dayBuy = {
          $gte: startDate,
          $lt: endDate,
        };
      }
    }

    /* =====================================================
       LỌC THEO BIỂN SỐ XE
    ===================================================== */

    if (bienSoXe) {
      let arr = [];

      try {
        arr = JSON.parse(bienSoXe);

        if (!Array.isArray(arr)) {
          arr = [];
        }
      } catch {
        arr = [];
      }

      if (arr.length > 0) {
        filter.bienSoXe = {
          $in: arr,
        };
      }
    }

    /* =====================================================
       LẤY DATA
    ===================================================== */

    const data = await EpassMonth.find(filter).sort({
      bienSoXe: 1,
      dayFrom: 1,
    });

    res.json(data);
  } catch (err) {
    console.error("GET EPASS ERROR:", err);

    res.status(500).json({
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

  /* TEXT */

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
   HELPER: CHUYỂN SỐ
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
   - Fri Nov 28 00:00:00 ICT 2025
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

    const excelEpoch = new Date(Date.UTC(1899, 11, 30));

    const date = new Date(excelEpoch.getTime() + value * 24 * 60 * 60 * 1000);

    return Number.isNaN(date.getTime()) ? null : date;
  }

  /* =====================================================
     STRING
  ===================================================== */

  let str = String(value).trim();

  if (!str) {
    return null;
  }

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
     DẠNG:
     Fri Nov 28 00:00:00 ICT 2025
  ===================================================== */

  const cleaned = str.replace(/\sICT\s/, " ");

  let date = new Date(cleaned);

  if (!Number.isNaN(date.getTime())) {
    return date;
  }

  /* =====================================================
     ISO / DATE STRING KHÁC
  ===================================================== */

  date = new Date(str);

  if (!Number.isNaN(date.getTime())) {
    return date;
  }

  return null;
};

/* =========================================================
   IMPORT EXCEL

   CỘT:

   1. Biển số xe
   2. Trạm / đoạn
   3. Loại vé
   4. Số tiền
   5. Ngày mua
   6. Từ ngày
   7. Đến ngày

   QUAN TRỌNG:
   LƯU TỪNG DÒNG NGAY
========================================================= */
exports.importExcel = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        message: "Chưa chọn file Excel",
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

    console.log("IMPORT EPASS");

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
           LẤY GIÁ TRỊ
        ================================================= */

        const bienSoXe = getExcelValue(row.getCell(2));

        const tramDoan = getExcelValue(row.getCell(3));

        const loaiVe = getExcelValue(row.getCell(4));

        const moneyAmount = getExcelValue(row.getCell(5));

        const rawDayBuy = getExcelValue(row.getCell(6));

        const rawDayFrom = getExcelValue(row.getCell(7));

        const rawDayTo = getExcelValue(row.getCell(8));

        /* =================================================
           KIỂM TRA DÒNG TRỐNG
        ================================================= */

        const isEmpty = [
          bienSoXe,
          tramDoan,
          loaiVe,
          moneyAmount,
          rawDayBuy,
          rawDayFrom,
          rawDayTo,
        ].every(
          (value) =>
            value === null ||
            value === undefined ||
            String(value).trim() === "",
        );

        if (isEmpty) {
          continue;
        }

        /* =================================================
           BIỂN SỐ + TRẠM
        ================================================= */

        const bienSoXeString = String(bienSoXe ?? "").trim();

        const tramDoanString = String(tramDoan ?? "").trim();

        /*
         * Không có biển số hoặc trạm
         * thì bỏ dòng
         */

        if (!bienSoXeString || !tramDoanString) {
          failed++;

          errors.push({
            row: i,
            message: "Thiếu biển số xe hoặc trạm / đoạn",
          });

          continue;
        }

        /* =================================================
           NGÀY
        ================================================= */

        const dayBuy = parseExcelDate(rawDayBuy);

        const dayFrom = parseExcelDate(rawDayFrom);

        const dayTo = parseExcelDate(rawDayTo);

        /*
         * Nếu có dữ liệu ngày nhưng ngày lỗi
         */

        if (rawDayBuy && !dayBuy) {
          failed++;

          errors.push({
            row: i,
            message: `Ngày mua không hợp lệ: ${String(rawDayBuy)}`,
          });

          continue;
        }

        if (rawDayFrom && !dayFrom) {
          failed++;

          errors.push({
            row: i,
            message: `Từ ngày không hợp lệ: ${String(rawDayFrom)}`,
          });

          continue;
        }

        if (rawDayTo && !dayTo) {
          failed++;

          errors.push({
            row: i,
            message: `Đến ngày không hợp lệ: ${String(rawDayTo)}`,
          });

          continue;
        }

        /* =================================================
           DÒNG HỢP LỆ
        ================================================= */

        totalValid++;

        /* =================================================
           DATA
        ================================================= */

        const epassData = {
          bienSoXe: bienSoXeString,

          tramDoan: tramDoanString,

          loaiVe:
            loaiVe === null || loaiVe === undefined
              ? ""
              : String(loaiVe).trim(),

          moneyAmount: toNumber(moneyAmount),

          dayBuy,

          dayFrom,

          dayTo,
        };

        /* =================================================
           LƯU NGAY DÒNG NÀY
        ================================================= */

        const created = await EpassMonth.create(epassData);

        if (created?._id) {
          inserted++;

          console.log(`✅ Import Epass dòng ${i}`, {
            bienSoXe: bienSoXeString,
            dayFrom,
            dayTo,
          });
        }
      } catch (rowError) {
        failed++;

        errors.push({
          row: i,
          message: rowError.message,
        });

        console.error(`❌ Lỗi import Epass dòng ${i}:`, rowError);
      }
    }

    /* =====================================================
       RESPONSE
    ===================================================== */

    console.log("========================================");

    console.log("IMPORT EPASS HOÀN TẤT");

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
    console.error("IMPORT EPASS ERROR:", err);

    return res.status(500).json({
      success: false,
      message: err.message,
    });
  }
};

/* =========================================================
   CẬP NHẬT CHI PHÍ EPASS THÁNG VÀO VehicleProfit

   FE gửi:
   {
     month: "2026-08"
   }

   LOGIC:
   - Mã lợi nhuận: LN.8.2026
   - Lấy EpassMonth theo dayBuy đúng tháng
   - bienSoXe -> VehicleProfit.bsx
   - moneyAmount -> cpEpassMonth
   - VehicleProfit.bsx có thể chứa thêm text
   - Chuẩn hoá BSX trước khi match
   - Match được thì cộng moneyAmount
   - Không match thì không cộng
   - Dùng $set để chạy lại không bị cộng trùng
========================================================= */

exports.updateVehicleProfitEpassMonth = async (req, res) => {
  try {
    const { month } = req.body;

    // =====================================================
    // 1. KIỂM TRA THÁNG
    // =====================================================

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
    // 3. NGÀY ĐẦU THÁNG / ĐẦU THÁNG SAU
    // =====================================================

    const fromDate = new Date(year, monthNumber - 1, 1);
    const toDate = new Date(year, monthNumber, 1);

    // =====================================================
    // 4. LẤY EPASS THEO dayBuy
    // =====================================================

    const epassData = await EpassMonth.find({
      dayBuy: {
        $gte: fromDate,
        $lt: toDate,
      },

      bienSoXe: {
        $exists: true,
        $nin: [null, ""],
      },

      moneyAmount: {
        $ne: null,
      },
    }).lean();

    // =====================================================
    // 5. LẤY VEHICLE PROFIT CỦA THÁNG
    // =====================================================

    const vehicleProfits = await VehicleProfit.find({
      maLoiNhuan,
    }).lean();

    // =====================================================
    // 6. CHUẨN HOÁ BSX
    // =====================================================

    const normalizeVehicleNo = (value) => {
      return String(value || "")
        .trim()
        .toUpperCase()
        .replace(/[\s\-–—.]/g, "");
    };

    // =====================================================
    // 7. LẤY BSX THỰC TẾ TỪ VehicleProfit.bsx
    //
    // Ví dụ:
    // 89H121123
    // 89H121123 XE CON
    // 89H-121.123 - XE CON
    //
    // => 89H121123
    // =====================================================

    const extractBsx = (value) => {
      const raw = String(value || "")
        .trim()
        .toUpperCase();

      if (!raw) {
        return "";
      }

      const normalized = raw.replace(/[\s\-–—.]/g, "");

      const match = normalized.match(/\d{2}[A-Z]{1,2}\d{5,6}/);

      if (match) {
        return match[0];
      }

      return raw
        .split(/[\s\-–—]+/)[0]
        .replace(/[.\s\-–—]/g, "")
        .trim();
    };

    // =====================================================
    // 8. CHUẨN HOÁ VEHICLE PROFIT
    // =====================================================

    const normalizedProfits = vehicleProfits
      .map((profit) => {
        return {
          ...profit,
          normalizedBsx: extractBsx(profit.bsx),
        };
      })
      .filter((profit) => profit.normalizedBsx);

    // =====================================================
    // 9. MAP TIỀN THEO VEHICLE PROFIT
    // =====================================================

    const profitMap = new Map();

    let matchedCount = 0;
    let notMatchedCount = 0;

    let matchedAmount = 0;
    let notMatchedAmount = 0;

    // =====================================================
    // 10. DUYỆT EPASS
    // =====================================================

    for (const epass of epassData) {
      const bienSoXe = normalizeVehicleNo(epass.bienSoXe);

      const amount = Number(epass.moneyAmount);

      // -----------------------------------------------------
      // Không có BSX
      // -----------------------------------------------------

      if (!bienSoXe) {
        notMatchedCount++;

        if (Number.isFinite(amount)) {
          notMatchedAmount += amount;
        }

        continue;
      }

      // -----------------------------------------------------
      // Tiền không hợp lệ
      // -----------------------------------------------------

      if (!Number.isFinite(amount)) {
        notMatchedCount++;
        continue;
      }

      // -----------------------------------------------------
      // Tìm VehicleProfit khớp BSX
      // -----------------------------------------------------

      const matchedProfits = normalizedProfits.filter((profit) => {
        return bienSoXe.includes(profit.normalizedBsx);
      });

      // -----------------------------------------------------
      // Không match
      // -----------------------------------------------------

      if (matchedProfits.length === 0) {
        notMatchedCount++;
        notMatchedAmount += amount;

        continue;
      }

      // -----------------------------------------------------
      // MATCH
      // -----------------------------------------------------

      const matchedProfit = matchedProfits[0];

      matchedCount++;
      matchedAmount += amount;

      const key = String(matchedProfit._id);

      if (!profitMap.has(key)) {
        profitMap.set(key, {
          id: matchedProfit._id,

          bsx: matchedProfit.bsx,

          maLoiNhuan: matchedProfit.maLoiNhuan,

          amount: 0,
        });
      }

      profitMap.get(key).amount += amount;
    }

    // =====================================================
    // 11. CẬP NHẬT cpEpassMonth
    //
    // TẤT CẢ VehicleProfit CỦA THÁNG ĐƯỢC SET LẠI
    //
    // Có Epass:
    //    => tổng moneyAmount
    //
    // Không có:
    //    => 0
    //
    // Không dùng $inc
    // =====================================================

    const bulkOps = [];

    for (const item of vehicleProfits) {
      const key = String(item._id);

      const epassAmount = profitMap.get(key)?.amount || 0;

      bulkOps.push({
        updateOne: {
          filter: {
            _id: item._id,
          },

          update: {
            $set: {
              cpEpassMonth: epassAmount,
            },
          },
        },
      });
    }

    // =====================================================
    // 12. BULK UPDATE
    // =====================================================

    if (bulkOps.length > 0) {
      await VehicleProfit.bulkWrite(bulkOps);
    }

    // =====================================================
    // 13. LOG
    // =====================================================

    console.log("\n=========================================================");
    console.log("📊 CẬP NHẬT CHI PHÍ EPASS");
    console.log("=========================================================");

    console.log("Mã lợi nhuận:", maLoiNhuan);
    console.log("Tổng dòng Epass:", epassData.length);
    console.log("Match:", matchedCount);
    console.log("Không match:", notMatchedCount);

    console.log("Tiền match:", matchedAmount.toLocaleString("vi-VN"));

    console.log("Tiền không match:", notMatchedAmount.toLocaleString("vi-VN"));

    console.log("=========================================================\n");

    // =====================================================
    // 14. RESPONSE
    // =====================================================

    return res.json({
      success: true,

      message: `Đã cập nhật chi phí Epass ${maLoiNhuan}`,

      maLoiNhuan,

      month,

      totalEpass: epassData.length,

      matchedCount,

      notMatchedCount,

      matchedAmount,

      notMatchedAmount,

      totalAmount: matchedAmount + notMatchedAmount,

      updatedCount: bulkOps.length,

      details: Array.from(profitMap.values()),
    });
  } catch (error) {
    console.error("LỖI UPDATE VEHICLE PROFIT EPASS:", error);

    return res.status(500).json({
      success: false,

      message: "Lỗi cập nhật chi phí Epass vào VehicleProfit",

      error: error.message,
    });
  }
};

/* =========================================================
   LẤY DANH SÁCH VehicleProfit + cpEpassMonth THEO THÁNG

   FE gửi:
   ?month=2026-08

   Trả về:
   - _id
   - maLoiNhuan
   - bsx
   - cpEpassMonth
========================================================= */

exports.getVehicleProfitEpassMonth = async (req, res) => {
  try {
    const { month } = req.query;

    // =====================================================
    // 1. KIỂM TRA THÁNG
    // =====================================================

    if (!month) {
      return res.status(400).json({
        message: "Vui lòng gửi tháng",
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
        message: "Tháng không hợp lệ. Ví dụ: 2026-08",
      });
    }

    // =====================================================
    // 2. MÃ LỢI NHUẬN
    // =====================================================

    const maLoiNhuan = `LN.${monthNumber}.${year}`;

    // =====================================================
    // 3. LẤY DATA
    // =====================================================

    const data = await VehicleProfit.find(
      {
        maLoiNhuan,
      },
      {
        _id: 1,
        maLoiNhuan: 1,
        bsx: 1,
        cpEpassMonth: 1,
      },
    )
      .sort({
        bsx: 1,
      })
      .lean();

    return res.json(data);
  } catch (error) {
    console.error("LỖI GET VEHICLE PROFIT EPASS:", error);

    return res.status(500).json({
      message: "Lỗi lấy danh sách chi phí Epass theo tháng",

      error: error.message,
    });
  }
};
