const ExcelJS = require("exceljs");
const EpassTurn = require("../models/EpassTurn");
const VehicleProfit = require("../models/VehicleProfit");

/* =========================================================
   HELPER: ĐỌC GIÁ TRỊ EXCEL
========================================================= */
const getExcelValue = (cell) => {
  if (!cell) return "";

  let value = cell.value;

  if (value === null || value === undefined) {
    return "";
  }

  // STRING / NUMBER / BOOLEAN
  if (
    typeof value === "string" ||
    typeof value === "number" ||
    typeof value === "boolean"
  ) {
    return value;
  }

  // DATE
  if (value instanceof Date) {
    return value;
  }

  // RICH TEXT
  if (value.richText && Array.isArray(value.richText)) {
    return value.richText.map((item) => item?.text || "").join("");
  }

  // FORMULA
  if (value.result !== undefined) {
    return getExcelObjectValue(value.result);
  }

  // TEXT / HYPERLINK
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

  if (value.richText && Array.isArray(value.richText)) {
    return value.richText.map((item) => item?.text || "").join("");
  }

  if (value.result !== undefined) {
    return getExcelObjectValue(value.result);
  }

  if (value.text !== undefined) {
    return getExcelObjectValue(value.text);
  }

  if (value.hyperlink !== undefined) {
    return value.text || value.hyperlink || "";
  }

  return String(value);
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
   - ISO
========================================================= */
const parseExcelDate = (value) => {
  if (value === null || value === undefined || value === "") {
    return null;
  }

  // OBJECT EXCELJS
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

  // DATE
  if (value instanceof Date) {
    if (Number.isNaN(value.getTime())) {
      return null;
    }

    return value;
  }

  // EXCEL SERIAL DATE
  if (typeof value === "number") {
    if (!Number.isFinite(value)) {
      return null;
    }

    const excelEpoch = new Date(Date.UTC(1899, 11, 30));

    const date = new Date(excelEpoch.getTime() + value * 24 * 60 * 60 * 1000);

    return Number.isNaN(date.getTime()) ? null : date;
  }

  // STRING
  let str = String(value).trim();

  if (!str) {
    return null;
  }

  // Bỏ khoảng trắng thừa
  str = str.replace(/\s+/g, " ");

  /*
     DD/MM/YYYY HH:mm:ss
     DD/MM/YYYY
  */
  let match = str.match(
    /^(\d{1,2})\/(\d{1,2})\/(\d{4})(?:\s+(\d{1,2}):(\d{2})(?::(\d{2}))?)?$/,
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

  /*
     DD-MM-YYYY HH:mm:ss
     DD-MM-YYYY
  */
  match = str.match(
    /^(\d{1,2})-(\d{1,2})-(\d{4})(?:\s+(\d{1,2}):(\d{2})(?::(\d{2}))?)?$/,
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

  /*
     YYYY-MM-DD HH:mm:ss
     YYYY-MM-DD
  */
  match = str.match(
    /^(\d{4})-(\d{1,2})-(\d{1,2})(?:\s+(\d{1,2}):(\d{2})(?::(\d{2}))?)?$/,
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

  /*
     Chuỗi dạng:
     Fri Nov 28 00:00:00 ICT 2025
  */
  const cleaned = str.replace(/\sICT\s/, " ");

  const parsed = new Date(cleaned);

  if (!Number.isNaN(parsed.getTime())) {
    return parsed;
  }

  // ISO / Date string khác
  const fallback = new Date(str);

  if (Number.isNaN(fallback.getTime())) {
    return null;
  }

  return fallback;
};

/* =========================================================
   HELPER: CHUYỂN TIỀN
========================================================= */
const parsePrice = (value) => {
  if (value === null || value === undefined || value === "") {
    return 0;
  }

  value = getExcelObjectValue(value);

  if (typeof value === "number") {
    return Number.isFinite(value) ? value : 0;
  }

  let str = String(value).trim();

  if (!str) {
    return 0;
  }

  str = str.replace(/\s/g, "");
  str = str.replace(/₫/g, "").replace(/đ/gi, "");

  /*
     100.000
     1.280.000
  */
  if (/^\d{1,3}(\.\d{3})+$/.test(str)) {
    str = str.replace(/\./g, "");
  } else if (/^\d{1,3}(,\d{3})+$/.test(str)) {
    /*
     100,000
     1,280,000
  */
    str = str.replace(/,/g, "");
  } else {
    /*
     Trường hợp số bình thường
  */
    str = str.replace(",", ".");
  }

  const number = Number(str);

  return Number.isFinite(number) ? number : 0;
};

/* =========================================================
   GET ALL

   Filter:
   ?bienSoXe=["30A-123","29B-456"]

   Phân trang

   SORT:
   - isDontMatchCP = true lên đầu
   - Sau đó TimeActions mới nhất lên trước
========================================================= */
exports.getAll = async (req, res) => {
  try {
    const page = Math.max(parseInt(req.query.page) || 1, 1);

    const limit = Math.min(parseInt(req.query.limit) || 150, 500);

    const skip = (page - 1) * limit;

    let { bienSoXe } = req.query;

    if (!bienSoXe) {
      bienSoXe = [];
    } else if (typeof bienSoXe === "string") {
      try {
        const parsed = JSON.parse(bienSoXe);

        bienSoXe = Array.isArray(parsed) ? parsed : [bienSoXe];
      } catch {
        bienSoXe = [bienSoXe];
      }
    } else if (!Array.isArray(bienSoXe)) {
      bienSoXe = [];
    }

    const filter = {};

    if (bienSoXe.length > 0) {
      filter.bienSoXe = {
        $in: bienSoXe,
      };
    }

    const [data, total] = await Promise.all([
      EpassTurn.find(filter)
        .sort({
          // true lên trước false
          isDontMatchCP: -1,

          // Trong mỗi nhóm, mới nhất lên trước
          TimeActions: -1,
        })
        .skip(skip)
        .limit(limit)
        .lean(),

      EpassTurn.countDocuments(filter),
    ]);

    res.json({
      data,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    });
  } catch (err) {
    console.error("GET EPASS TURN ERROR:", err);

    res.status(500).json({
      error: err.message,
    });
  }
};

/* =========================================================
   XOÁ THEO THÁNG / NĂM

   body:
   {
     month: 8,
     year: 2026
   }

   XOÁ THEO TimeActions
   = thời gian giao dịch
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

    const result = await EpassTurn.deleteMany({
      TimeActions: {
        $gte: startDate,
        $lt: endDate,
      },
    });

    res.json({
      success: true,
      deletedCount: result.deletedCount,
      month: m,
      year: y,
      message: `Đã xoá ${result.deletedCount} giao dịch Epass tháng ${String(
        m,
      ).padStart(2, "0")}/${y}`,
    });
  } catch (err) {
    console.error("REMOVE EPASS TURN BY MONTH YEAR ERROR:", err);

    res.status(500).json({
      success: false,
      message: err.message,
    });
  }
};

/* =========================================================
   UNIQUE BSX
========================================================= */
exports.getUniqueBsx = async (req, res) => {
  try {
    const bsx = await EpassTurn.distinct("bienSoXe");

    res.json(
      bsx.filter(Boolean).sort((a, b) =>
        String(a).localeCompare(String(b), undefined, {
          sensitivity: "base",
        }),
      ),
    );
  } catch (err) {
    console.error("GET UNIQUE EPASS TURN BSX ERROR:", err);

    res.status(500).json({
      error: err.message,
    });
  }
};

/* =========================================================
   IMPORT EXCEL
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

    /*
       Dòng 1 = header
       Bắt đầu từ dòng 2
    */
    for (let rowNumber = 2; rowNumber <= sheet.rowCount; rowNumber++) {
      try {
        const row = sheet.getRow(rowNumber);

        /*
           Lấy trực tiếp từng cell
           để xử lý được cả formula,
           rich text, date...
        */
        const maGD = getExcelValue(row.getCell(2));

        const TramVao = getExcelValue(row.getCell(3));

        const TimeIn = parseExcelDate(getExcelValue(row.getCell(4)));

        const TramRa = getExcelValue(row.getCell(5));

        const TimeOut = parseExcelDate(getExcelValue(row.getCell(6)));

        const TimeActions = parseExcelDate(getExcelValue(row.getCell(7)));

        const bienSoXe = getExcelValue(row.getCell(8));

        const htThuPhi = getExcelValue(row.getCell(9));

        const loaiVe = getExcelValue(row.getCell(10));

        const price = parsePrice(getExcelValue(row.getCell(11)));

        /*
           Bắt buộc:
           Mã GD + biển số xe
        */
        const maGDString =
          maGD === null || maGD === undefined ? "" : String(maGD).trim();

        const bienSoXeString =
          bienSoXe === null || bienSoXe === undefined
            ? ""
            : String(bienSoXe).trim();

        if (!maGDString || !bienSoXeString) {
          continue;
        }

        totalValid++;

        const otherData = {
          maGD: maGDString,

          TramVao:
            TramVao === null || TramVao === undefined
              ? ""
              : String(TramVao).trim(),

          TimeIn,

          TramRa:
            TramRa === null || TramRa === undefined
              ? ""
              : String(TramRa).trim(),

          TimeOut,

          TimeActions,

          bienSoXe: bienSoXeString,

          htThuPhi:
            htThuPhi === null || htThuPhi === undefined
              ? ""
              : String(htThuPhi).trim(),

          loaiVe:
            loaiVe === null || loaiVe === undefined
              ? ""
              : String(loaiVe).trim(),

          price,
        };

        /*
           QUAN TRỌNG:
           LƯU NGAY TỪNG DÒNG

           Không gom docs rồi insertMany.
        */
        await EpassTurn.create(otherData);

        inserted++;

        console.log(`Import EpassTurn dòng ${rowNumber}: ${maGDString}`);
      } catch (rowError) {
        failed++;

        errors.push({
          row: rowNumber,
          message: rowError.message,
        });

        console.error(`Lỗi import EpassTurn dòng ${rowNumber}:`, rowError);
      }
    }

    return res.json({
      success: true,

      totalValid,

      inserted,

      failed,

      errors,

      message: `Import hoàn tất: ${inserted} dòng thành công, ${failed} dòng lỗi`,
    });
  } catch (err) {
    console.error("IMPORT EPASS TURN ERROR:", err);

    return res.status(500).json({
      success: false,
      message: err.message,
    });
  }
};

/* =========================================================
   CẬP NHẬT CHI PHÍ EPASS LƯỢT VÀO VehicleProfit

   FE gửi:
   {
     month: "2026-08"
   }

   LOGIC:
   - Lấy EpassTurn theo TimeActions đúng tháng
   - Match bienSoXe với VehicleProfit.bsx
   - Match được:
       + Cộng price vào cpEpassTurn
       + isDontMatchCP = false
   - Không match:
       + Không cộng vào VehicleProfit
       + isDontMatchCP = true
   - Dùng $set để chạy lại không bị cộng trùng
========================================================= */

exports.updateVehicleProfitEpassTurn = async (req, res) => {
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
    // 4. LẤY EPASS TURN THEO TimeActions
    // =====================================================

    const epassData = await EpassTurn.find({
      TimeActions: {
        $gte: fromDate,
        $lt: toDate,
      },

      bienSoXe: {
        $exists: true,
        $nin: [null, ""],
      },

      price: {
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

    /*
     * Dùng để cập nhật isDontMatchCP cho từng EpassTurn
     */
    const epassUpdateOps = [];

    let matchedCount = 0;
    let notMatchedCount = 0;

    let matchedAmount = 0;
    let notMatchedAmount = 0;

    // =====================================================
    // 10. DUYỆT TỪNG EPASS TURN
    // =====================================================

    for (const epass of epassData) {
      const bienSoXe = normalizeVehicleNo(epass.bienSoXe);

      const amount = Number(epass.price);

      // -----------------------------------------------------
      // KHÔNG CÓ BSX
      // -----------------------------------------------------

      if (!bienSoXe) {
        notMatchedCount++;

        if (Number.isFinite(amount)) {
          notMatchedAmount += amount;
        }

        epassUpdateOps.push({
          updateOne: {
            filter: {
              _id: epass._id,
            },
            update: {
              $set: {
                isDontMatchCP: true,
              },
            },
          },
        });

        continue;
      }

      // -----------------------------------------------------
      // TIỀN KHÔNG HỢP LỆ
      // -----------------------------------------------------

      if (!Number.isFinite(amount)) {
        notMatchedCount++;

        epassUpdateOps.push({
          updateOne: {
            filter: {
              _id: epass._id,
            },
            update: {
              $set: {
                isDontMatchCP: true,
              },
            },
          },
        });

        continue;
      }

      // -----------------------------------------------------
      // TÌM VEHICLE PROFIT KHỚP BSX
      // -----------------------------------------------------

      const matchedProfits = normalizedProfits.filter((profit) => {
        return bienSoXe.includes(profit.normalizedBsx);
      });

      // -----------------------------------------------------
      // KHÔNG MATCH
      // -----------------------------------------------------

      if (matchedProfits.length === 0) {
        notMatchedCount++;
        notMatchedAmount += amount;

        /*
         * QUAN TRỌNG:
         * EpassTurn này không match BSX nào
         * => isDontMatchCP = true
         */
        epassUpdateOps.push({
          updateOne: {
            filter: {
              _id: epass._id,
            },
            update: {
              $set: {
                isDontMatchCP: true,
              },
            },
          },
        });

        continue;
      }

      // -----------------------------------------------------
      // MATCH
      // -----------------------------------------------------

      const matchedProfit = matchedProfits[0];

      matchedCount++;
      matchedAmount += amount;

      /*
       * EpassTurn match được
       * => isDontMatchCP = false
       */
      epassUpdateOps.push({
        updateOne: {
          filter: {
            _id: epass._id,
          },
          update: {
            $set: {
              isDontMatchCP: false,
            },
          },
        },
      });

      // -----------------------------------------------------
      // CỘNG TIỀN VÀO MAP
      // -----------------------------------------------------

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
    // 11. CẬP NHẬT cpEpassTurn
    // =====================================================

    const vehicleProfitOps = [];

    for (const item of vehicleProfits) {
      const key = String(item._id);

      const epassAmount = profitMap.get(key)?.amount || 0;

      vehicleProfitOps.push({
        updateOne: {
          filter: {
            _id: item._id,
          },

          update: {
            $set: {
              cpEpassTurn: epassAmount,
            },
          },
        },
      });
    }

    // =====================================================
    // 12. CẬP NHẬT EPASS isDontMatchCP
    // =====================================================

    if (epassUpdateOps.length > 0) {
      await EpassTurn.bulkWrite(epassUpdateOps);
    }

    // =====================================================
    // 13. CẬP NHẬT VEHICLE PROFIT
    // =====================================================

    if (vehicleProfitOps.length > 0) {
      await VehicleProfit.bulkWrite(vehicleProfitOps);
    }

    // =====================================================
    // 14. LOG
    // =====================================================

    console.log("\n=========================================================");
    console.log("📊 CẬP NHẬT CHI PHÍ EPASS LƯỢT");
    console.log("=========================================================");

    console.log("Mã lợi nhuận:", maLoiNhuan);

    console.log("Tổng dòng Epass:", epassData.length);

    console.log("Match:", matchedCount);

    console.log("Không match:", notMatchedCount);

    console.log("Tiền match:", matchedAmount.toLocaleString("vi-VN"));

    console.log("Tiền không match:", notMatchedAmount.toLocaleString("vi-VN"));

    console.log("Đã cập nhật isDontMatchCP:", epassUpdateOps.length);

    console.log("=========================================================\n");

    // =====================================================
    // 15. RESPONSE
    // =====================================================

    return res.json({
      success: true,

      message: `Đã cập nhật chi phí Epass lượt ${maLoiNhuan}`,

      maLoiNhuan,

      month,

      totalEpass: epassData.length,

      matchedCount,

      notMatchedCount,

      matchedAmount,

      notMatchedAmount,

      totalAmount: matchedAmount + notMatchedAmount,

      updatedVehicleProfitCount: vehicleProfitOps.length,

      updatedEpassTurnCount: epassUpdateOps.length,

      details: Array.from(profitMap.values()),
    });
  } catch (error) {
    console.error("LỖI UPDATE VEHICLE PROFIT EPASS TURN:", error);

    return res.status(500).json({
      success: false,

      message: "Lỗi cập nhật chi phí Epass lượt vào VehicleProfit",

      error: error.message,
    });
  }
};

/* =========================================================
   LẤY DANH SÁCH VehicleProfit + cpEpassTurn THEO THÁNG

   FE gửi:
   ?month=2026-08

   Trả về:
   - _id
   - maLoiNhuan
   - bsx
   - cpEpassTurn
========================================================= */

exports.getVehicleProfitEpassTurn = async (req, res) => {
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
        company: 1,
        cpEpassTurn: 1,
      },
    )
      .sort({
        bsx: 1,
      })
      .lean();

    return res.json(data);
  } catch (error) {
    console.error("LỖI GET VEHICLE PROFIT EPASS TURN:", error);

    return res.status(500).json({
      message: "Lỗi lấy danh sách chi phí Epass lượt theo tháng",

      error: error.message,
    });
  }
};
