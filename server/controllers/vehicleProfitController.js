const VehicleProfit = require("../models/VehicleProfit");
const VehiclePlate = require("../models/VehiclePlate");
const ScheduleAdmin = require("../models/ScheduleAdmin");

const DoanhThuTong = require("../models/DoanhThuTong");

const ExcelJS = require("exceljs");

// =====================================================
// HELPER
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

  // 1.234.567,89
  if (str.includes(",") && str.includes(".")) {
    if (str.lastIndexOf(",") > str.lastIndexOf(".")) {
      str = str.replace(/\./g, "").replace(",", ".");
    } else {
      // 1,234,567.89
      str = str.replace(/,/g, "");
    }
  }
  // 1,234,567
  else if (str.includes(",")) {
    str = str.replace(/,/g, "");
  }
  // 1.234.567
  else if (str.includes(".")) {
    str = str.replace(/\./g, "");
  }

  const number = Number(str);

  return Number.isFinite(number) ? number : 0;
};

// =====================================================
// HELPER
// TỔNG TOÀN BỘ CHI PHÍ
// =====================================================
const calculateTotalCost = (record) => {
  return (
    toNumber(record.cpLuong) +
    toNumber(record.cpNhienLieu) +
    toNumber(record.cpSuaXe) +
    toNumber(record.cpEpassMonth) +
    toNumber(record.cpEpassTurn) +
    toNumber(record.cpKhauHaoXe) +
    toNumber(record.cpThanhToanLichTrinh)
  );
};

// =====================================================
// HELPER
// TÍNH LẠI LỢI NHUẬN
// =====================================================
const calculateProfit = (record) => {
  const doanhThu = toNumber(record.doanhThu);

  const tongChiPhi = calculateTotalCost(record);

  record.loiNhuan = doanhThu - tongChiPhi;

  return record;
};

// =====================================================
// HELPER
// TỔNG HỢP DOANH THU TỔNG TỪ VEHICLE PROFIT
// =====================================================
const updateDoanhThuTong = async (maLoiNhuan) => {
  const profits = await VehicleProfit.find({
    maLoiNhuan,
  });

  if (!profits.length) {
    return null;
  }

  // ==========================================
  // TỔNG DOANH THU
  // ==========================================
  const tongDoanhThu = profits.reduce(
    (sum, item) => sum + toNumber(item.doanhThu),
    0
  );

  // ==========================================
  // TỔNG CHI PHÍ THEO XE
  // ==========================================
  const tongChiPhiTheoXe = profits.reduce(
    (sum, item) => sum + calculateTotalCost(item),
    0
  );

  // ==========================================
  // CHI PHÍ KHÁC
  //
  // HIỆN TẠI CHƯA CÓ NGUỒN TÍNH
  // => GIỮ GIÁ TRỊ ĐÃ CÓ
  // ==========================================
  const oldTong = await DoanhThuTong.findOne({
    maLoiNhuan,
  });

  const chiPhiKhac = oldTong ? toNumber(oldTong.chiPhiKhac) : 0;

  // ==========================================
  // LỢI NHUẬN
  // ==========================================
  const loiNhuan = tongDoanhThu - tongChiPhiTheoXe - chiPhiKhac;

  // ==========================================
  // UPSERT
  // ==========================================
  const result = await DoanhThuTong.findOneAndUpdate(
    {
      maLoiNhuan,
    },
    {
      $set: {
        maLoiNhuan,
        tongDoanhThu,
        tongChiPhiTheoXe,
        chiPhiKhac,
        loiNhuan,
      },
    },
    {
      new: true,
      upsert: true,
    }
  );

  return result;
};

// =====================================================
// HELPER
// CHUẨN HÓA BIỂN SỐ
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
// HELPER
// TÁCH BIỂN SỐ THẬT
//
// Xe Tiệp 89H-11111
//       ↓
// 89H11111
// =====================================================
const extractPlateNumber = (value) => {
  const normalized = normalizePlate(value);

  if (!normalized) {
    return "";
  }

  const match = normalized.match(/\d{2}[A-Z]{1,2}\d{4,5}/);

  if (!match) {
    return "";
  }

  return match[0];
};

// =====================================================
// HELPER
// KEY XE
// =====================================================
const getVehicleKey = (value) => {
  return extractPlateNumber(value);
};

// =====================================================
// HELPER
// LẤY XE TRONG CHUYẾN
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

    if (tripNormalized.includes(vehicleKey)) {
      found.set(vehicleKey, originalPlate);
    }
  }

  return [...found.values()];
};

// =====================================================
// TÍNH DOANH THU PHÂN BỔ CHO TỪNG XE
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
  // LẤY CHUYẾN
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
  // ==========================================
  const revenueMap = new Map();

  for (const trip of trips) {
    const tripRevenue = toNumber(trip.doanhThu);

    if (tripRevenue === 0) {
      continue;
    }

    const plates = extractPlatesFromTrip(trip.bienSoXe, vehicles);

    if (!plates.length) {
      continue;
    }

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
// HELPER
// TÁCH MÃ LỢI NHUẬN
//
// LN.7.2026
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
// HELPER
// LẤY KHOẢNG THỜI GIAN
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
// HELPER
// TÌM VEHICLE PROFIT THEO BIỂN SỐ
// =====================================================
const findVehicleProfit = async (maLoiNhuan, vehicleKey) => {
  const profits = await VehicleProfit.find({
    maLoiNhuan,
  });

  return profits.find((item) => getVehicleKey(item.bsx) === vehicleKey) || null;
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
    // LẤY XE
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
    // KIỂM TRA BẢN GHI ĐÃ CÓ
    // ==========================================
    const existingProfits = await VehicleProfit.find({
      maLoiNhuan: normalizedMaLoiNhuan,
    }).select(
      "bsx doanhThu loiNhuan cpLuong cpNhienLieu cpSuaXe cpEpassMonth cpEpassTurn cpKhauHaoXe cpThanhToanLichTrinh"
    );

    const existingMap = new Map();

    for (const item of existingProfits) {
      const vehicleKey = getVehicleKey(item.bsx);

      if (vehicleKey) {
        existingMap.set(vehicleKey, item);
      }
    }

    // ==========================================
    // TÍNH DOANH THU
    // ==========================================
    const revenueMap = await calculateRevenueMap(fromDate, toDate);

    // ==========================================
    // TẠO DATA
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
      // ĐÃ CÓ
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
      // CHI PHÍ BAN ĐẦU
      // ========================================
      const cpLuong = 0;
      const cpNhienLieu = 0;
      const cpSuaXe = 0;
      const cpEpassMonth = 0;
      const cpEpassTurn = 0;
      const cpKhauHaoXe = 0;
      const cpThanhToanLichTrinh = 0;

      // ========================================
      // LỢI NHUẬN
      // ========================================
      const loiNhuan =
        doanhThu -
        cpLuong -
        cpNhienLieu -
        cpSuaXe -
        cpEpassMonth -
        cpEpassTurn -
        cpKhauHaoXe -
        cpThanhToanLichTrinh;

      // ========================================
      // INSERT
      // ========================================
      bulkOps.push({
        insertOne: {
          document: {
            bsx,

            maLoiNhuan: normalizedMaLoiNhuan,

            cpLuong,
            cpNhienLieu,
            cpSuaXe,
            cpEpassMonth,
            cpEpassTurn,
            cpKhauHaoXe,
            cpThanhToanLichTrinh,

            doanhThu,

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
    // TẠO / CẬP NHẬT DOANH THU TỔNG
    // ==========================================
    const doanhThuTong = await updateDoanhThuTong(normalizedMaLoiNhuan);

    // ==========================================
    // LẤY LẠI DATA
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

      // DOANH THU TỔNG
      doanhThuTong,

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
// 2. CẬP NHẬT CHI PHÍ CỦA 1 XE
//
// CHỈ ĐƯỢC PHÉP SỬA:
//   - cpLuong
//
// KHÔNG cho phép thay đổi:
//   - cpNhienLieu
//   - cpSuaXe
//   - cpEpassMonth
//   - cpEpassTurn
//   - cpKhauHaoXe
//   - cpThanhToanLichTrinh
//   - doanhThu
//   - loiNhuan
// =====================================================
exports.updateVehicleProfit = async (req, res) => {
  try {
    const { bsx } = req.params;

    const { maLoiNhuan, cpLuong } = req.body;

    // ==========================================
    // CHECK BSX
    // ==========================================
    if (!bsx) {
      return res.status(400).json({
        success: false,
        message: "Thiếu biển số xe",
      });
    }

    // ==========================================
    // CHECK CP LƯƠNG
    // ==========================================
    if (cpLuong === undefined) {
      return res.status(400).json({
        success: false,
        message: "Chỉ được phép cập nhật chi phí lương",
      });
    }

    // ==========================================
    // CHECK MÃ LN
    // ==========================================
    const dateRange = getDateRangeFromMaLoiNhuan(maLoiNhuan);

    if (!dateRange) {
      return res.status(400).json({
        success: false,
        message: "Mã lợi nhuận không hợp lệ. Ví dụ: LN.7.2026",
      });
    }

    const { normalizedMaLoiNhuan } = dateRange;

    // ==========================================
    // TÌM VEHICLE
    // ==========================================
    const requestedKey = getVehicleKey(bsx);

    if (!requestedKey) {
      return res.status(400).json({
        success: false,
        message: "Không xác định được biển số xe",
      });
    }

    const vehicles = await VehiclePlate.find({
      plateNumber: {
        $exists: true,
        $nin: ["", null],
      },
    }).select("plateNumber");

    const vehicle = vehicles.find(
      (item) => getVehicleKey(item.plateNumber) === requestedKey
    );

    if (!vehicle) {
      return res.status(404).json({
        success: false,
        message: "Không tìm thấy biển số xe",
      });
    }

    // ==========================================
    // TÌM BẢN GHI LỢI NHUẬN
    // ==========================================
    const profit = await findVehicleProfit(normalizedMaLoiNhuan, requestedKey);

    if (!profit) {
      return res.status(404).json({
        success: false,
        message: "Chưa tạo bản ghi lợi nhuận cho xe này trong kỳ",
      });
    }

    // ==========================================
    // CHỈ UPDATE CP LƯƠNG
    // ==========================================
    profit.cpLuong = toNumber(cpLuong);

    // ==========================================
    // GIỮ NGUYÊN TOÀN BỘ CHI PHÍ KHÁC
    // CHỈ TÍNH LẠI LỢI NHUẬN
    // ==========================================
    calculateProfit(profit);

    await profit.save();

    // ==========================================
    // CẬP NHẬT DOANH THU TỔNG
    // ==========================================
    const doanhThuTong = await updateDoanhThuTong(normalizedMaLoiNhuan);

    return res.json({
      success: true,

      message: "Đã cập nhật chi phí lương",

      // DOANH THU TỔNG
      doanhThuTong,

      data: profit,
    });
  } catch (error) {
    console.error("updateVehicleProfit error:", error);

    return res.status(500).json({
      success: false,
      message: "Lỗi khi cập nhật chi phí lương",
      error: error.message,
    });
  }
};

// =====================================================
// 3. TÍNH LẠI TOÀN BỘ KỲ
//
// KHÔNG THAY ĐỔI CHI PHÍ
// CHỈ TÍNH LẠI DOANH THU + LỢI NHUẬN
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
    // LẤY DATA
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
    // DOANH THU
    // ==========================================
    const revenueMap = await calculateRevenueMap(fromDate, toDate);

    // ==========================================
    // UPDATE
    // ==========================================
    const bulkOps = [];

    for (const profit of profits) {
      const vehicleKey = getVehicleKey(profit.bsx);

      const doanhThu = revenueMap.get(vehicleKey) || 0;

      const tongChiPhi = calculateTotalCost(profit);

      const loiNhuan = doanhThu - tongChiPhi;

      bulkOps.push({
        updateOne: {
          filter: {
            _id: profit._id,
          },

          update: {
            $set: {
              doanhThu,

              // GIỮ NGUYÊN 7 CHI PHÍ
              cpLuong: toNumber(profit.cpLuong),

              cpNhienLieu: toNumber(profit.cpNhienLieu),

              cpSuaXe: toNumber(profit.cpSuaXe),

              cpEpassMonth: toNumber(profit.cpEpassMonth),

              cpEpassTurn: toNumber(profit.cpEpassTurn),

              cpKhauHaoXe: toNumber(profit.cpKhauHaoXe),

              cpThanhToanLichTrinh: toNumber(profit.cpThanhToanLichTrinh),

              loiNhuan,
            },
          },
        },
      });
    }

    if (bulkOps.length > 0) {
      await VehicleProfit.bulkWrite(bulkOps);
    }

    const doanhThuTong = await updateDoanhThuTong(normalizedMaLoiNhuan);

    // ==========================================
    // LẤY LẠI
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
      0
    );

    const tongCpLuong = results.reduce(
      (sum, item) => sum + toNumber(item.cpLuong),
      0
    );

    const tongCpNhienLieu = results.reduce(
      (sum, item) => sum + toNumber(item.cpNhienLieu),
      0
    );

    const tongCpSuaXe = results.reduce(
      (sum, item) => sum + toNumber(item.cpSuaXe),
      0
    );

    const tongCpEpassMonth = results.reduce(
      (sum, item) => sum + toNumber(item.cpEpassMonth),
      0
    );

    const tongCpEpassTurn = results.reduce(
      (sum, item) => sum + toNumber(item.cpEpassTurn),
      0
    );

    const tongCpKhauHaoXe = results.reduce(
      (sum, item) => sum + toNumber(item.cpKhauHaoXe),
      0
    );

    const tongCpThanhToanLichTrinh = results.reduce(
      (sum, item) => sum + toNumber(item.cpThanhToanLichTrinh),
      0
    );

    const tongChiPhi =
      tongCpLuong +
      tongCpNhienLieu +
      tongCpSuaXe +
      tongCpEpassMonth +
      tongCpEpassTurn +
      tongCpKhauHaoXe +
      tongCpThanhToanLichTrinh;

    const tongLoiNhuan = tongDoanhThu - tongChiPhi;

    return res.json({
      success: true,

      message: "Đã tính lại lợi nhuận",

      maLoiNhuan: normalizedMaLoiNhuan,

      totalVehicles: results.length,

      tongDoanhThu,

      tongCpLuong,

      tongCpNhienLieu,

      tongCpSuaXe,

      tongCpEpassMonth,

      tongCpEpassTurn,

      tongCpKhauHaoXe,

      tongCpThanhToanLichTrinh,

      tongChiPhi,

      tongLoiNhuan,
      // DOANH THU TỔNG
      doanhThuTong,

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

    // ==========================================
    // LẤY VEHICLE PROFIT
    // ==========================================
    const results = await VehicleProfit.find({
      maLoiNhuan: normalizedMaLoiNhuan,
    }).sort({
      bsx: 1,
    });

    // ==========================================
    // LẤY DOANH THU TỔNG
    // ==========================================
    const doanhThuTong = await DoanhThuTong.findOne({
      maLoiNhuan: normalizedMaLoiNhuan,
    });

    // ==========================================
    // TỔNG THEO XE
    // ==========================================
    const tongDoanhThu = results.reduce(
      (sum, item) => sum + toNumber(item.doanhThu),
      0
    );

    const tongCpLuong = results.reduce(
      (sum, item) => sum + toNumber(item.cpLuong),
      0
    );

    const tongCpNhienLieu = results.reduce(
      (sum, item) => sum + toNumber(item.cpNhienLieu),
      0
    );

    const tongCpSuaXe = results.reduce(
      (sum, item) => sum + toNumber(item.cpSuaXe),
      0
    );

    const tongCpEpassMonth = results.reduce(
      (sum, item) => sum + toNumber(item.cpEpassMonth),
      0
    );

    const tongCpEpassTurn = results.reduce(
      (sum, item) => sum + toNumber(item.cpEpassTurn),
      0
    );

    const tongCpKhauHaoXe = results.reduce(
      (sum, item) => sum + toNumber(item.cpKhauHaoXe),
      0
    );

    const tongCpThanhToanLichTrinh = results.reduce(
      (sum, item) => sum + toNumber(item.cpThanhToanLichTrinh),
      0
    );

    const tongChiPhi =
      tongCpLuong +
      tongCpNhienLieu +
      tongCpSuaXe +
      tongCpEpassMonth +
      tongCpEpassTurn +
      tongCpKhauHaoXe +
      tongCpThanhToanLichTrinh;

    const tongLoiNhuan = tongDoanhThu - tongChiPhi;

    // ==========================================
    // RESPONSE
    // ==========================================
    return res.json({
      success: true,

      maLoiNhuan: normalizedMaLoiNhuan,

      totalVehicles: results.length,

      // ==========================================
      // TỔNG THEO XE
      // ==========================================
      tongDoanhThu,

      tongCpLuong,

      tongCpNhienLieu,

      tongCpSuaXe,

      tongCpEpassMonth,

      tongCpEpassTurn,

      tongCpKhauHaoXe,

      tongCpThanhToanLichTrinh,

      tongChiPhi,

      tongLoiNhuan,

      // ==========================================
      // DOANH THU TỔNG
      // LẤY TRỰC TIẾP TỪ DoanhThuTong
      // ==========================================
      doanhThuTong,

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
// 5. LẤY LỢI NHUẬN 1 XE
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

    const result = await findVehicleProfit(normalizedMaLoiNhuan, requestedKey);

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
// 6. XUẤT EXCEL
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

    // ==========================================
    // LẤY NGUYÊN DATA TỪ DATABASE
    // KHÔNG TÍNH LẠI DOANH THU
    // KHÔNG TÍNH LẠI CHI PHÍ
    // KHÔNG TÍNH LẠI LỢI NHUẬN
    // ==========================================
    const results = await VehicleProfit.find({
      maLoiNhuan: normalizedMaLoiNhuan,
    })
      .sort({
        bsx: 1,
      })
      .lean();

    if (!results.length) {
      return res.status(404).json({
        success: false,
        message: `Không có dữ liệu lợi nhuận của kỳ ${normalizedMaLoiNhuan}`,
      });
    }

    // ==========================================
    // EXCEL
    // ==========================================
    const workbook = new ExcelJS.Workbook();

    const worksheet = workbook.addWorksheet(
      `Lợi nhuận ${normalizedMaLoiNhuan}`
    );

    // ==========================================
    // TITLE
    // ==========================================
    worksheet.mergeCells("A1:L1");

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
      "Nhiên liệu",
      "Sửa xe",
      "Epass tháng",
      "Epass lượt",
      "Khấu hao xe",
      "Thanh toán lịch trình",
      "Lương",
      "Doanh thu",
      "Lợi nhuận",
      "MÃ LN",
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
        // A - STT
        index + 1,

        // B - BSX
        item.bsx,

        // C - NHIÊN LIỆU
        toNumber(item.cpNhienLieu),

        // D - SỬA XE
        toNumber(item.cpSuaXe),

        // E - EPASS THÁNG
        toNumber(item.cpEpassMonth),

        // F - EPASS LƯỢT
        toNumber(item.cpEpassTurn),

        // G - KHẤU HAO XE
        toNumber(item.cpKhauHaoXe),

        // H - THANH TOÁN LỊCH TRÌNH
        toNumber(item.cpThanhToanLichTrinh),

        // I - LƯƠNG
        toNumber(item.cpLuong),

        // J - DOANH THU
        toNumber(item.doanhThu),

        // K - LỢI NHUẬN
        // QUAN TRỌNG:
        // LẤY TRỰC TIẾP GIÁ TRỊ TRONG DATABASE
        toNumber(item.loiNhuan),

        // L - MÃ LN
        String(item.maLoiNhuan || ""),
      ]);

      // ==========================================
      // BORDER
      // ==========================================
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

      // ==========================================
      // C -> K: ĐỊNH DẠNG SỐ
      // ==========================================
      for (let col = 3; col <= 11; col++) {
        row.getCell(col).numFmt = "#,##0";
      }

      // ==========================================
      // L: MÃ LN
      // TEXT + CĂN GIỮA
      // ==========================================
      row.getCell(12).alignment = {
        horizontal: "center",
        vertical: "middle",
      };

      row.getCell(12).numFmt = "@";
    });

    // ==========================================
    // TỔNG
    // CHỈ CỘNG CÁC GIÁ TRỊ ĐANG CÓ TRONG DB
    // ==========================================
    const totalRowNumber = worksheet.rowCount + 1;

    worksheet.getCell(`A${totalRowNumber}`).value = "TỔNG";

    // C - NHIÊN LIỆU
    worksheet.getCell(`C${totalRowNumber}`).value = results.reduce(
      (sum, item) => sum + toNumber(item.cpNhienLieu),
      0
    );

    // D - SỬA XE
    worksheet.getCell(`D${totalRowNumber}`).value = results.reduce(
      (sum, item) => sum + toNumber(item.cpSuaXe),
      0
    );

    // E - EPASS THÁNG
    worksheet.getCell(`E${totalRowNumber}`).value = results.reduce(
      (sum, item) => sum + toNumber(item.cpEpassMonth),
      0
    );

    // F - EPASS LƯỢT
    worksheet.getCell(`F${totalRowNumber}`).value = results.reduce(
      (sum, item) => sum + toNumber(item.cpEpassTurn),
      0
    );

    // G - KHẤU HAO
    worksheet.getCell(`G${totalRowNumber}`).value = results.reduce(
      (sum, item) => sum + toNumber(item.cpKhauHaoXe),
      0
    );

    // H - THANH TOÁN LỊCH TRÌNH
    worksheet.getCell(`H${totalRowNumber}`).value = results.reduce(
      (sum, item) => sum + toNumber(item.cpThanhToanLichTrinh),
      0
    );

    // I - LƯƠNG
    worksheet.getCell(`I${totalRowNumber}`).value = results.reduce(
      (sum, item) => sum + toNumber(item.cpLuong),
      0
    );

    // J - DOANH THU
    worksheet.getCell(`J${totalRowNumber}`).value = results.reduce(
      (sum, item) => sum + toNumber(item.doanhThu),
      0
    );

    // K - LỢI NHUẬN
    // CỘNG TRỰC TIẾP loiNhuan TRONG DATABASE
    // KHÔNG LẤY doanhThu - tongChiPhi
    worksheet.getCell(`K${totalRowNumber}`).value = results.reduce(
      (sum, item) => sum + toNumber(item.loiNhuan),
      0
    );

    const totalRow = worksheet.getRow(totalRowNumber);

    totalRow.font = {
      bold: true,
    };

    // ==========================================
    // FORMAT TỔNG
    // ==========================================
    for (let col = 3; col <= 11; col++) {
      totalRow.getCell(col).numFmt = "#,##0";
    }

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
    // WIDTH
    // ==========================================
    worksheet.getColumn(1).width = 8;
    worksheet.getColumn(2).width = 25;

    worksheet.getColumn(3).width = 18; // Nhiên liệu
    worksheet.getColumn(4).width = 18; // Sửa xe
    worksheet.getColumn(5).width = 18; // Epass tháng
    worksheet.getColumn(6).width = 18; // Epass lượt
    worksheet.getColumn(7).width = 18; // Khấu hao
    worksheet.getColumn(8).width = 25; // Thanh toán lịch trình
    worksheet.getColumn(9).width = 18; // Lương
    worksheet.getColumn(10).width = 18; // Doanh thu
    worksheet.getColumn(11).width = 18; // Lợi nhuận
    worksheet.getColumn(12).width = 16; // Mã LN

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
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
    );

    res.setHeader("Content-Disposition", `attachment; filename="${fileName}"`);

    await workbook.xlsx.write(res);

    res.end();
  } catch (error) {
    console.error("exportMonthlyProfit error:", error);

    if (!res.headersSent) {
      return res.status(500).json({
        success: false,
        message: "Lỗi xuất Excel lợi nhuận",
        error: error.message,
      });
    }
  }
};

// =====================================================
// 7. IMPORT CHI PHÍ LƯƠNG THEO THÁNG
//
// FORMAT EXCEL:
//
// A: STT
// B: BSX
// C: CP Nhiên liệu
// D: CP Sửa xe
// E: CP Epass tháng
// F: CP Epass lượt
// G: CP Khấu hao xe
// H: CP Thanh toán lịch trình
// I: CP Lương
// J: Doanh thu
// K: Lợi nhuận
// L: Mã LN
//
// CHỈ UPDATE:
//   I - CP Lương
//
// CÁC CỘT KHÁC CHỈ ĐỂ THAM KHẢO,
// KHÔNG GHI ĐÈ DATABASE.
// =====================================================
exports.importMonthlyCost = async (req, res) => {
  try {
    // ==========================================
    // CHECK FILE
    // ==========================================
    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: "Vui lòng chọn file Excel",
      });
    }

    // ==========================================
    // LOAD EXCEL
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
    // ĐỌC DATA
    //
    // Dòng 1: title
    // Dòng 2: trống
    // Dòng 3: header
    // Dòng 4+: data
    // ==========================================
    const rows = [];

    worksheet.eachRow((row, rowNumber) => {
      if (rowNumber < 4) {
        return;
      }

      const stt = row.getCell(1).value;

      const bsx = String(row.getCell(2).value || "").trim();

      // ========================================
      // CHỈ LẤY CP LƯƠNG Ở CỘT I
      // ========================================
      const cpLuongExcel = row.getCell(9).value;

      // ========================================
      // MÃ LN Ở CỘT L
      // ========================================
      const maLoiNhuan = String(row.getCell(12).value || "").trim();

      // ======================================
      // BỎ DÒNG TRỐNG
      // ======================================
      if (!bsx && !maLoiNhuan) {
        return;
      }

      rows.push({
        rowNumber,
        stt,
        bsx,

        cpLuongExcel,

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
    // LẤY PROFIT
    // ==========================================
    const profits = await VehicleProfit.find({
      maLoiNhuan: {
        $in: maLoiNhuanList,
      },
    });

    // ==========================================
    // MAP
    //
    // LN.7.2026__89H11111
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
      const { rowNumber, bsx, cpLuongExcel, maLoiNhuan } = row;

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
      // KEY
      // ========================================
      const key = `${normalizedMaLoiNhuan}__${normalizedBsx}`;

      const profit = profitMap.get(key);

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
      // CHỈ UPDATE CP LƯƠNG
      // ========================================
      const newCpLuong = toNumber(cpLuongExcel);

      // ========================================
      // LẤY CÁC CHI PHÍ KHÁC TỪ DATABASE
      // KHÔNG LẤY TỪ EXCEL
      // ========================================
      const cpNhienLieu = toNumber(profit.cpNhienLieu);

      const cpSuaXe = toNumber(profit.cpSuaXe);

      const cpEpassMonth = toNumber(profit.cpEpassMonth);

      const cpEpassTurn = toNumber(profit.cpEpassTurn);

      const cpKhauHaoXe = toNumber(profit.cpKhauHaoXe);

      const cpThanhToanLichTrinh = toNumber(profit.cpThanhToanLichTrinh);

      const doanhThu = toNumber(profit.doanhThu);

      // ========================================
      // TÍNH TỔNG CHI PHÍ
      // DÙNG DATA DB + CP LƯƠNG MỚI
      // ========================================
      const tongChiPhi =
        newCpLuong +
        cpNhienLieu +
        cpSuaXe +
        cpEpassMonth +
        cpEpassTurn +
        cpKhauHaoXe +
        cpThanhToanLichTrinh;

      // ========================================
      // TÍNH LẠI LỢI NHUẬN
      // ========================================
      const loiNhuan = doanhThu - tongChiPhi;

      // ========================================
      // UPDATE
      //
      // CHỈ CÓ:
      //   cpLuong
      //   loiNhuan
      // ========================================
      bulkOps.push({
        updateOne: {
          filter: {
            _id: profit._id,
          },

          update: {
            $set: {
              cpLuong: newCpLuong,
              loiNhuan,
            },
          },
        },
      });

      updatedCount++;
    }

    // ==========================================
    // BULK WRITE
    // ==========================================
    if (bulkOps.length > 0) {
      await VehicleProfit.bulkWrite(bulkOps);
    }

    // ==========================================
    // NORMALIZE MÃ LN
    // ==========================================
    const normalizedMaList = maLoiNhuanList
      .map((item) => {
        const dateRange = getDateRangeFromMaLoiNhuan(item);

        return dateRange ? dateRange.normalizedMaLoiNhuan : null;
      })
      .filter(Boolean);

    // ==========================================
    // LẤY LẠI DATA
    // ==========================================
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

      message: "Đã nhập chi phí lương thành công",

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
      message: "Lỗi nhập chi phí lương",
      error: error.message,
    });
  }
};
