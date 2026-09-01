const ExcelJS = require("exceljs");

const FuelVinhKhuc = require("../models/FuelVinhKhuc");
const FuelNgocLong = require("../models/FuelNgocLong");
const FuelDauNgoai = require("../models/FuelDauNgoai");
const VehicleProfit = require("../models/VehicleProfit");

/* =========================================================
   PARSE NGÀY EXCEL
   HỖ TRỢ:
   - Date object
   - dd/mm/yyyy
   - d/m/yyyy
   - yyyy-mm-dd
   - Excel serial number
   - ExcelJS object
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
    // THỬ PARSE CÁC DẠNG KHÁC
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
function toNumber(value) {
  if (value === null || value === undefined || value === "") {
    return null;
  }

  // ExcelJS object
  if (typeof value === "object") {
    value = value.result ?? value.text ?? null;
  }

  if (typeof value === "number") {
    return isNaN(value) ? null : value;
  }

  if (typeof value !== "string") {
    return null;
  }

  let str = value.trim();

  if (!str) {
    return null;
  }

  // Không có số
  if (!/\d/.test(str)) {
    return null;
  }

  // Quy ước VN:
  // . = phân cách hàng nghìn
  // , = số thập phân
  str = str.replace(/\./g, "").replace(",", ".");

  const num = Number(str);

  return isNaN(num) ? null : num;
}

/* =========================================================
   CHUYỂN EXCELJS VALUE -> STRING
========================================================= */
function toStringValue(value) {
  if (value === null || value === undefined) {
    return "";
  }

  if (typeof value === "object") {
    value = value.text ?? value.result ?? "";
  }

  return String(value || "").trim();
}

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

    const data = await FuelVinhKhuc.findById(id);

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
    // Trạng thái sẽ được hàm cập nhật chi phí theo tháng
    // tính lại sau.

    await data.save();

    res.json({
      success: true,
      message: "Cập nhật dữ liệu thành công",
      data,
    });
  } catch (err) {
    console.error("LỖI UPDATE FUEL VINH KHÚC:", err);

    res.status(500).json({
      success: false,
      message: err.message,
    });
  }
};

/* =========================================================
   LẤY DỮ LIỆU CÓ THÊM FILTER
========================================================= */
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

    // =======================
    // LẤY DATA
    //
    // isDontMatchCP = true
    // => ĐẨY LÊN ĐẦU
    //
    // Sau đó vẫn sort ngày mới nhất trước
    // =======================
    const data = await FuelVinhKhuc.find(filter).sort({
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
   LẤY DANH SÁCH VEHICLENO DUY NHẤT
========================================================= */
exports.getUniqueVehicleNos = async (req, res) => {
  try {
    const vehicleNos = await FuelVinhKhuc.distinct("vehicleNo");

    vehicleNos.sort((a, b) =>
      String(a).localeCompare(String(b), undefined, {
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

    // Đầu tháng
    const startDate = new Date(y, m - 1, 1);

    // Đầu tháng tiếp theo
    const endDate = new Date(y, m, 1);

    const result = await FuelVinhKhuc.deleteMany({
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

    let totalValid = 0;
    let inserted = 0;
    let skipped = 0;
    let skippedDate = 0;

    const bulk = [];

    // =======================
    // DUYỆT TỪNG DÒNG
    // =======================
    for (let i = 2; i <= sheet.rowCount; i++) {
      const row = sheet.getRow(i);

      // =======================
      // 1. NGÀY
      // =======================
      const rawDateFull = row.getCell(1).value;

      const dateFull = parseExcelDate(rawDateFull);

      // =======================
      // 2. NGÀY
      // =======================
      const day = row.getCell(2).value;

      // =======================
      // 3. BIỂN SỐ XE
      // =======================
      const vehicleNo = toStringValue(row.getCell(3).value);

      // Không có biển số => bỏ dòng
      if (!vehicleNo) {
        continue;
      }

      totalValid++;

      // =======================
      // NGÀY KHÔNG HỢP LỆ
      // =======================
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

      // =======================
      // 4. MÃ XE
      // =======================
      const vehicleCode = toStringValue(row.getCell(4).value);

      // =======================
      // 5. SỐ TIỀN
      // =======================
      const amount = toNumber(row.getCell(5).value);

      // =======================
      // 6. SỐ LÍT
      // =======================
      const liter = toNumber(row.getCell(6).value);

      // =======================
      // 7. GIÁ DẦU
      // =======================
      const fuelPrice = toNumber(row.getCell(7).value);

      /*
        Nếu thiếu ngày,
        ngày chạy,
        tiền hoặc lít
        thì bỏ dòng.
      */
      if (!dateFull || day === null || amount === null || liter === null) {
        skipped++;
        continue;
      }

      // =======================
      // 8. GHI CHÚ
      // =======================
      const note = toStringValue(row.getCell(8).value);

      // =======================
      // 9. THÔNG TIN XE
      // =======================
      const infoVehicle = toStringValue(row.getCell(9).value);

      // =======================
      // 10. NƠI ĐỔ DẦU
      // =======================
      const placeFuel = toStringValue(row.getCell(10).value);

      // =======================
      // PAYLOAD
      // =======================
      bulk.push({
        dateFull,

        day: Number(day),

        vehicleNo,

        vehicleCode,

        amount,

        liter,

        fuelPrice,

        note,

        infoVehicle,

        placeFuel,
      });
    }

    // =======================
    // INSERT DATABASE
    // =======================
    if (bulk.length > 0) {
      await FuelVinhKhuc.insertMany(bulk);

      inserted = bulk.length;
    }

    // =======================
    // RESPONSE
    // =======================
    res.json({
      success: true,
      totalValid,
      inserted,
      skipped,
      skippedDate,
    });
  } catch (err) {
    console.error("IMPORT FUEL VINH KHUC ERROR:", err);

    res.status(500).json({
      message: err.message,
    });
  }
};

/* =========================================================
   CẬP NHẬT CHI PHÍ NHIÊN LIỆU THEO THÁNG

   FE gửi:
   {
     month: "2026-08"
   }

   NGUỒN:
   1. FuelVinhKhuc  -> vehicleNo
   2. FuelNgocLong  -> vehiclePlate
   3. FuelDauNgoai  -> vehicleNo

   LOGIC:
   - FE gửi tháng/năm
   - Tạo mã lợi nhuận: LN.THÁNG.NĂM
   - Chỉ lấy dữ liệu nhiên liệu trong đúng tháng đó
   - vehicleNo / vehiclePlate có chứa BSX thì tính
   - BSX trong VehicleProfit có thể có thêm text
   - Tách phần BSX thực tế trước khi so khớp
   - Match:
        isDontMatchCP = false
        cộng amount vào cpNhienLieu
   - Không match:
        isDontMatchCP = true
        không cộng vào cpNhienLieu
   - Chạy lại:
        true -> match được -> false
        false -> không match -> true
   - Tổng amount của cả 3 nguồn
   - Dùng $set để chạy nhiều lần không bị cộng trùng
========================================================= */

exports.updateVehicleProfitFuel = async (req, res) => {
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
    // 4. LẤY 3 NGUỒN NHIÊN LIỆU
    // =====================================================

    const [vinhKhuc, ngocLong, dauNgoai] = await Promise.all([
      FuelVinhKhuc.find({
        dateFull: {
          $gte: fromDate,
          $lt: toDate,
        },

        vehicleNo: {
          $exists: true,
          $nin: [null, ""],
        },

        amount: {
          $ne: null,
        },
      }).lean(),

      FuelNgocLong.find({
        dateFull: {
          $gte: fromDate,
          $lt: toDate,
        },

        vehiclePlate: {
          $exists: true,
          $nin: [null, ""],
        },

        amount: {
          $ne: null,
        },
      }).lean(),

      FuelDauNgoai.find({
        dateFull: {
          $gte: fromDate,
          $lt: toDate,
        },

        vehicleNo: {
          $exists: true,
          $nin: [null, ""],
        },

        amount: {
          $ne: null,
        },
      }).lean(),
    ]);

    // =====================================================
    // 5. CHUẨN HOÁ VỀ 1 MẢNG
    //
    // GIỮ _id ĐỂ UPDATE isDontMatchCP
    // =====================================================

    const fuels = [];

    // -------------------------
    // VĨNH KHÚC
    // -------------------------

    for (const item of vinhKhuc) {
      fuels.push({
        _id: item._id,

        source: "VinhKhuc",

        vehicleNo: String(item.vehicleNo || "")
          .trim()
          .toUpperCase(),

        amount: Number(item.amount),
      });
    }

    // -------------------------
    // NGỌC LONG
    // -------------------------

    for (const item of ngocLong) {
      fuels.push({
        _id: item._id,

        source: "NgocLong",

        vehicleNo: String(item.vehiclePlate || "")
          .trim()
          .toUpperCase(),

        amount: Number(item.amount),
      });
    }

    // -------------------------
    // DẦU NGOÀI
    // -------------------------

    for (const item of dauNgoai) {
      fuels.push({
        _id: item._id,

        source: "DauNgoai",

        vehicleNo: String(item.vehicleNo || "")
          .trim()
          .toUpperCase(),

        amount: Number(item.amount),
      });
    }

    // =====================================================
    // 6. HÀM CHUẨN HOÁ CHUỖI XE
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
    //
    // Nếu không tìm được theo regex thì fallback
    // lấy phần đầu trước text.
    // =====================================================

    const extractBsx = (value) => {
      const raw = String(value || "")
        .trim()
        .toUpperCase();

      if (!raw) {
        return "";
      }

      // Chuẩn hoá dấu ngăn cách
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
      // Nếu không đúng format regex thì lấy phần đầu
      // trước khoảng trắng / dấu -
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
    // 9. CHUẨN HOÁ BSX VEHICLE PROFIT
    //
    // Tạo map để không phải xử lý lại nhiều lần.
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

    const sourceSummary = {
      VinhKhuc: {
        count: 0,
        amount: 0,
        matchedCount: 0,
        matchedAmount: 0,
        notMatchedCount: 0,
        notMatchedAmount: 0,
      },

      NgocLong: {
        count: 0,
        amount: 0,
        matchedCount: 0,
        matchedAmount: 0,
        notMatchedCount: 0,
        notMatchedAmount: 0,
      },

      DauNgoai: {
        count: 0,
        amount: 0,
        matchedCount: 0,
        matchedAmount: 0,
        notMatchedCount: 0,
        notMatchedAmount: 0,
      },
    };

    // =====================================================
    // 11. BULK UPDATE STATUS 3 MODEL
    // =====================================================

    const vinhKhucStatusOps = [];
    const ngocLongStatusOps = [];
    const dauNgoaiStatusOps = [];

    // =====================================================
    // 12. DUYỆT TỪNG DÒNG NHIÊN LIỆU
    // =====================================================

    for (const fuel of fuels) {
      const vehicleNo = normalizeVehicleNo(fuel.vehicleNo);

      const amount = Number(fuel.amount);

      const summary = sourceSummary[fuel.source];

      if (summary) {
        summary.count++;

        if (Number.isFinite(amount)) {
          summary.amount += amount;
        }
      }

      // ===================================================
      // HÀM TẠO STATUS UPDATE
      // ===================================================

      const pushStatusUpdate = (isDontMatchCP) => {
        const updateOp = {
          updateOne: {
            filter: {
              _id: fuel._id,
            },

            update: {
              $set: {
                isDontMatchCP,
              },
            },
          },
        };

        if (fuel.source === "VinhKhuc") {
          vinhKhucStatusOps.push(updateOp);
        } else if (fuel.source === "NgocLong") {
          ngocLongStatusOps.push(updateOp);
        } else if (fuel.source === "DauNgoai") {
          dauNgoaiStatusOps.push(updateOp);
        }
      };

      // ===================================================
      // KHÔNG CÓ BIỂN SỐ
      // ===================================================

      if (!vehicleNo) {
        pushStatusUpdate(true);

        notMatchedCount++;

        if (Number.isFinite(amount)) {
          notMatchedAmount += amount;

          if (summary) {
            summary.notMatchedCount++;
            summary.notMatchedAmount += amount;
          }
        }

        continue;
      }

      // ===================================================
      // AMOUNT KHÔNG HỢP LỆ
      // ===================================================

      if (!Number.isFinite(amount)) {
        pushStatusUpdate(true);

        notMatchedCount++;

        if (summary) {
          summary.notMatchedCount++;
        }

        continue;
      }

      // ===================================================
      // TÌM VEHICLE PROFIT KHỚP BSX
      //
      // vehicleNo phải chứa BSX thực tế
      // =====================================================

      const matchedProfits = normalizedProfits.filter((profit) => {
        return vehicleNo.includes(profit.normalizedBsx);
      });

      // ===================================================
      // KHÔNG MATCH
      //
      // => isDontMatchCP = true
      // => KHÔNG cộng tiền
      // =====================================================

      if (matchedProfits.length === 0) {
        pushStatusUpdate(true);

        notMatchedCount++;
        notMatchedAmount += amount;

        if (summary) {
          summary.notMatchedCount++;
          summary.notMatchedAmount += amount;
        }

        continue;
      }

      // ===================================================
      // MATCH
      //
      // => isDontMatchCP = false
      // => CỘNG TIỀN
      // =====================================================

      pushStatusUpdate(false);

      const matchedProfit = matchedProfits[0];

      matchedCount++;
      matchedAmount += amount;

      if (summary) {
        summary.matchedCount++;
        summary.matchedAmount += amount;
      }

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

      profitMap.get(key).amount += amount;
    }

    // =====================================================
    // 13. CẬP NHẬT isDontMatchCP CHO 3 MODEL
    //
    // Đây chính là phần:
    //
    // match     => false
    // không match => true
    //
    // Chạy lại sẽ tự đồng bộ lại trạng thái.
    // =====================================================

    const statusUpdates = [];

    if (vinhKhucStatusOps.length > 0) {
      statusUpdates.push(FuelVinhKhuc.bulkWrite(vinhKhucStatusOps));
    }

    if (ngocLongStatusOps.length > 0) {
      statusUpdates.push(FuelNgocLong.bulkWrite(ngocLongStatusOps));
    }

    if (dauNgoaiStatusOps.length > 0) {
      statusUpdates.push(FuelDauNgoai.bulkWrite(dauNgoaiStatusOps));
    }

    if (statusUpdates.length > 0) {
      await Promise.all(statusUpdates);
    }

    // =====================================================
    // 14. CẬP NHẬT cpNhienLieu
    //
    // QUAN TRỌNG:
    //
    // Tất cả VehicleProfit của tháng đều được set lại.
    //
    // Có nhiên liệu:
    //    => tổng amount
    //
    // Không có:
    //    => 0
    //
    // Không dùng $inc.
    // =====================================================

    const bulkOps = [];

    for (const item of vehicleProfits) {
      const key = String(item._id);

      const fuelAmount = profitMap.get(key)?.amount || 0;

      bulkOps.push({
        updateOne: {
          filter: {
            _id: item._id,
          },

          update: {
            $set: {
              cpNhienLieu: fuelAmount,
            },
          },
        },
      });
    }

    // =====================================================
    // 15. BULK UPDATE VEHICLE PROFIT
    // =====================================================

    if (bulkOps.length > 0) {
      await VehicleProfit.bulkWrite(bulkOps);
    }

    // =====================================================
    // 16. RESPONSE
    // =====================================================
    console.log("\n=========================================================");
    console.log("📊 KẾT QUẢ CUỐI");
    console.log("=========================================================");

    console.log("Tổng dòng nhiên liệu:", fuels.length);
    console.log("Match:", matchedCount);
    console.log("Không match:", notMatchedCount);

    console.log("\n💰 SOURCE SUMMARY:");

    console.log(
      "Vĩnh Khúc:",
      sourceSummary.VinhKhuc.count,
      "|",
      sourceSummary.VinhKhuc.amount.toLocaleString("vi-VN"),
    );

    console.log(
      "Ngọc Long:",
      sourceSummary.NgocLong.count,
      "|",
      sourceSummary.NgocLong.amount.toLocaleString("vi-VN"),
    );

    console.log(
      "Dầu Ngoài:",
      sourceSummary.DauNgoai.count,
      "|",
      sourceSummary.DauNgoai.amount.toLocaleString("vi-VN"),
    );

    console.log("\n🔥 TỔNG TIỀN MATCH:", matchedAmount + notMatchedAmount);

    console.log("=========================================================\n");

    return res.json({
      success: true,

      message: `Đã cập nhật chi phí nhiên liệu ${maLoiNhuan}`,

      maLoiNhuan,

      month,

      totalFuel: fuels.length,

      vinhKhucCount: vinhKhuc.length,

      ngocLongCount: ngocLong.length,

      dauNgoaiCount: dauNgoai.length,

      // Tổng dòng
      matchedCount,

      notMatchedCount,

      // Tổng tiền
      matchedAmount,

      notMatchedAmount,

      // Tổng tiền của toàn bộ 3 nguồn
      totalAmount: matchedAmount + notMatchedAmount,

      updatedCount: bulkOps.length,

      // Thống kê từng nguồn
      sourceSummary,

      // Chi tiết các VehicleProfit đã nhận tiền
      details: Array.from(profitMap.values()),
    });
  } catch (error) {
    console.error("LỖI UPDATE VEHICLE PROFIT FUEL:", error);

    return res.status(500).json({
      success: false,

      message: "Lỗi cập nhật chi phí nhiên liệu vào VehicleProfit",

      error: error.message,
    });
  }
};

exports.getVehicleProfitByMonth = async (req, res) => {
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

    const data = await VehicleProfit.find(
      {
        maLoiNhuan,
      },
      {
        _id: 1,
        maLoiNhuan: 1,
        bsx: 1,
        company: 1,
        cpNhienLieu: 1,
      },
    )
      .sort({ bsx: 1 })
      .lean();

    return res.json(data);
  } catch (error) {
    console.error("Lỗi getVehicleProfitByMonth:", error);

    return res.status(500).json({
      message: "Lỗi lấy danh sách lợi nhuận theo tháng",
      error: error.message,
    });
  }
};
