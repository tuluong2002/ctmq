const TripPaymentKT = require("../models/TripPaymentKT");
const VehicleProfit = require("../models/VehicleProfit");
const ExcelJS = require("exceljs");

/**
 * =========================================================
 * 📋 LẤY TẤT CẢ + FILTER THÁNG + PHÂN TRANG
 *
 * FE gửi:
 * ?month=2026-08
 *
 * Trả thêm:
 * - monthlyTotalTrips: Số lịch trình trong tháng
 * - monthlyTotalMoney: Tổng tiền lịch trình trong tháng
 * =========================================================
 */
exports.getAllTripPaymentKT = async (req, res) => {
  try {
    const { month, tenLaiXe, bienSoXe, page = 1, limit = 100 } = req.query;

    const filter = {};

    /* =========================================================
       FILTER THÁNG
       month = YYYY-MM
    ========================================================= */

    let fromDate = null;
    let toDate = null;

    if (month) {
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

      // Đầu tháng
      fromDate = new Date(year, monthNumber - 1, 1);

      // Đầu tháng tiếp theo
      toDate = new Date(year, monthNumber, 1);

      filter.ngayThang = {
        $gte: fromDate,
        $lt: toDate,
      };
    }

    /* =========================================================
       TÊN LÁI XE
    ========================================================= */

    if (tenLaiXe) {
      const drivers = Array.isArray(tenLaiXe) ? tenLaiXe : [tenLaiXe];

      if (drivers.length > 0) {
        filter.tenLaiXe = {
          $in: drivers,
        };
      }
    }

    /* =========================================================
       BIỂN SỐ XE
    ========================================================= */

    if (bienSoXe) {
      const plates = Array.isArray(bienSoXe) ? bienSoXe : [bienSoXe];

      if (plates.length > 0) {
        filter.bienSoXe = {
          $in: plates,
        };
      }
    }

    /* =========================================================
       PHÂN TRANG
    ========================================================= */

    const pageNum = Math.max(parseInt(page, 10) || 1, 1);

    const limitNum = Math.max(parseInt(limit, 10) || 100, 1);

    const skip = (pageNum - 1) * limitNum;

    /* =========================================================
       DEBUG
    ========================================================= */

    console.log("=================================");
    console.log("QUERY:", req.query);
    console.log("FILTER:", filter);
    console.log("PAGE:", pageNum);
    console.log("LIMIT:", limitNum);

    /* =========================================================
   QUERY DATA + TOTAL FILTER
    ========================================================= */

    const [data, total] = await Promise.all([
      TripPaymentKT.find(filter)
        .sort({
          // isDontMatchCP = true lên đầu
          isDontMatchCP: -1,

          // Sau đó vẫn giữ nguyên thứ tự ngày
          ngayThang: 1,

          // Cuối cùng giữ thứ tự ổn định
          _id: 1,
        })
        .skip(skip)
        .limit(limitNum)
        .lean(),

      TripPaymentKT.countDocuments(filter),
    ]);

    /* =========================================================
       THỐNG KÊ TOÀN BỘ TRONG THÁNG
       
       Không phụ thuộc:
       - page
       - limit
       - phân trang
       - filter lái xe
       - filter biển số
    ========================================================= */

    let monthlyTotalTrips = 0;
    let monthlyTotalMoney = 0;

    if (fromDate && toDate) {
      const monthlyStats = await TripPaymentKT.aggregate([
        {
          $match: {
            ngayThang: {
              $gte: fromDate,
              $lt: toDate,
            },
          },
        },

        {
          $group: {
            _id: null,

            totalTrips: {
              $sum: 1,
            },

            totalMoney: {
              $sum: {
                $convert: {
                  input: "$totalMoney",
                  to: "double",
                  onError: 0,
                  onNull: 0,
                },
              },
            },
          },
        },
      ]);

      if (monthlyStats.length > 0) {
        monthlyTotalTrips = monthlyStats[0].totalTrips || 0;

        monthlyTotalMoney = monthlyStats[0].totalMoney || 0;
      }
    }

    /* =========================================================
       DEBUG THỐNG KÊ
    ========================================================= */

    console.log("TOTAL:", total);
    console.log("DATA LENGTH:", data.length);
    console.log("MONTHLY TOTAL TRIPS:", monthlyTotalTrips);
    console.log("MONTHLY TOTAL MONEY:", monthlyTotalMoney);

    /* =========================================================
       RESPONSE
    ========================================================= */

    res.json({
      data,

      /* ===============================
         THỐNG KÊ THÁNG
      =============================== */

      monthlyStats: {
        totalTrips: monthlyTotalTrips,
        totalMoney: monthlyTotalMoney,
      },

      /* ===============================
         PHÂN TRANG
      =============================== */

      pagination: {
        total,
        page: pageNum,
        limit: limitNum,
        totalPages: Math.ceil(total / limitNum),
      },
    });
  } catch (err) {
    console.error("getAllTripPaymentKT:", err);

    res.status(500).json({
      message: err.message,
    });
  }
};

/**
 * =========================================================
 * 👨‍✈️ DANH SÁCH TÊN LÁI XE UNIQUE
 * =========================================================
 */
exports.getUniqueDriverNames = async (req, res) => {
  try {
    const data = await TripPaymentKT.distinct("tenLaiXe");

    res.json(data);
  } catch (err) {
    console.error("getUniqueDriverNames:", err);

    res.status(500).json({
      message: err.message,
    });
  }
};

/**
 * =========================================================
 * 🚛 DANH SÁCH BIỂN SỐ XE UNIQUE
 * =========================================================
 */
exports.getUniqueLicensePlates = async (req, res) => {
  try {
    const data = await TripPaymentKT.distinct("bienSoXe");

    res.json(data);
  } catch (err) {
    console.error("getUniqueLicensePlates:", err);

    res.status(500).json({
      message: err.message,
    });
  }
};

/**
 * =========================================================
 * 🗑 XOÁ THEO THÁNG
 *
 * FE gửi:
 * ?month=2026-08
 * =========================================================
 */
exports.deleteByMonth = async (req, res) => {
  try {
    const { month } = req.query;

    /* =========================================================
       KIỂM TRA THÁNG
    ========================================================= */
    if (!month) {
      return res.status(400).json({
        message: "Thiếu month. Ví dụ: 2026-08",
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

    /* =========================================================
       ĐẦU THÁNG
    ========================================================= */
    const fromDate = new Date(year, monthNumber - 1, 1);

    /* =========================================================
       ĐẦU THÁNG TIẾP THEO
    ========================================================= */
    const toDate = new Date(year, monthNumber, 1);

    /* =========================================================
       DELETE
    ========================================================= */
    const result = await TripPaymentKT.deleteMany({
      ngayThang: {
        $gte: fromDate,
        $lt: toDate,
      },
    });

    console.log("=================================");
    console.log("🗑 XOÁ TRIP PAYMENT KT");
    console.log("THÁNG:", month);
    console.log("FROM:", fromDate);
    console.log("TO:", toDate);
    console.log("DELETED:", result.deletedCount);
    console.log("=================================");

    res.json({
      success: true,
      month,
      deleted: result.deletedCount,
    });
  } catch (err) {
    console.error("deleteByMonth:", err);

    res.status(500).json({
      message: err.message,
    });
  }
};

/**
 * =========================================================
 * 📥 IMPORT EXCEL
 *
 * THỨ TỰ CỘT:
 * 1. ngayThang
 * 2. maXe
 * 3. totalMoney
 * 4. bienSoXe
 * 5. tenLaiXe
 * 6. ghiChu
 * =========================================================
 */

/**
 * Đọc ngày từ Excel
 */
const parseExcelDate = (value) => {
  if (value === null || value === undefined || value === "") {
    return null;
  }

  /* =====================================================
     1. EXCELJS TRẢ VỀ DATE
  ===================================================== */
  if (value instanceof Date) {
    if (!isNaN(value.getTime())) {
      return value;
    }

    return null;
  }

  /* =====================================================
     2. EXCEL SERIAL DATE
     Ví dụ:
     46144 -> 2026-05-02
  ===================================================== */
  if (typeof value === "number") {
    if (!Number.isFinite(value)) {
      return null;
    }

    // Excel dùng mốc 1899-12-30
    const excelEpoch = new Date(Date.UTC(1899, 11, 30));

    const date = new Date(excelEpoch.getTime() + value * 24 * 60 * 60 * 1000);

    if (!isNaN(date.getTime())) {
      return date;
    }

    return null;
  }

  /* =====================================================
     3. EXCELJS CÓ THỂ TRẢ OBJECT
     
     Ví dụ formula:
     {
       result: 46144,
       formula: "..."
     }
  ===================================================== */
  if (typeof value === "object") {
    if (value.result !== undefined) {
      return parseExcelDate(value.result);
    }

    if (value.text) {
      return parseExcelDate(value.text);
    }

    return null;
  }

  /* =====================================================
     4. STRING
     
     Xử lý:
     02/05/2026
     02-05-2026
     2026-05-02
  ===================================================== */
  if (typeof value === "string") {
    const str = value.trim();

    if (!str) {
      return null;
    }

    /* YYYY-MM-DD */
    let match = str.match(/^(\d{4})[-/](\d{1,2})[-/](\d{1,2})$/);

    if (match) {
      const year = Number(match[1]);
      const month = Number(match[2]);
      const day = Number(match[3]);

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

    /* DD/MM/YYYY hoặc DD-MM-YYYY */
    match = str.match(/^(\d{1,2})[\/-](\d{1,2})[\/-](\d{4})$/);

    if (match) {
      const day = Number(match[1]);
      const month = Number(match[2]);
      const year = Number(match[3]);

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

    /* Thử parse bình thường */
    const parsed = new Date(str);

    if (!isNaN(parsed.getTime())) {
      return parsed;
    }
  }

  return null;
};

exports.importTripPaymentKTExcel = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        message: "Không có file",
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

    const rows = [];

    let totalRows = 0;
    let validRows = 0;
    let invalidDateRows = 0;

    /* =====================================================
       ĐỌC TỪNG DÒNG
    ===================================================== */
    sheet.eachRow((row, index) => {
      // Bỏ header
      if (index === 1) {
        return;
      }

      totalRows++;

      /* ===================================================
         ĐÚNG THỨ TỰ EXCEL
         
         A = ngayThang
         B = maXe
         C = totalMoney
         D = bienSoXe
         E = tenLaiXe
         F = ghiChu
      =================================================== */

      const ngayThangValue = row.getCell(1).value;

      const maXeValue = row.getCell(2).value;

      const totalMoneyValue = row.getCell(3).value;

      const bienSoXeValue = row.getCell(4).value;

      const tenLaiXeValue = row.getCell(5).value;

      const ghiChuValue = row.getCell(6).value;

      /* ===================================================
         CHUYỂN DỮ LIỆU
      =================================================== */

      const ngayThang = parseExcelDate(ngayThangValue);

      const maXe =
        maXeValue !== null && maXeValue !== undefined
          ? maXeValue.toString().trim()
          : "";

      const bienSoXe =
        bienSoXeValue !== null && bienSoXeValue !== undefined
          ? bienSoXeValue.toString().trim()
          : "";

      const tenLaiXe =
        tenLaiXeValue !== null && tenLaiXeValue !== undefined
          ? tenLaiXeValue.toString().trim()
          : "";

      const ghiChu =
        ghiChuValue !== null && ghiChuValue !== undefined
          ? ghiChuValue.toString().trim()
          : "";

      /* ===================================================
         XỬ LÝ TIỀN
      =================================================== */

      let totalMoney = 0;

      if (
        typeof totalMoneyValue === "number" &&
        Number.isFinite(totalMoneyValue)
      ) {
        totalMoney = totalMoneyValue;
      } else if (
        totalMoneyValue !== null &&
        totalMoneyValue !== undefined &&
        totalMoneyValue !== ""
      ) {
        const moneyString = totalMoneyValue
          .toString()
          .trim()
          .replace(/\s/g, "")
          .replace(/\./g, "")
          .replace(/,/g, "")
          .replace(/[^\d.-]/g, "");

        totalMoney = Number(moneyString);

        if (!Number.isFinite(totalMoney)) {
          totalMoney = 0;
        }
      }

      /* ===================================================
         BỎ DÒNG TRỐNG
      =================================================== */

      if (
        !ngayThang &&
        !maXe &&
        !totalMoney &&
        !bienSoXe &&
        !tenLaiXe &&
        !ghiChu
      ) {
        return;
      }

      /* ===================================================
         KIỂM TRA NGÀY
      =================================================== */

      if (!ngayThang) {
        invalidDateRows++;

        console.warn(`⚠️ Dòng ${index}: Không đọc được ngày`, {
          raw: ngayThangValue,
          type: typeof ngayThangValue,
        });
      }

      /* ===================================================
         PUSH
      =================================================== */

      rows.push({
        ngayThang,
        maXe,
        totalMoney,
        bienSoXe,
        tenLaiXe,
        ghiChu,
      });

      validRows++;
    });

    /* =====================================================
       KHÔNG CÓ DATA
    ===================================================== */

    if (!rows.length) {
      return res.status(400).json({
        message: "Không có dữ liệu để import",
      });
    }

    /* =====================================================
       INSERT
    ===================================================== */

    await TripPaymentKT.insertMany(rows);

    /* =====================================================
       RESPONSE
    ===================================================== */

    res.json({
      success: true,
      inserted: rows.length,
      totalRows,
      validRows,
      invalidDateRows,
    });
  } catch (err) {
    console.error("importTripPaymentKTExcel:", err);

    res.status(500).json({
      message: err.message,
    });
  }
};

/* =========================================================
   CẬP NHẬT CHI PHÍ THANH TOÁN LỊCH TRÌNH VÀO VehicleProfit

   FE gửi:
   {
     month: "2026-08"
   }

   LOGIC:
   - Lấy TripPaymentKT theo ngayThang đúng tháng
   - Match bienSoXe với VehicleProfit.bsx
   - Match được:
       + Cộng totalMoney vào cpThanhToanLichTrinh
       + isDontMatchCP = false
   - Không match:
       + Không cộng vào VehicleProfit
       + isDontMatchCP = true
   - Dùng $set để chạy lại không bị cộng trùng
========================================================= */

exports.updateVehicleProfitThanhToanLichTrinh = async (req, res) => {
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
    // 4. LẤY TRIP PAYMENT KT THEO ngayThang
    // =====================================================

    const tripPaymentData = await TripPaymentKT.find({
      ngayThang: {
        $gte: fromDate,
        $lt: toDate,
      },

      bienSoXe: {
        $exists: true,
        $nin: [null, ""],
      },

      totalMoney: {
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
     * Dùng để cập nhật isDontMatchCP
     * cho từng TripPaymentKT
     */
    const tripPaymentUpdateOps = [];

    let matchedCount = 0;
    let notMatchedCount = 0;

    let matchedAmount = 0;
    let notMatchedAmount = 0;

    // =====================================================
    // 10. DUYỆT TỪNG TRIP PAYMENT KT
    // =====================================================

    for (const item of tripPaymentData) {
      const bienSoXe = normalizeVehicleNo(item.bienSoXe);

      const amount = Number(item.totalMoney);

      // -----------------------------------------------------
      // KHÔNG CÓ BSX
      // -----------------------------------------------------

      if (!bienSoXe) {
        notMatchedCount++;

        if (Number.isFinite(amount)) {
          notMatchedAmount += amount;
        }

        tripPaymentUpdateOps.push({
          updateOne: {
            filter: {
              _id: item._id,
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

        tripPaymentUpdateOps.push({
          updateOne: {
            filter: {
              _id: item._id,
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
         * TripPaymentKT này không match BSX nào
         * => isDontMatchCP = true
         */
        tripPaymentUpdateOps.push({
          updateOne: {
            filter: {
              _id: item._id,
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
       * TripPaymentKT match được
       * => isDontMatchCP = false
       */
      tripPaymentUpdateOps.push({
        updateOne: {
          filter: {
            _id: item._id,
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
    // 11. CẬP NHẬT cpThanhToanLichTrinh
    // =====================================================

    const vehicleProfitOps = [];

    for (const item of vehicleProfits) {
      const key = String(item._id);

      const paymentAmount = profitMap.get(key)?.amount || 0;

      vehicleProfitOps.push({
        updateOne: {
          filter: {
            _id: item._id,
          },

          update: {
            $set: {
              cpThanhToanLichTrinh: paymentAmount,
            },
          },
        },
      });
    }

    // =====================================================
    // 12. CẬP NHẬT TripPaymentKT isDontMatchCP
    // =====================================================

    if (tripPaymentUpdateOps.length > 0) {
      await TripPaymentKT.bulkWrite(tripPaymentUpdateOps);
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
    console.log("📊 CẬP NHẬT CHI PHÍ THANH TOÁN LỊCH TRÌNH");
    console.log("=========================================================");

    console.log("Mã lợi nhuận:", maLoiNhuan);

    console.log("Tổng dòng thanh toán:", tripPaymentData.length);

    console.log("Match:", matchedCount);

    console.log("Không match:", notMatchedCount);

    console.log("Tiền match:", matchedAmount.toLocaleString("vi-VN"));

    console.log("Tiền không match:", notMatchedAmount.toLocaleString("vi-VN"));

    console.log("Đã cập nhật isDontMatchCP:", tripPaymentUpdateOps.length);

    console.log("=========================================================\n");

    // =====================================================
    // 15. RESPONSE
    // =====================================================

    return res.json({
      success: true,

      message: `Đã cập nhật chi phí thanh toán lịch trình ${maLoiNhuan}`,

      maLoiNhuan,

      month,

      totalTripPayment: tripPaymentData.length,

      matchedCount,

      notMatchedCount,

      matchedAmount,

      notMatchedAmount,

      totalAmount: matchedAmount + notMatchedAmount,

      updatedVehicleProfitCount: vehicleProfitOps.length,

      updatedTripPaymentCount: tripPaymentUpdateOps.length,

      details: Array.from(profitMap.values()),
    });
  } catch (error) {
    console.error("LỖI UPDATE VEHICLE PROFIT THANH TOÁN LỊCH TRÌNH:", error);

    return res.status(500).json({
      success: false,

      message: "Lỗi cập nhật chi phí thanh toán lịch trình vào VehicleProfit",

      error: error.message,
    });
  }
};

/* =========================================================
   LẤY DANH SÁCH VehicleProfit + cpThanhToanLichTrinh THEO THÁNG

   FE gửi:
   ?month=2026-08

   Trả về:
   - _id
   - maLoiNhuan
   - bsx
   - cpThanhToanLichTrinh
========================================================= */

exports.getVehicleProfitThanhToanLichTrinh = async (req, res) => {
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
        cpThanhToanLichTrinh: 1,
      },
    )
      .sort({
        bsx: 1,
      })
      .lean();

    return res.json(data);
  } catch (error) {
    console.error("LỖI GET VEHICLE PROFIT THANH TOÁN LỊCH TRÌNH:", error);

    return res.status(500).json({
      message: "Lỗi lấy danh sách chi phí thanh toán lịch trình theo tháng",

      error: error.message,
    });
  }
};
