const mongoose = require("mongoose");

const TripActualCost = require("../models/TripActualCost");
const ScheduleAdmin = require("../models/ScheduleAdmin");
const User = require("../models/User");

// =====================================================
// HELPER
// Chuyển String tiền -> Number
// =====================================================

const toNumber = (value) => {
  if (value === null || value === undefined || value === "") {
    return 0;
  }

  const cleaned = String(value).replace(/,/g, "").trim();

  const number = Number(cleaned);

  return Number.isFinite(number) ? number : 0;
};

// =====================================================
// HELPER
// Tính toàn bộ chênh lệch
// =====================================================

const calculateDifference = (record) => {
  // =========================
  // GIÁ TRỊ GỐC
  // =========================

  const bocXep = toNumber(record.bocXep);

  const ve = toNumber(record.ve);

  const hangVe = toNumber(record.hangVe);

  const luuCa = toNumber(record.luuCa);

  const luatChiPhiKhac = toNumber(record.luatChiPhiKhac);

  // =========================
  // GIÁ TRỊ THỰC TẾ
  // =========================

  const bocXepThucTe = toNumber(record.bocXepThucTe);

  const veThucTe = toNumber(record.veThucTe);

  const hangVeThucTe = toNumber(record.hangVeThucTe);

  const luuCaThucTe = toNumber(record.luuCaThucTe);

  const luatChiPhiKhacThucTe = toNumber(record.luatChiPhiKhacThucTe);

  // =========================
  // CHÊNH LỆCH
  // GỐC - THỰC TẾ
  // =========================

  record.bocXepChenhLech = bocXep - bocXepThucTe;

  record.veChenhLech = ve - veThucTe;

  record.hangVeChenhLech = hangVe - hangVeThucTe;

  record.luuCaChenhLech = luuCa - luuCaThucTe;

  record.luatChiPhiKhacChenhLech = luatChiPhiKhac - luatChiPhiKhacThucTe;

  // =========================
  // TỔNG CHÊNH LỆCH
  // =========================

  record.tongChenhLech =
    record.bocXepChenhLech +
    record.veChenhLech +
    record.hangVeChenhLech +
    record.luuCaChenhLech +
    record.luatChiPhiKhacChenhLech;

  return record;
};

// =====================================================
// 1. NHẬP MÃ CHUYẾN -> TẠO DATA
// =====================================================

exports.createFromTrip = async (req, res) => {
  try {
    const { maChuyen } = req.body;

    // =========================
    // VALIDATE
    // =========================

    if (!maChuyen || typeof maChuyen !== "string" || !maChuyen.trim()) {
      return res.status(400).json({
        message: "Vui lòng nhập mã chuyến",
      });
    }

    const maChuyenTrim = maChuyen.trim();

    // =========================
    // TÌM CHUYẾN GỐC
    // =========================

    const trip = await ScheduleAdmin.findOne({
      maChuyen: maChuyenTrim,
      isDeleted: {
        $ne: true,
      },
    }).lean();

    if (!trip) {
      return res.status(404).json({
        message: `Không tìm thấy chuyến ${maChuyenTrim}`,
      });
    }

    // =========================
    // KIỂM TRA ĐÃ TẠO CHƯA
    // =========================

    const existed = await TripActualCost.findOne({
      maChuyen: maChuyenTrim,
    });

    if (existed) {
      return res.status(409).json({
        message: "Mã chuyến này đã có dữ liệu thực tế",
        data: existed,
      });
    }

    // =========================
    // TẠO DATA
    // =========================

    const record = new TripActualCost({
      // =========================
      // THÔNG TIN CHUYẾN
      // =========================

      maChuyen: trip.maChuyen,

      tenLaiXe: trip.tenLaiXe || "",

      khachHang: trip.khachHang || "",

      maKH: trip.maKH || "",

      ngayGiaoHang: trip.ngayGiaoHang || null,

      accountUsername: trip.accountUsername || "",

      // =========================
      // GIÁ TRỊ GỐC
      // =========================
      bocXep: trip.bocXep || "",
      ve: trip.ve || "",
      hangVe: trip.hangVe || "",
      luuCa: trip.luuCa || "",
      luatChiPhiKhac: trip.luatChiPhiKhac || "",

      // =========================
      // GIÁ TRỊ THỰC TẾ
      // MẶC ĐỊNH TRỐNG
      // =========================
      bocXepThucTe: trip.bocXep || "",
      veThucTe: trip.ve || "",
      hangVeThucTe: trip.hangVe || "",
      luuCaThucTe: trip.luuCa || "",
      luatChiPhiKhacThucTe: trip.luatChiPhiKhac || "",
      tongChenhLech: 0,

      // =========================
      // TRẠNG THÁI
      // =========================

      isTrue: false,

      updatedToScheduleAt: null,
    });

    await record.save();

    return res.status(201).json({
      message: "Tạo dữ liệu thực tế thành công",
      data: record,
    });
  } catch (error) {
    console.error("createFromTrip error:", error);

    return res.status(500).json({
      message: "Lỗi server",
      error: error.message,
    });
  }
};

// =====================================================
// 2. LẤY DANH SÁCH
// =====================================================

exports.getAll = async (req, res) => {
  try {
    const { maChuyen, isTrue, fromDate, toDate } = req.query;

    const filter = {};

    // =========================
    // LỌC MÃ CHUYẾN
    // =========================

    if (maChuyen && typeof maChuyen === "string") {
      filter.maChuyen = {
        $regex: maChuyen.trim(),
        $options: "i",
      };
    }

    // =========================
    // LỌC TRẠNG THÁI
    // =========================

    if (isTrue !== undefined && isTrue !== "") {
      if (isTrue === "true") {
        filter.isTrue = true;
      }

      if (isTrue === "false") {
        filter.isTrue = false;
      }
    }

    // =========================
    // LỌC THEO KHOẢNG NGÀY GIAO HÀNG
    // =========================

    if (fromDate || toDate) {
      filter.ngayGiaoHang = {};

      // Từ ngày
      if (fromDate) {
        const startDate = new Date(`${fromDate}T00:00:00.000+07:00`);

        if (Number.isNaN(startDate.getTime())) {
          return res.status(400).json({
            message: "Ngày bắt đầu không hợp lệ",
          });
        }

        filter.ngayGiaoHang.$gte = startDate;
      }

      // Đến ngày
      if (toDate) {
        const endDate = new Date(`${toDate}T23:59:59.999+07:00`);

        if (Number.isNaN(endDate.getTime())) {
          return res.status(400).json({
            message: "Ngày kết thúc không hợp lệ",
          });
        }

        filter.ngayGiaoHang.$lte = endDate;
      }

      // Kiểm tra khoảng ngày
      if (
        fromDate &&
        toDate &&
        new Date(`${fromDate}T00:00:00.000+07:00`) >
          new Date(`${toDate}T23:59:59.999+07:00`)
      ) {
        return res.status(400).json({
          message: "Ngày bắt đầu không được lớn hơn ngày kết thúc",
        });
      }
    }

    // =========================
    // LẤY DATA
    // =========================

    const data = await TripActualCost.find(filter)
      .sort({
        ngayGiaoHang: -1,
        createdAt: -1,
      })
      .lean();

    return res.json({
      data,
    });
  } catch (error) {
    console.error("getAll error:", error);

    return res.status(500).json({
      message: "Lỗi server",
      error: error.message,
    });
  }
};

// =====================================================
// 3. LẤY CHI TIẾT THEO ID
// =====================================================

exports.getById = async (req, res) => {
  try {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        message: "ID không hợp lệ",
      });
    }

    const data = await TripActualCost.findById(id).lean();

    if (!data) {
      return res.status(404).json({
        message: "Không tìm thấy dữ liệu",
      });
    }

    return res.json({
      data,
    });
  } catch (error) {
    console.error("getById error:", error);

    return res.status(500).json({
      message: "Lỗi server",
      error: error.message,
    });
  }
};

// =====================================================
// 4. CẬP NHẬT 5 GIÁ TRỊ THỰC TẾ
// =====================================================

exports.updateActual = async (req, res) => {
  try {
    const { id } = req.params;

    // =========================
    // VALIDATE ID
    // =========================

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        message: "ID không hợp lệ",
      });
    }

    const {
      bocXepThucTe,
      veThucTe,
      hangVeThucTe,
      luuCaThucTe,
      luatChiPhiKhacThucTe,
    } = req.body;

    // =========================
    // TÌM DATA
    // =========================

    const record = await TripActualCost.findById(id);

    if (!record) {
      return res.status(404).json({
        message: "Không tìm thấy dữ liệu",
      });
    }

    // =========================
    // ĐÃ CẬP NHẬT RỒI
    // KHÔNG CHO SỬA
    // =========================

    if (record.isTrue) {
      return res.status(400).json({
        message: "Dữ liệu đã được cập nhật về chuyến gốc, không thể sửa",
      });
    }

    // =========================
    // CẬP NHẬT THỰC TẾ
    // =========================

    if (bocXepThucTe !== undefined) {
      record.bocXepThucTe = bocXepThucTe;
    }

    if (veThucTe !== undefined) {
      record.veThucTe = veThucTe;
    }

    if (hangVeThucTe !== undefined) {
      record.hangVeThucTe = hangVeThucTe;
    }

    if (luuCaThucTe !== undefined) {
      record.luuCaThucTe = luuCaThucTe;
    }

    if (luatChiPhiKhacThucTe !== undefined) {
      record.luatChiPhiKhacThucTe = luatChiPhiKhacThucTe;
    }

    // =========================
    // TÍNH LẠI CHÊNH LỆCH
    // =========================

    calculateDifference(record);

    await record.save();

    return res.json({
      message: "Cập nhật giá trị thực tế thành công",
      data: record,
    });
  } catch (error) {
    console.error("updateActual error:", error);

    return res.status(500).json({
      message: "Lỗi server",
      error: error.message,
    });
  }
};

// =====================================================
// 5. CẬP NHẬT THỰC TẾ -> CHUYẾN GỐC
// =====================================================

exports.updateToOriginalTrip = async (req, res) => {
  const session = await mongoose.startSession();

  try {
    session.startTransaction();

    const { id } = req.params;

    // =========================
    // VALIDATE ID
    // =========================

    if (!mongoose.Types.ObjectId.isValid(id)) {
      await session.abortTransaction();

      return res.status(400).json({
        message: "ID không hợp lệ",
      });
    }

    // =========================
    // TÌM DATA THỰC TẾ
    // =========================

    const record = await TripActualCost.findById(id).session(session);

    if (!record) {
      await session.abortTransaction();

      return res.status(404).json({
        message: "Không tìm thấy dữ liệu thực tế",
      });
    }

    // =========================
    // ĐÃ CẬP NHẬT TRƯỚC ĐÓ
    // =========================

    if (record.isTrue) {
      await session.abortTransaction();

      return res.status(400).json({
        message: "Dữ liệu đã được cập nhật về chuyến gốc trước đó",
      });
    }

    // =========================
    // TÌM CHUYẾN GỐC
    // =========================

    const trip = await ScheduleAdmin.findOne({
      maChuyen: record.maChuyen,
      isDeleted: {
        $ne: true,
      },
    }).session(session);

    if (!trip) {
      await session.abortTransaction();

      return res.status(404).json({
        message: `Không tìm thấy chuyến gốc ${record.maChuyen}`,
      });
    }

    // =========================
    // CẬP NHẬT 5 GIÁ TRỊ
    // VỀ CHUYẾN GỐC
    // =========================

    trip.bocXep = record.bocXepThucTe;

    trip.ve = record.veThucTe;

    trip.hangVe = record.hangVeThucTe;

    trip.luuCa = record.luuCaThucTe;

    trip.luatChiPhiKhac = record.luatChiPhiKhacThucTe;

    // =========================
    // KIỂM TRA CHÊNH LỆCH TỪNG KHOẢN
    // =========================

    const isRealBocXep = Number(record.bocXepChenhLech || 0) !== 0;

    const isRealVe = Number(record.veChenhLech || 0) !== 0;

    const isRealHangVe = Number(record.hangVeChenhLech || 0) !== 0;

    const isRealLuuCa = Number(record.luuCaChenhLech || 0) !== 0;

    const isRealLuatCpKhac = Number(record.luatChiPhiKhacChenhLech || 0) !== 0;

    // =========================
    // CẬP NHẬT TRẠNG THÁI
    // =========================

    trip.isRealBocXep = isRealBocXep;
    trip.isRealVe = isRealVe;
    trip.isRealHangVe = isRealHangVe;
    trip.isRealLuuCa = isRealLuuCa;
    trip.isRealLuatCpKhac = isRealLuatCpKhac;

    record.isTrue = true

    await trip.save({
      session,
    });

    record.updatedToScheduleAt = new Date();

    // Tính lại một lần cuối
    calculateDifference(record);

    await record.save({
      session,
    });

    // =========================
    // COMMIT
    // =========================

    await session.commitTransaction();

    return res.json({
      message: `Đã cập nhật dữ liệu thực tế về chuyến ${record.maChuyen}`,
      data: {
        record,
        trip,
      },
    });
  } catch (error) {
    await session.abortTransaction();

    console.error("updateToOriginalTrip error:", error);

    return res.status(500).json({
      message: "Lỗi server",
      error: error.message,
    });
  } finally {
    session.endSession();
  }
};

// =====================================================
// 6. LẤY DANH SÁCH USERNAME + FULLNAME
// CHỈ LẤY USER CÓ ROLE = keToan
// =====================================================

exports.getUserList = async (req, res) => {
  try {
    const users = await User.find(
      {
        role: "keToan",
      },
      {
        username: 1,
        fullname: 1,
      },
    )
      .sort({ fullname: 1, username: 1 })
      .lean();

    return res.json({
      data: users,
    });
  } catch (error) {
    console.error("getUserList error:", error);

    return res.status(500).json({
      message: "Lỗi server",
      error: error.message,
    });
  }
};
