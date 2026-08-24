const mongoose = require("mongoose");

const TripActualCost = require("../models/TripActualCost");
const ScheduleAdmin = require("../models/ScheduleAdmin");
const User = require("../models/User");

const ExcelJS = require("exceljs");
const path = require("path");

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
      note,
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
    // CẬP NHẬT GHI CHÚ
    // =========================

    if (note !== undefined) {
      record.note = String(note);
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

    record.isTrue = true;

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

// =====================================================
// 7. XÓA DỮ LIỆU THỰC TẾ
// CHỈ ĐƯỢC XÓA KHI CHƯA CẬP NHẬT VỀ CHUYẾN GỐC
// =====================================================

exports.delete = async (req, res) => {
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

    // =========================
    // TÌM DATA
    // =========================

    const record = await TripActualCost.findById(id);

    if (!record) {
      return res.status(404).json({
        message: "Không tìm thấy dữ liệu thực tế",
      });
    }

    // =========================
    // ĐÃ CẬP NHẬT VỀ CHUYẾN GỐC
    // KHÔNG CHO XÓA
    // =========================

    if (record.isTrue) {
      return res.status(400).json({
        message: "Dữ liệu đã được cập nhật về chuyến gốc, không thể xóa",
      });
    }

    // =========================
    // XÓA
    // =========================

    await TripActualCost.findByIdAndDelete(id);

    return res.json({
      message: `Đã xóa dữ liệu thực tế của chuyến ${record.maChuyen}`,
      data: {
        id: record._id,
        maChuyen: record.maChuyen,
      },
    });
  } catch (error) {
    console.error("delete error:", error);

    return res.status(500).json({
      message: "Lỗi server",
      error: error.message,
    });
  }
};

// =====================================================
// HELPER
// Giá trị tiền khi xuất Excel
// =====================================================

const exportCostValue = (value) => {
  if (value === null || value === undefined || value === "") {
    return 0;
  }

  const number = Number(
    String(value)
      .replace(/,/g, "")
      .replace(/\./g, "")
      .trim(),
  );

  return Number.isFinite(number) ? number : 0;
};

// =====================================================
// 8. XUẤT EXCEL THEO KHOẢNG NGÀY
// =====================================================

exports.exportExcel = async (req, res) => {
  try {
    const { from, to } = req.body;

    console.log("EXPORT TRIP ACTUAL COST BODY >>>", req.body);

    // ======================
    // VALIDATE
    // ======================

    if (!from || !to) {
      return res.status(400).json({
        message: "Thiếu from hoặc to",
      });
    }

    // ======================
    // PARSE DATE
    // ======================

    const fromDate = new Date(`${from}T00:00:00.000+07:00`);
    const toDate = new Date(`${to}T23:59:59.999+07:00`);

    if (
      Number.isNaN(fromDate.getTime()) ||
      Number.isNaN(toDate.getTime())
    ) {
      return res.status(400).json({
        message: "Ngày không hợp lệ",
      });
    }

    if (fromDate > toDate) {
      return res.status(400).json({
        message: "Ngày bắt đầu không được lớn hơn ngày kết thúc",
      });
    }

    // ======================
    // QUERY CONDITION
    // ======================

    const condition = {
      ngayGiaoHang: {
        $gte: fromDate,
        $lte: toDate,
      },
    };

    // ======================
    // LẤY DATA
    // ======================

    const trips = await TripActualCost.find(condition)
      .sort({
        ngayGiaoHang: 1,
        createdAt: 1,
      })
      .lean();

    if (!trips.length) {
      return res.status(400).json({
        message: "Không có dữ liệu",
      });
    }

    // ======================
    // LOAD FORM MẪU
    // ======================

    const workbook = new ExcelJS.Workbook();

    await workbook.xlsx.readFile(path.join( __dirname, "../templates/SUA_CP_LX.xlsx"));

    // ⚠️ Đổi thành đúng tên sheet trong file mẫu
    const sheet = workbook.getWorksheet("Sheet1");

    if (!sheet) {
      return res.status(500).json({
        message: "Không tìm thấy sheet trong form mẫu",
      });
    }

    // ======================
    // SCHEMA
    // ======================

    // ⚠️ Đổi nếu form mẫu bắt đầu từ dòng khác
    const startRow = 3;

    // ======================
    // GHI DỮ LIỆU
    // ======================

    trips.forEach((trip, index) => {
      const rowIndex = startRow + index;
      const row = sheet.getRow(rowIndex);

      // ======================
      // THÔNG TIN CHUYẾN
      // ======================

      row.getCell("A").value = index + 1;

      row.getCell("B").value = trip.maChuyen || "";

      row.getCell("C").value = trip.accountUsername || "";

      row.getCell("D").value = trip.tenLaiXe || "";

      row.getCell("E").value = trip.khachHang || "";

      row.getCell("F").value = trip.maKH || "";

      // ======================
      // NGÀY GIAO HÀNG
      // ======================

      if (trip.ngayGiaoHang) {
        const date = new Date(trip.ngayGiaoHang);

        if (!Number.isNaN(date.getTime())) {
          row.getCell("G").value = date;
          row.getCell("G").numFmt = "dd/mm/yyyy";
        } else {
          row.getCell("G").value = "";
        }
      } else {
        row.getCell("G").value = "";
      }

      // ======================
      // GIÁ TRỊ GỐC - THỰC TẾ
      // ======================

      row.getCell("H").value = exportCostValue(trip.bocXep);
      row.getCell("I").value = exportCostValue(trip.bocXepThucTe);

      row.getCell("J").value = exportCostValue(trip.ve);
      row.getCell("K").value = exportCostValue(trip.veThucTe);

      row.getCell("L").value = exportCostValue(trip.hangVe);
      row.getCell("M").value = exportCostValue(trip.hangVeThucTe);

      row.getCell("N").value = exportCostValue(trip.luuCa);
      row.getCell("O").value = exportCostValue(trip.luuCaThucTe);

      row.getCell("P").value = exportCostValue(trip.luatChiPhiKhac);
      row.getCell("Q").value = exportCostValue(trip.luatChiPhiKhacThucTe);

      // ======================
      // TỔNG CHÊNH LỆCH
      // ======================

      row.getCell("R").value = exportCostValue(trip.tongChenhLech);

      // ======================
      // GHI CHÚ
      // ======================

      row.getCell("S").value = trip.note || "";

      // ======================
      // TRẠNG THÁI
      // ======================

      row.getCell("T").value = trip.isTrue
        ? "Đã cập nhật"
        : "Chưa cập nhật";

      row.commit();
    });

    // ======================
    // RESPONSE
    // ======================

    res.setHeader(
      "Content-Disposition",
      `attachment; filename=CHI_PHI_THUC_TE_${from}_den_${to}.xlsx`,
    );

    res.setHeader(
      "Content-Type",
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    );

    await workbook.xlsx.write(res);

    res.end();
  } catch (error) {
    console.error("exportExcel error:", error);

    if (!res.headersSent) {
      return res.status(500).json({
        message: "Lỗi xuất Excel",
        error: error.message,
      });
    }
  }
};