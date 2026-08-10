const VehicleProfit = require("../models/VehicleProfit");
const VehiclePlate = require("../models/VehiclePlate");
const ScheduleAdmin = require("../models/ScheduleAdmin");
const ExcelJS = require("exceljs");

// =====================================================
// CHUYỂN GIÁ TRỊ SANG NUMBER
// =====================================================
const toNumber = (value) => {
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

  str = str.replace(/\s/g, "");

  if (str.includes(",") && str.includes(".")) {
    if (str.lastIndexOf(",") > str.lastIndexOf(".")) {
      str = str.replace(/\./g, "").replace(",", ".");
    } else {
      str = str.replace(/,/g, "");
    }
  } else if (str.includes(",")) {
    str = str.replace(/,/g, "");
  } else if (str.includes(".")) {
    str = str.replace(/\./g, "");
  }

  const number = Number(str);

  return Number.isFinite(number) ? number : 0;
};

// =====================================================
// CHUẨN HÓA CHUỖI
//
// Dùng để bỏ:
// - khoảng trắng
// - dấu -
// - dấu .
// - dấu /
// - dấu phẩy
// - ký tự đặc biệt
//
// Ví dụ:
//
// "Xe Tiệp 89H-11111"
//       ↓
// "XETIEP89H11111"
// =====================================================
const normalizePlate = (plate) => {
  return String(plate || "")
    .trim()
    .toUpperCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^A-Z0-9]/g, "");
};

// =====================================================
// TÁCH RIÊNG BIỂN SỐ RA KHỎI CHUỖI
//
// Ví dụ:
//
// "Xe Tiệp 89H11111"
//        ↓
// "89H11111"
//
// "xe tiep 89H-11111"
//        ↓
// "89H11111"
//
// "89H11111"
//        ↓
// "89H11111"
//
// "Xe Minh 29A12345"
//        ↓
// "29A12345"
// =====================================================
const extractPlateNumber = (value) => {
  const normalized = normalizePlate(value);

  if (!normalized) {
    return "";
  }

  // Hỗ trợ:
  // 89H11111
  // 89H1111
  // 29A12345
  // 30F99999
  // 29LD12345
  //
  // 2 số đầu
  // + 1 hoặc 2 chữ cái
  // + 4 hoặc 5 số
  const match = normalized.match(/\d{2}[A-Z]{1,2}\d{4,5}/);

  if (!match) {
    return "";
  }

  return match[0];
};

// =====================================================
// LẤY KEY XE
//
// VehiclePlate:
// "Xe Tiệp 89H11111"
//
// ScheduleAdmin:
// "xe tiep 89H11111"
//
// VehicleProfit:
// "Xe Tiệp 89H11111"
//
// Tất cả đều trả:
//
// "89H11111"
// =====================================================
const getVehicleKey = (value) => {
  return extractPlateNumber(value);
};

// =====================================================
// TÌM TẤT CẢ XE CÓ TRONG 1 CHUYẾN
//
// vehiclePlates:
// [
//   "Xe Tiệp 89H11111",
//   "Xe Minh 29A12345",
//   "Xe Hoàng 30F99999"
// ]
//
// bienSoXe:
//
// "xe tiep 89H11111 / xe minh 29A12345"
//
// Kết quả:
//
// [
//   "Xe Tiệp 89H11111",
//   "Xe Minh 29A12345"
// ]
//
// QUAN TRỌNG:
// Không phụ thuộc tên xe trong chuyến phải giống
// tên xe trong VehiclePlate.
// Chỉ cần biển số xuất hiện là nhận diện được.
// =====================================================
const extractPlatesFromTrip = (bienSoXe, vehiclePlates) => {
  const tripNormalized = normalizePlate(bienSoXe);

  if (!tripNormalized) {
    return [];
  }

  const found = new Map();

  for (const vehicle of vehiclePlates) {
    const originalPlate = String(vehicle.plateNumber || "").trim();

    if (!originalPlate) {
      continue;
    }

    const vehicleKey = getVehicleKey(originalPlate);

    if (!vehicleKey) {
      continue;
    }

    // ==========================================
    // BIỂN SỐ CÓ XUẤT HIỆN TRONG CHUYẾN KHÔNG?
    // ==========================================
    if (tripNormalized.includes(vehicleKey)) {
      found.set(vehicleKey, originalPlate);
    }
  }

  return [...found.values()];
};

// =====================================================
// TÍNH DOANH THU PHÂN BỔ CHO TỪNG XE
//
// QUY TẮC:
//
// 1 xe:
// "89H11111"
// doanhThu = 10.000.000
//
// => 89H11111 = 10.000.000
//
// --------------------------------
//
// 2 xe:
// "xe Tiệp 89H11111, xe Minh 29A12345"
// doanhThu = 10.000.000
//
// => mỗi xe = 5.000.000
//
// --------------------------------
//
// 3 xe:
// doanhThu = 12.000.000
//
// => mỗi xe = 4.000.000
//
// --------------------------------
//
// Nếu VehiclePlate lưu:
// "Xe Tiệp 89H11111"
//
// còn ScheduleAdmin lưu:
// "xe tiep 89H11111"
//
// vẫn nhận diện là:
// 89H11111
// =====================================================
const calculateRevenueMap = async (fromDate, toDate) => {
  // ==========================================
  // LẤY TOÀN BỘ XE
  // ==========================================
  const vehicles = await VehiclePlate.find({
    plateNumber: {
      $exists: true,
      $nin: ["", null],
    },
  }).select("plateNumber");

  // ==========================================
  // LẤY TẤT CẢ CHUYẾN TRONG THÁNG
  // ==========================================
  const trips = await ScheduleAdmin.find({
    isDeleted: {
      $ne: true,
    },

    ngayGiaoHang: {
      $gte: fromDate,
      $lt: toDate,
    },

    bienSoXe: {
      $exists: true,
      $nin: ["", null],
    },
  }).select("bienSoXe doanhThu");

  // ==========================================
  // MAP DOANH THU
  //
  // KEY:
  // 89H11111
  //
  // VALUE:
  // Tổng doanh thu được phân bổ
  // ==========================================
  const revenueMap = new Map();

  for (const trip of trips) {
    const tripRevenue = toNumber(trip.doanhThu);

    if (tripRevenue === 0) {
      continue;
    }

    // ========================================
    // TÌM CÁC XE TRONG CHUYẾN
    // ========================================
    const plates = extractPlatesFromTrip(trip.bienSoXe, vehicles);

    if (!plates.length) {
      continue;
    }

    // ========================================
    // CHIA ĐỀU DOANH THU
    // ========================================
    const share = tripRevenue / plates.length;

    for (const plate of plates) {
      const vehicleKey = getVehicleKey(plate);

      if (!vehicleKey) {
        continue;
      }

      const oldRevenue = revenueMap.get(vehicleKey) || 0;

      revenueMap.set(vehicleKey, oldRevenue + share);
    }
  }

  return revenueMap;
};

// =====================================================
// TÁCH THÁNG / NĂM TỪ MÃ LỢI NHUẬN
//
// LN.7.2026
// ↓
// month = 7
// year = 2026
// =====================================================
const parseMaLoiNhuan = (maLoiNhuan) => {
  if (!maLoiNhuan) {
    return null;
  }

  const parts = String(maLoiNhuan).trim().split(".");

  if (parts.length !== 3) {
    return null;
  }

  if (parts[0].toUpperCase() !== "LN") {
    return null;
  }

  const month = Number(parts[1]);
  const year = Number(parts[2]);

  if (!Number.isInteger(month) || !Number.isInteger(year)) {
    return null;
  }

  if (month < 1 || month > 12) {
    return null;
  }

  if (year < 2000 || year > 2100) {
    return null;
  }

  return {
    month,
    year,
  };
};

// =====================================================
// LẤY KHOẢNG THỜI GIAN TỪ MÃ LỢI NHUẬN
// =====================================================
const getDateRangeFromMaLoiNhuan = (maLoiNhuan) => {
  const parsed = parseMaLoiNhuan(maLoiNhuan);

  if (!parsed) {
    return null;
  }

  const { month, year } = parsed;

  return {
    month,
    year,

    fromDate: new Date(year, month - 1, 1),

    toDate: new Date(year, month, 1),

    normalizedMaLoiNhuan: `LN.${month}.${year}`,
  };
};

// =====================================================
// 1. TẠO KỲ LỢI NHUẬN
// =====================================================
exports.createMonthlyProfit = async (req, res) => {
  try {
    const { maLoiNhuan } = req.body;

    const dateRange = getDateRangeFromMaLoiNhuan(maLoiNhuan);

    if (!dateRange) {
      return res.status(400).json({
        success: false,
        message: "Mã lợi nhuận không hợp lệ. Ví dụ: LN.7.2026",
      });
    }

    const { fromDate, toDate, normalizedMaLoiNhuan } = dateRange;

    // ==========================================
    // LẤY TOÀN BỘ XE
    // ==========================================
    const vehicles = await VehiclePlate.find({
      plateNumber: {
        $exists: true,
        $nin: ["", null],
      },
    }).select("plateNumber company vehicleType");

    if (!vehicles.length) {
      return res.status(404).json({
        success: false,
        message: "Không có biển số xe trong hệ thống",
      });
    }

    // ==========================================
    // LẤY BẢN GHI ĐÃ CÓ
    // ==========================================
    const existingProfits = await VehicleProfit.find({
      maLoiNhuan: normalizedMaLoiNhuan,
    }).select("bsx chiPhi doanhThu loiNhuan");

    const existingMap = new Map();

    for (const item of existingProfits) {
      const vehicleKey = getVehicleKey(item.bsx);

      if (vehicleKey) {
        existingMap.set(vehicleKey, item);
      }
    }

    // ==========================================
    // TÍNH DOANH THU TOÀN BỘ XE 1 LẦN
    //
    // Có chia đều xe trong chuyến
    // ==========================================
    const revenueMap = await calculateRevenueMap(fromDate, toDate);

    // ==========================================
    // TẠO BẢN GHI
    // ==========================================
    const bulkOps = [];

    let createdCount = 0;
    let skippedCount = 0;

    for (const vehicle of vehicles) {
      const bsx = String(vehicle.plateNumber || "").trim();

      const vehicleKey = getVehicleKey(bsx);

      if (!vehicleKey) {
        continue;
      }

      // ========================================
      // ĐÃ TỒN TẠI
      // ========================================
      if (existingMap.has(vehicleKey)) {
        skippedCount++;
        continue;
      }

      // ========================================
      // DOANH THU
      // ========================================
      const doanhThu = revenueMap.get(vehicleKey) || 0;

      // ========================================
      // CHI PHÍ BAN ĐẦU = 0
      // ========================================
      const chiPhi = 0;

      const loiNhuan = doanhThu - chiPhi;

      bulkOps.push({
        insertOne: {
          document: {
            // Lưu nguyên giá trị VehiclePlate
            //
            // Ví dụ:
            // "Xe Tiệp 89H11111"
            bsx,

            maLoiNhuan: normalizedMaLoiNhuan,

            doanhThu,

            chiPhi,

            loiNhuan,
          },
        },
      });

      createdCount++;
    }

    if (bulkOps.length > 0) {
      await VehicleProfit.bulkWrite(bulkOps);
    }

    // ==========================================
    // TRẢ KẾT QUẢ
    // ==========================================
    const results = await VehicleProfit.find({
      maLoiNhuan: normalizedMaLoiNhuan,
    }).sort({
      bsx: 1,
    });

    return res.status(201).json({
      success: true,

      message: `Đã tạo kỳ lợi nhuận ${normalizedMaLoiNhuan}`,

      maLoiNhuan: normalizedMaLoiNhuan,

      createdCount,

      skippedCount,

      totalVehicles: results.length,

      data: results,
    });
  } catch (error) {
    console.error("createMonthlyProfit error:", error);

    return res.status(500).json({
      success: false,
      message: "Lỗi khi tạo kỳ lợi nhuận",
      error: error.message,
    });
  }
};

// =====================================================
// 2. CẬP NHẬT CHI PHÍ + TÍNH LẠI LỢI NHUẬN
// =====================================================
exports.updateVehicleProfit = async (req, res) => {
  try {
    const { bsx } = req.params;

    const { maLoiNhuan, chiPhi } = req.body;

    // ==========================================
    // KIỂM TRA BSX
    // ==========================================
    if (!bsx) {
      return res.status(400).json({
        success: false,
        message: "Thiếu biển số xe",
      });
    }

    // ==========================================
    // KIỂM TRA MÃ
    // ==========================================
    const dateRange = getDateRangeFromMaLoiNhuan(maLoiNhuan);

    if (!dateRange) {
      return res.status(400).json({
        success: false,
        message: "Mã lợi nhuận không hợp lệ. Ví dụ: LN.7.2026",
      });
    }

    const { fromDate, toDate, normalizedMaLoiNhuan } = dateRange;

    // ==========================================
    // KIỂM TRA CHI PHÍ
    // ==========================================
    if (chiPhi === undefined || chiPhi === null || chiPhi === "") {
      return res.status(400).json({
        success: false,
        message: "Vui lòng nhập chi phí",
      });
    }

    const parsedChiPhi = toNumber(chiPhi);

    // ==========================================
    // TÌM XE
    //
    // Ưu tiên tìm chính xác.
    //
    // Nếu FE gửi "89H11111"
    // nhưng DB lưu "Xe Tiệp 89H11111"
    // thì tìm theo biển số thực.
    // ==========================================
    let vehicle = await VehiclePlate.findOne({
      plateNumber: bsx.trim(),
    }).select("plateNumber company vehicleType");

    if (!vehicle) {
      const requestedKey = getVehicleKey(bsx);

      if (requestedKey) {
        const vehicles = await VehiclePlate.find({
          plateNumber: {
            $exists: true,
            $nin: ["", null],
          },
        }).select("plateNumber company vehicleType");

        vehicle = vehicles.find(
          (item) => getVehicleKey(item.plateNumber) === requestedKey,
        );
      }
    }

    // ==========================================
    // FALLBACK:
    // Tìm theo biển số nằm trong chuỗi
    // ==========================================
    if (!vehicle) {
      const requestedKey = getVehicleKey(bsx);

      if (requestedKey) {
        const vehicles = await VehiclePlate.find({
          plateNumber: {
            $exists: true,
            $nin: ["", null],
          },
        }).select("plateNumber company vehicleType");

        vehicle = vehicles.find(
          (item) => getVehicleKey(item.plateNumber) === requestedKey,
        );
      }
    }

    if (!vehicle) {
      return res.status(404).json({
        success: false,
        message: "Không tìm thấy biển số xe",
      });
    }

    // ==========================================
    // TÍNH DOANH THU
    // ==========================================
    const revenueMap = await calculateRevenueMap(fromDate, toDate);

    const vehicleKey = getVehicleKey(vehicle.plateNumber);

    const doanhThu = revenueMap.get(vehicleKey) || 0;

    // ==========================================
    // TÍNH LỢI NHUẬN
    // ==========================================
    const loiNhuan = doanhThu - parsedChiPhi;

    // ==========================================
    // UPDATE
    //
    // bsx lưu nguyên giá trị VehiclePlate
    // ==========================================
    const result = await VehicleProfit.findOneAndUpdate(
      {
        maLoiNhuan: normalizedMaLoiNhuan,
      },

      {
        $set: {
          doanhThu,

          chiPhi: parsedChiPhi,

          loiNhuan,
        },
      },

      {
        new: true,
      },
    );

    // ==========================================
    // LƯU Ý:
    //
    // Không tìm bằng bsx ở đây vì FE có thể
    // gửi "89H11111", trong DB lại là
    // "Xe Tiệp 89H11111".
    //
    // Do đó tìm theo vehicleKey.
    // ==========================================
    const existingProfit = await VehicleProfit.findOne({
      maLoiNhuan: normalizedMaLoiNhuan,
    });

    // ==========================================
    // TÌM ĐÚNG BẢN GHI THEO BIỂN SỐ
    // ==========================================
    const profits = await VehicleProfit.find({
      maLoiNhuan: normalizedMaLoiNhuan,
    });

    const profit = profits.find(
      (item) => getVehicleKey(item.bsx) === vehicleKey,
    );

    if (!profit) {
      return res.status(404).json({
        success: false,
        message: "Chưa tạo bản ghi lợi nhuận cho xe này trong kỳ",
      });
    }

    profit.doanhThu = doanhThu;

    profit.chiPhi = parsedChiPhi;

    profit.loiNhuan = loiNhuan;

    await profit.save();

    return res.json({
      success: true,

      message: "Đã cập nhật chi phí và tính lại lợi nhuận",

      data: profit,
    });
  } catch (error) {
    console.error("updateVehicleProfit error:", error);

    return res.status(500).json({
      success: false,
      message: "Lỗi khi cập nhật lợi nhuận",
      error: error.message,
    });
  }
};

// =====================================================
// 3. TÍNH LẠI DOANH THU + LỢI NHUẬN TOÀN BỘ KỲ
// =====================================================
exports.recalculateMonthlyProfit = async (req, res) => {
  try {
    const { maLoiNhuan } = req.body;

    const dateRange = getDateRangeFromMaLoiNhuan(maLoiNhuan);

    if (!dateRange) {
      return res.status(400).json({
        success: false,
        message: "Mã lợi nhuận không hợp lệ. Ví dụ: LN.7.2026",
      });
    }

    const { fromDate, toDate, normalizedMaLoiNhuan } = dateRange;

    // ==========================================
    // LẤY CÁC BẢN GHI
    // ==========================================
    const profits = await VehicleProfit.find({
      maLoiNhuan: normalizedMaLoiNhuan,
    });

    if (!profits.length) {
      return res.status(404).json({
        success: false,
        message: "Chưa có dữ liệu lợi nhuận của kỳ này",
      });
    }

    // ==========================================
    // TÍNH DOANH THU PHÂN BỔ
    //
    // Đây là phần quan trọng:
    //
    // 1 chuyến:
    // 89H11111 + 29A12345
    //
    // 10 triệu
    //
    // => mỗi xe 5 triệu
    // ==========================================
    const revenueMap = await calculateRevenueMap(fromDate, toDate);

    // ==========================================
    // UPDATE TẤT CẢ
    // ==========================================
    const bulkOps = [];

    for (const profit of profits) {
      const vehicleKey = getVehicleKey(profit.bsx);

      const doanhThu = revenueMap.get(vehicleKey) || 0;

      const chiPhi = toNumber(profit.chiPhi);

      const loiNhuan = doanhThu - chiPhi;

      bulkOps.push({
        updateOne: {
          filter: {
            _id: profit._id,
          },

          update: {
            $set: {
              doanhThu,

              // GIỮ NGUYÊN CHI PHÍ
              chiPhi,

              // TÍNH LẠI
              loiNhuan,
            },
          },
        },
      });
    }

    if (bulkOps.length > 0) {
      await VehicleProfit.bulkWrite(bulkOps);
    }

    // ==========================================
    // LẤY KẾT QUẢ
    // ==========================================
    const results = await VehicleProfit.find({
      maLoiNhuan: normalizedMaLoiNhuan,
    }).sort({
      bsx: 1,
    });

    // ==========================================
    // TỔNG
    // ==========================================
    const tongDoanhThu = results.reduce(
      (sum, item) => sum + toNumber(item.doanhThu),
      0,
    );

    const tongChiPhi = results.reduce(
      (sum, item) => sum + toNumber(item.chiPhi),
      0,
    );

    const tongLoiNhuan = results.reduce(
      (sum, item) => sum + toNumber(item.loiNhuan),
      0,
    );

    return res.json({
      success: true,

      message: "Đã tính lại lợi nhuận",

      maLoiNhuan: normalizedMaLoiNhuan,

      totalVehicles: results.length,

      tongDoanhThu,

      tongChiPhi,

      tongLoiNhuan,

      data: results,
    });
  } catch (error) {
    console.error("recalculateMonthlyProfit error:", error);

    return res.status(500).json({
      success: false,
      message: "Lỗi khi tính lại lợi nhuận",
      error: error.message,
    });
  }
};

// =====================================================
// 4. LẤY DANH SÁCH LỢI NHUẬN
// =====================================================
exports.getMonthlyProfit = async (req, res) => {
  try {
    const { maLoiNhuan } = req.query;

    const dateRange = getDateRangeFromMaLoiNhuan(maLoiNhuan);

    if (!dateRange) {
      return res.status(400).json({
        success: false,
        message: "Mã lợi nhuận không hợp lệ. Ví dụ: LN.7.2026",
      });
    }

    const { normalizedMaLoiNhuan } = dateRange;

    const results = await VehicleProfit.find({
      maLoiNhuan: normalizedMaLoiNhuan,
    }).sort({
      bsx: 1,
    });

    const tongDoanhThu = results.reduce(
      (sum, item) => sum + toNumber(item.doanhThu),
      0,
    );

    const tongChiPhi = results.reduce(
      (sum, item) => sum + toNumber(item.chiPhi),
      0,
    );

    const tongLoiNhuan = results.reduce(
      (sum, item) => sum + toNumber(item.loiNhuan),
      0,
    );

    return res.json({
      success: true,

      maLoiNhuan: normalizedMaLoiNhuan,

      totalVehicles: results.length,

      tongDoanhThu,

      tongChiPhi,

      tongLoiNhuan,

      data: results,
    });
  } catch (error) {
    console.error("getMonthlyProfit error:", error);

    return res.status(500).json({
      success: false,
      message: "Lỗi lấy danh sách lợi nhuận",
      error: error.message,
    });
  }
};

// =====================================================
// 5. LẤY LỢI NHUẬN CỦA 1 XE
// =====================================================
exports.getVehicleMonthlyProfit = async (req, res) => {
  try {
    const { bsx } = req.params;

    const { maLoiNhuan } = req.query;

    if (!bsx) {
      return res.status(400).json({
        success: false,
        message: "Thiếu biển số xe",
      });
    }

    const dateRange = getDateRangeFromMaLoiNhuan(maLoiNhuan);

    if (!dateRange) {
      return res.status(400).json({
        success: false,
        message: "Mã lợi nhuận không hợp lệ. Ví dụ: LN.7.2026",
      });
    }

    const { normalizedMaLoiNhuan } = dateRange;

    const requestedKey = getVehicleKey(bsx);

    if (!requestedKey) {
      return res.status(400).json({
        success: false,
        message: "Không xác định được biển số xe",
      });
    }

    const results = await VehicleProfit.find({
      maLoiNhuan: normalizedMaLoiNhuan,
    });

    const result = results.find(
      (item) => getVehicleKey(item.bsx) === requestedKey,
    );

    if (!result) {
      return res.status(404).json({
        success: false,
        message: "Xe chưa có dữ liệu lợi nhuận trong kỳ này",
      });
    }

    return res.json({
      success: true,

      data: result,
    });
  } catch (error) {
    console.error("getVehicleMonthlyProfit error:", error);

    return res.status(500).json({
      success: false,
      message: "Lỗi lấy lợi nhuận của xe",
      error: error.message,
    });
  }
};

// =====================================================
// 6. XUẤT EXCEL LỢI NHUẬN THEO THÁNG
// =====================================================
exports.exportMonthlyProfit = async (req, res) => {
  try {
    const { maLoiNhuan } = req.query;

    const dateRange = getDateRangeFromMaLoiNhuan(maLoiNhuan);

    if (!dateRange) {
      return res.status(400).json({
        success: false,
        message: "Mã lợi nhuận không hợp lệ. Ví dụ: LN.7.2026",
      });
    }

    const { normalizedMaLoiNhuan } = dateRange;

    const results = await VehicleProfit.find({
      maLoiNhuan: normalizedMaLoiNhuan,
    }).sort({
      bsx: 1,
    });

    if (!results.length) {
      return res.status(404).json({
        success: false,
        message: `Không có dữ liệu lợi nhuận của kỳ ${normalizedMaLoiNhuan}`,
      });
    }

    // ==========================================
    // TẠO EXCEL
    // ==========================================
    const workbook = new ExcelJS.Workbook();

    const worksheet = workbook.addWorksheet(
      `Lợi nhuận ${normalizedMaLoiNhuan}`,
    );

    // ==========================================
    // TIÊU ĐỀ
    // ==========================================
    worksheet.mergeCells("A1:F1");

    const titleCell = worksheet.getCell("A1");

    titleCell.value = `LỢI NHUẬN THÁNG ${normalizedMaLoiNhuan}`;

    titleCell.font = {
      bold: true,
      size: 16,
    };

    titleCell.alignment = {
      horizontal: "center",
      vertical: "middle",
    };

    worksheet.getRow(1).height = 25;

    // ==========================================
    // HEADER
    // ==========================================
    worksheet.getRow(3).values = [
      "STT",
      "BSX",
      "Doanh thu",
      "Chi phí",
      "Lợi nhuận",
      "Mã LN",
    ];

    const headerRow = worksheet.getRow(3);

    headerRow.font = {
      bold: true,
    };

    headerRow.alignment = {
      horizontal: "center",
      vertical: "middle",
    };

    headerRow.eachCell((cell) => {
      cell.border = {
        top: {
          style: "thin",
        },
        left: {
          style: "thin",
        },
        bottom: {
          style: "thin",
        },
        right: {
          style: "thin",
        },
      };
    });

    // ==========================================
    // DATA
    // ==========================================
    results.forEach((item, index) => {
      const row = worksheet.addRow([
        index + 1,
        item.bsx,
        toNumber(item.doanhThu),
        toNumber(item.chiPhi),
        toNumber(item.loiNhuan),
        item.maLoiNhuan,
      ]);

      row.eachCell((cell) => {
        cell.border = {
          top: {
            style: "thin",
          },
          left: {
            style: "thin",
          },
          bottom: {
            style: "thin",
          },
          right: {
            style: "thin",
          },
        };
      });

      row.getCell(3).numFmt = "#,##0";

      row.getCell(4).numFmt = "#,##0";

      row.getCell(5).numFmt = "#,##0";
    });

    // ==========================================
    // TỔNG
    // ==========================================
    const totalRowNumber = worksheet.rowCount + 1;

    worksheet.mergeCells(`A${totalRowNumber}:B${totalRowNumber}`);

    worksheet.getCell(`A${totalRowNumber}`).value = "TỔNG";

    worksheet.getCell(`C${totalRowNumber}`).value = results.reduce(
      (sum, item) => sum + toNumber(item.doanhThu),
      0,
    );

    worksheet.getCell(`D${totalRowNumber}`).value = results.reduce(
      (sum, item) => sum + toNumber(item.chiPhi),
      0,
    );

    worksheet.getCell(`E${totalRowNumber}`).value = results.reduce(
      (sum, item) => sum + toNumber(item.loiNhuan),
      0,
    );

    const totalRow = worksheet.getRow(totalRowNumber);

    totalRow.font = {
      bold: true,
    };

    totalRow.getCell(3).numFmt = "#,##0";

    totalRow.getCell(4).numFmt = "#,##0";

    totalRow.getCell(5).numFmt = "#,##0";

    totalRow.eachCell((cell) => {
      cell.border = {
        top: {
          style: "thin",
        },
        left: {
          style: "thin",
        },
        bottom: {
          style: "thin",
        },
        right: {
          style: "thin",
        },
      };
    });

    // ==========================================
    // ĐỘ RỘNG
    // ==========================================
    worksheet.getColumn(1).width = 8;
    worksheet.getColumn(2).width = 25;
    worksheet.getColumn(3).width = 18;
    worksheet.getColumn(4).width = 18;
    worksheet.getColumn(5).width = 18;
    worksheet.getColumn(6).width = 20;

    // ==========================================
    // FREEZE
    // ==========================================
    worksheet.views = [
      {
        state: "frozen",
        ySplit: 3,
      },
    ];

    // ==========================================
    // DOWNLOAD
    // ==========================================
    const fileName = `Loi_nhuan_${normalizedMaLoiNhuan}.xlsx`;

    res.setHeader(
      "Content-Type",
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    );

    res.setHeader("Content-Disposition", `attachment; filename="${fileName}"`);

    await workbook.xlsx.write(res);

    res.end();
  } catch (error) {
    console.error("exportMonthlyProfit error:", error);

    return res.status(500).json({
      success: false,
      message: "Lỗi xuất Excel lợi nhuận",
      error: error.message,
    });
  }
};

// =====================================================
// 7. NHẬP CHI PHÍ THEO THÁNG
// =====================================================
exports.importMonthlyCost = async (req, res) => {
  try {
    // ==========================================
    // KIỂM TRA FILE
    // ==========================================
    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: "Vui lòng chọn file Excel",
      });
    }

    // ==========================================
    // ĐỌC EXCEL
    // ==========================================
    const workbook = new ExcelJS.Workbook();

    await workbook.xlsx.load(req.file.buffer);

    const worksheet = workbook.worksheets[0];

    if (!worksheet) {
      return res.status(400).json({
        success: false,
        message: "File Excel không có sheet dữ liệu",
      });
    }

    // ==========================================
    // ĐỌC DỮ LIỆU
    //
    // Dòng 1: tiêu đề
    // Dòng 2: trống
    // Dòng 3: header
    // Dòng 4 trở đi: dữ liệu
    // ==========================================
    const rows = [];

    worksheet.eachRow((row, rowNumber) => {
      if (rowNumber < 4) {
        return;
      }

      // A = STT
      const stt = row.getCell(1).value;

      // B = BSX
      const bsx = String(row.getCell(2).value || "").trim();

      // C = Doanh thu
      const doanhThuExcel = row.getCell(3).value;

      // D = Chi phí
      const chiPhiExcel = row.getCell(4).value;

      // E = Lợi nhuận
      const loiNhuanExcel = row.getCell(5).value;

      // F = Mã LN
      const maLoiNhuan = String(row.getCell(6).value || "").trim();

      // Bỏ dòng trống
      if (!bsx && !maLoiNhuan && chiPhiExcel == null) {
        return;
      }

      rows.push({
        rowNumber,
        stt,
        bsx,
        doanhThuExcel,
        chiPhiExcel,
        loiNhuanExcel,
        maLoiNhuan,
      });
    });

    if (!rows.length) {
      return res.status(400).json({
        success: false,
        message: "Không có dữ liệu để nhập",
      });
    }

    // ==========================================
    // THỐNG KÊ
    // ==========================================
    let updatedCount = 0;
    let skippedCount = 0;

    const skipped = [];

    // ==========================================
    // CACHE MÃ LN
    // ==========================================
    const maLoiNhuanList = [
      ...new Set(rows.map((row) => row.maLoiNhuan).filter(Boolean)),
    ];

    // ==========================================
    // LẤY TẤT CẢ VEHICLE PROFIT
    // ==========================================
    const profits = await VehicleProfit.find({
      maLoiNhuan: {
        $in: maLoiNhuanList,
      },
    });

    // ==========================================
    // MAP:
    //
    // maLoiNhuan + BIỂN SỐ THẬT
    //
    // Ví dụ:
    //
    // LN.7.2026__89H11111
    //
    // Không dùng nguyên chuỗi:
    //
    // LN.7.2026__XE TIEP 89H11111
    // ==========================================
    const profitMap = new Map();

    for (const profit of profits) {
      const vehicleKey = getVehicleKey(profit.bsx);

      if (!vehicleKey) {
        continue;
      }

      const key = `${String(profit.maLoiNhuan).trim()}__${vehicleKey}`;

      profitMap.set(key, profit);
    }

    // ==========================================
    // BULK UPDATE
    // ==========================================
    const bulkOps = [];

    for (const row of rows) {
      const { rowNumber, bsx, chiPhiExcel, maLoiNhuan } = row;

      // ========================================
      // CHECK MÃ LN
      // ========================================
      const dateRange = getDateRangeFromMaLoiNhuan(maLoiNhuan);

      if (!dateRange) {
        skippedCount++;

        skipped.push({
          row: rowNumber,
          bsx,
          maLoiNhuan,
          reason: "Mã lợi nhuận không hợp lệ",
        });

        continue;
      }

      const normalizedMaLoiNhuan = dateRange.normalizedMaLoiNhuan;

      // ========================================
      // CHECK BSX
      // ========================================
      const normalizedBsx = getVehicleKey(bsx);

      if (!normalizedBsx) {
        skippedCount++;

        skipped.push({
          row: rowNumber,
          bsx,
          maLoiNhuan: normalizedMaLoiNhuan,
          reason: "Không xác định được biển số xe",
        });

        continue;
      }

      // ========================================
      // CHECK CHI PHÍ
      // ========================================
      if (
        chiPhiExcel === undefined ||
        chiPhiExcel === null ||
        chiPhiExcel === ""
      ) {
        skippedCount++;

        skipped.push({
          row: rowNumber,
          bsx,
          maLoiNhuan: normalizedMaLoiNhuan,
          reason: "Thiếu chi phí",
        });

        continue;
      }

      const parsedChiPhi = toNumber(chiPhiExcel);

      // ========================================
      // KEY
      // ========================================
      const key = `${normalizedMaLoiNhuan}__${normalizedBsx}`;

      const profit = profitMap.get(key);

      // ========================================
      // KHÔNG TÌM THẤY
      // ========================================
      if (!profit) {
        skippedCount++;

        skipped.push({
          row: rowNumber,
          bsx,
          maLoiNhuan: normalizedMaLoiNhuan,
          reason: "Không tìm thấy xe trong kỳ lợi nhuận",
        });

        continue;
      }

      // ========================================
      // DOANH THU LẤY TỪ DB
      // ========================================
      const doanhThu = toNumber(profit.doanhThu);

      // ========================================
      // TÍNH LẠI LỢI NHUẬN
      // ========================================
      const loiNhuan = doanhThu - parsedChiPhi;

      // ========================================
      // UPDATE
      // ========================================
      bulkOps.push({
        updateOne: {
          filter: {
            _id: profit._id,
          },

          update: {
            $set: {
              chiPhi: parsedChiPhi,

              loiNhuan,
            },
          },
        },
      });

      updatedCount++;
    }

    // ==========================================
    // THỰC HIỆN UPDATE
    // ==========================================
    if (bulkOps.length > 0) {
      await VehicleProfit.bulkWrite(bulkOps);
    }

    // ==========================================
    // LẤY LẠI DATA
    // ==========================================
    const normalizedMaList = maLoiNhuanList
      .map((item) => {
        const dateRange = getDateRangeFromMaLoiNhuan(item);

        return dateRange ? dateRange.normalizedMaLoiNhuan : null;
      })
      .filter(Boolean);

    const results = await VehicleProfit.find({
      maLoiNhuan: {
        $in: normalizedMaList,
      },
    }).sort({
      maLoiNhuan: 1,
      bsx: 1,
    });

    // ==========================================
    // RESPONSE
    // ==========================================
    return res.json({
      success: true,

      message: "Đã nhập chi phí thành công",

      totalRows: rows.length,

      updatedCount,

      skippedCount,

      skipped,

      data: results,
    });
  } catch (error) {
    console.error("importMonthlyCost error:", error);

    return res.status(500).json({
      success: false,
      message: "Lỗi nhập chi phí",
      error: error.message,
    });
  }
};
