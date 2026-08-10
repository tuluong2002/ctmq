const ScheduleError = require("../models/ScheduleError");
const ScheduleAdmin = require("../models/ScheduleAdmin");

// =====================================================
// KIỂM TRA + LẤY THÔNG TIN CHUYẾN GỐC THEO MÃ CHUYẾN
// =====================================================
exports.checkOriginalTrip = async (req, res) => {
  try {
    const { maChuyen } = req.params;

    if (!maChuyen || !maChuyen.trim()) {
      return res.status(400).json({
        message: "Vui lòng nhập mã chuyến",
      });
    }

    const trip = await getOriginalTrip(maChuyen);

    if (!trip) {
      return res.status(404).json({
        message: `Không tìm thấy chuyến có mã ${maChuyen}`,
      });
    }

    return res.status(200).json({
      message: "Tìm thấy chuyến gốc",
      data: {
        maChuyen: trip.maChuyen,

        // Thông tin cần copy sang chuyến sai sót
        keToanPhuTrach: trip.accountUsername || "",
        maKH: trip.maKH || "",
        khachHang: trip.khachHang || "",
        dienGiai: trip.dienGiai || "",

        ngayBocHang: trip.ngayBocHang || null,
        ngayGiaoHang: trip.ngayGiaoHang || null,

        diemXepHang: trip.diemXepHang || "",
        diemDoHang: trip.diemDoHang || "",
        soDiem: trip.soDiem || "",
        trongLuong: trip.trongLuong || "",
        bienSoXe: trip.bienSoXe || "",
      },
    });
  } catch (error) {
    console.error("checkOriginalTrip error:", error);

    return res.status(500).json({
      message: "Lỗi server khi kiểm tra mã chuyến",
      error: error.message,
    });
  }
};

// =====================================================
// HÀM LẤY THÔNG TIN CHUYẾN GỐC
// =====================================================
const getOriginalTrip = async (maChuyen) => {
  if (!maChuyen) {
    return null;
  }

  const trip = await ScheduleAdmin.findOne({
    maChuyen: maChuyen.trim(),
    isDeleted: { $ne: true },
  });

  return trip;
};

// =====================================================
// THÊM CHUYẾN SAI SÓT
// =====================================================
exports.createScheduleError = async (req, res) => {
  try {
    const {
      maChuyen,
      soTienDieuChinh,
      loaiLoi,
      ghiChu,
      phuongAnXuLy,
      ngayXuLy,
      ngayTao,
    } = req.body;

    // -----------------------------------------
    // Kiểm tra mã chuyến
    // -----------------------------------------
    if (!maChuyen || !maChuyen.trim()) {
      return res.status(400).json({
        message: "Vui lòng nhập mã chuyến",
      });
    }

    // -----------------------------------------
    // Tìm chuyến gốc
    // -----------------------------------------
    const trip = await getOriginalTrip(maChuyen);

    if (!trip) {
      return res.status(404).json({
        message: `Không tìm thấy chuyến có mã ${maChuyen}`,
      });
    }

    // -----------------------------------------
    // Tạo chuyến sai sót
    // -----------------------------------------
    const scheduleError = new ScheduleError({
      maChuyen: trip.maChuyen,

      // Lấy từ chuyến gốc
      keToanPhuTrach: trip.accountUsername || "",
      maKH: trip.maKH || "",
      khachHang: trip.khachHang || "",
      dienGiai: trip.dienGiai || "",

      ngayBocHang: trip.ngayBocHang || null,
      ngayGiaoHang: trip.ngayGiaoHang || null,

      diemXepHang: trip.diemXepHang || "",
      diemDoHang: trip.diemDoHang || "",
      soDiem: trip.soDiem || "",
      trongLuong: trip.trongLuong || "",
      bienSoXe: trip.bienSoXe || "",

      // Thông tin sai sót
      soTienDieuChinh:
        soTienDieuChinh !== undefined &&
        soTienDieuChinh !== null &&
        soTienDieuChinh !== ""
          ? Number(soTienDieuChinh)
          : 0,

      loaiLoi: loaiLoi || "",
      ghiChu: ghiChu || "",
      phuongAnXuLy: phuongAnXuLy || "",

      ngayXuLy: ngayXuLy || null,

      // Nếu không truyền thì Schema tự lấy ngày hiện tại
      ngayTao: ngayTao || new Date(),
    });

    const saved = await scheduleError.save();

    return res.status(201).json({
      message: "Tạo chuyến sai sót thành công",
      data: saved,
    });
  } catch (error) {
    console.error("createScheduleError error:", error);

    return res.status(500).json({
      message: "Lỗi server khi tạo chuyến sai sót",
      error: error.message,
    });
  }
};

// =====================================================
// LẤY DANH SÁCH CHUYẾN SAI SÓT
// CÓ PHÂN TRANG + THỐNG KÊ
// =====================================================
exports.getScheduleErrors = async (req, res) => {
  try {
    const {
      maChuyen,
      maKH,
      khachHang,
      keToanPhuTrach,
      trangThai,
      fromDate,
      toDate,
      page = 1,
      limit = 50,
    } = req.query;

    // =====================================================
    // PHÂN TRANG
    // =====================================================
    const currentPage = Math.max(Number(page) || 1, 1);
    const pageSize = 50; // CỐ ĐỊNH 50 DATA / TRANG
    const skip = (currentPage - 1) * pageSize;

    // =====================================================
    // FILTER
    // =====================================================
    const filter = {};

    // -----------------------------------------
    // Lọc theo mã chuyến
    // -----------------------------------------
    if (maChuyen?.trim()) {
      filter.maChuyen = {
        $regex: maChuyen.trim(),
        $options: "i",
      };
    }

    // -----------------------------------------
    // Lọc theo mã KH
    // -----------------------------------------
    if (maKH?.trim()) {
      filter.maKH = {
        $regex: maKH.trim(),
        $options: "i",
      };
    }

    // -----------------------------------------
    // Lọc theo khách hàng
    // -----------------------------------------
    if (khachHang?.trim()) {
      filter.khachHang = {
        $regex: khachHang.trim(),
        $options: "i",
      };
    }

    // -----------------------------------------
    // Lọc theo kế toán phụ trách
    // -----------------------------------------
    if (keToanPhuTrach?.trim()) {
      filter.keToanPhuTrach = {
        $regex: keToanPhuTrach.trim(),
        $options: "i",
      };
    }

    // -----------------------------------------
    // Lọc theo trạng thái
    // -----------------------------------------
    if (trangThai?.trim()) {
      filter.trangThai = trangThai.trim();
    }

    // -----------------------------------------
    // Lọc theo ngày giao
    // -----------------------------------------
    if (fromDate || toDate) {
      filter.ngayGiaoHang = {};

      if (fromDate) {
        const start = new Date(fromDate);
        start.setHours(0, 0, 0, 0);

        filter.ngayGiaoHang.$gte = start;
      }

      if (toDate) {
        const end = new Date(toDate);
        end.setHours(23, 59, 59, 999);

        filter.ngayGiaoHang.$lte = end;
      }
    }

    // =====================================================
    // FILTER CHƯA XỬ LÝ THEO BỘ LỌC
    // =====================================================
    let unprocessedFilter = null;

    // Chỉ tạo filter chưa xử lý khi:
    // - Không lọc trạng thái
    // - Hoặc đang lọc "chưa xử lý"
    if (!trangThai || trangThai.trim() === "chuaXuLy") {
      unprocessedFilter = {
        ...filter,
        trangThai: "chuaXuLy",
      };
    }

    // =====================================================
    // CHẠY SONG SONG
    // =====================================================
    const [data, total, totalUnprocessed, adjustmentResult] = await Promise.all(
      [
        // -----------------------------------------
        // Lấy data theo đúng filter
        // -----------------------------------------
        ScheduleError.find(filter)
          .sort({
            ngayTao: -1,
            createdAt: -1,
          })
          .skip(skip)
          .limit(pageSize)
          .lean(),

        // -----------------------------------------
        // Tổng số theo đúng filter
        // -----------------------------------------
        ScheduleError.countDocuments(filter),

        // -----------------------------------------
        // Tổng chưa xử lý
        // -----------------------------------------
        unprocessedFilter
          ? ScheduleError.countDocuments(unprocessedFilter)
          : Promise.resolve(0),

        // -----------------------------------------
        // Tổng tiền chưa xử lý
        // -----------------------------------------
        unprocessedFilter
          ? ScheduleError.aggregate([
              {
                $match: unprocessedFilter,
              },
              {
                $group: {
                  _id: null,
                  total: {
                    $sum: {
                      $convert: {
                        input: "$soTienDieuChinh",
                        to: "double",
                        onError: 0,
                        onNull: 0,
                      },
                    },
                  },
                },
              },
            ])
          : Promise.resolve([]),
      ],
    );

    // =====================================================
    // TỔNG TIỀN CHƯA XỬ LÝ
    // =====================================================
    const totalAdjustmentUnprocessed =
      adjustmentResult.length > 0 ? Number(adjustmentResult[0].total) || 0 : 0;

    // =====================================================
    // TỔNG SỐ TRANG
    // =====================================================
    const totalPages = Math.ceil(total / pageSize);

    // =====================================================
    // RESPONSE
    // =====================================================
    return res.status(200).json({
      message: "Lấy danh sách chuyến sai sót thành công",

      // -----------------------------------------
      // PHÂN TRANG
      // -----------------------------------------
      pagination: {
        page: currentPage,
        limit: pageSize,
        total,
        totalPages,
        hasNextPage: currentPage < totalPages,
        hasPrevPage: currentPage > 1,
      },

      // -----------------------------------------
      // THỐNG KÊ THEO BỘ LỌC
      // -----------------------------------------
      summary: {
        totalErrors: total,
        totalUnprocessed,
        totalAdjustmentUnprocessed,
      },

      // -----------------------------------------
      // DATA TRANG HIỆN TẠI
      // -----------------------------------------
      data,
    });
  } catch (error) {
    console.error("getScheduleErrors error:", error);

    return res.status(500).json({
      message: "Lỗi server khi lấy danh sách chuyến sai sót",
      error: error.message,
    });
  }
};

// =====================================================
// LẤY CHI TIẾT 1 CHUYẾN SAI SÓT
// =====================================================
exports.getScheduleErrorById = async (req, res) => {
  try {
    const { id } = req.params;

    const data = await ScheduleError.findById(id);

    if (!data) {
      return res.status(404).json({
        message: "Không tìm thấy chuyến sai sót",
      });
    }

    return res.status(200).json({
      message: "Lấy thông tin thành công",
      data,
    });
  } catch (error) {
    console.error("getScheduleErrorById error:", error);

    return res.status(500).json({
      message: "Lỗi server",
      error: error.message,
    });
  }
};

// =====================================================
// SỬA CHUYẾN SAI SÓT
// =====================================================
exports.updateScheduleError = async (req, res) => {
  try {
    const { id } = req.params;

    const {
      maChuyen,
      soTienDieuChinh,
      loaiLoi,
      ghiChu,
      phuongAnXuLy,
      ngayXuLy,
      ngayTao,
    } = req.body;

    const scheduleError = await ScheduleError.findById(id);

    if (!scheduleError) {
      return res.status(404).json({
        message: "Không tìm thấy chuyến sai sót",
      });
    }

    // -----------------------------------------
    // Nếu thay đổi mã chuyến
    // thì lấy lại thông tin chuyến gốc
    // -----------------------------------------
    if (maChuyen !== undefined && maChuyen.trim() !== scheduleError.maChuyen) {
      const trip = await getOriginalTrip(maChuyen);

      if (!trip) {
        return res.status(404).json({
          message: `Không tìm thấy chuyến có mã ${maChuyen}`,
        });
      }

      scheduleError.maChuyen = trip.maChuyen;

      scheduleError.keToanPhuTrach = trip.accountUsername || "";

      scheduleError.maKH = trip.maKH || "";

      scheduleError.khachHang = trip.khachHang || "";

      scheduleError.dienGiai = trip.dienGiai || "";

      scheduleError.ngayBocHang = trip.ngayBocHang || null;

      scheduleError.ngayGiaoHang = trip.ngayGiaoHang || null;

      scheduleError.diemXepHang = trip.diemXepHang || "";

      scheduleError.diemDoHang = trip.diemDoHang || "";

      scheduleError.soDiem = trip.soDiem || "";

      scheduleError.trongLuong = trip.trongLuong || "";

      scheduleError.bienSoXe = trip.bienSoXe || "";
    }

    // -----------------------------------------
    // Cập nhật thông tin sai sót
    // -----------------------------------------
    if (soTienDieuChinh !== undefined) {
      scheduleError.soTienDieuChinh =
        soTienDieuChinh === "" || soTienDieuChinh === null
          ? 0
          : Number(soTienDieuChinh);
    }

    if (loaiLoi !== undefined) {
      scheduleError.loaiLoi = loaiLoi;
    }

    if (ghiChu !== undefined) {
      scheduleError.ghiChu = ghiChu;
    }

    if (phuongAnXuLy !== undefined) {
      scheduleError.phuongAnXuLy = phuongAnXuLy;
    }

    if (ngayXuLy !== undefined) {
      scheduleError.ngayXuLy =
        ngayXuLy === "" || ngayXuLy === null ? null : ngayXuLy;
    }

    if (ngayTao !== undefined) {
      scheduleError.ngayTao =
        ngayTao === "" || ngayTao === null ? scheduleError.ngayTao : ngayTao;
    }

    // pre save sẽ tự động:
    // có ngày xử lý -> daXuLy
    // không có -> chuaXuLy
    await scheduleError.save();

    return res.status(200).json({
      message: "Cập nhật chuyến sai sót thành công",
      data: scheduleError,
    });
  } catch (error) {
    console.error("updateScheduleError error:", error);

    return res.status(500).json({
      message: "Lỗi server khi cập nhật chuyến sai sót",
      error: error.message,
    });
  }
};

// =====================================================
// XÓA CHUYẾN SAI SÓT
// =====================================================
exports.deleteScheduleError = async (req, res) => {
  try {
    const { id } = req.params;

    const data = await ScheduleError.findByIdAndDelete(id);

    if (!data) {
      return res.status(404).json({
        message: "Không tìm thấy chuyến sai sót",
      });
    }

    return res.status(200).json({
      message: "Xóa chuyến sai sót thành công",
      data,
    });
  } catch (error) {
    console.error("deleteScheduleError error:", error);

    return res.status(500).json({
      message: "Lỗi server khi xóa chuyến sai sót",
      error: error.message,
    });
  }
};
