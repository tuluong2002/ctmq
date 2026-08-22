const EmployeeLeave = require("../models/EmployeeLeave");
const EmployeeAdvance = require("../models/EmployeeAdvance");

// =====================================================
// HELPER
// =====================================================

const normalizeDate = (date) => {
  if (!date) return null;

  const d = new Date(date);

  if (Number.isNaN(d.getTime())) {
    return null;
  }

  // Đưa về 00:00:00
  d.setHours(0, 0, 0, 0);

  return d;
};

const getDateFilter = (fromDate, toDate) => {
  const filter = {};

  if (fromDate) {
    const from = normalizeDate(fromDate);

    if (from) {
      filter.$gte = from;
    }
  }

  if (toDate) {
    const to = normalizeDate(toDate);

    if (to) {
      to.setHours(23, 59, 59, 999);
      filter.$lte = to;
    }
  }

  return filter;
};

// =====================================================
// TAB 1
// QUẢN LÝ NGHỈ NV/LX
// =====================================================

// =====================================================
// THÊM NGHỈ
// POST /api/employee-leave
// =====================================================

exports.createLeave = async (req, res) => {
  try {
    const { ngayThang, nguoiId, tenNguoi, loaiNghi, soGioNghi, lyDo } =
      req.body;

    if (!ngayThang) {
      return res.status(400).json({
        message: "Vui lòng chọn ngày",
      });
    }

    if (!tenNguoi) {
      return res.status(400).json({
        message: "Vui lòng chọn nhân viên/lái xe",
      });
    }

    if (!loaiNghi) {
      return res.status(400).json({
        message: "Vui lòng chọn loại nghỉ",
      });
    }

    const validTypes = ["ALL_DAY", "HALF_DAY", "LATE", "EARLY"];

    if (!validTypes.includes(loaiNghi)) {
      return res.status(400).json({
        message: "Loại nghỉ không hợp lệ",
      });
    }

    // Tự động tính số ngày nghỉ
    let soNgayNghi = 0;

    if (loaiNghi === "ALL_DAY") {
      soNgayNghi = 1;
    }

    if (loaiNghi === "HALF_DAY") {
      soNgayNghi = 0.5;
    }

    // Đi muộn / về sớm phải có số giờ
    let finalSoGioNghi = 0;

    if (loaiNghi === "LATE" || loaiNghi === "EARLY") {
      finalSoGioNghi = Number(soGioNghi || 0);

      if (!Number.isFinite(finalSoGioNghi) || finalSoGioNghi <= 0) {
        return res.status(400).json({
          message: "Vui lòng nhập số giờ nghỉ hợp lệ",
        });
      }
    }

    const date = normalizeDate(ngayThang);

    if (!date) {
      return res.status(400).json({
        message: "Ngày không hợp lệ",
      });
    }

    const data = await EmployeeLeave.create({
      ngayThang: date,
      nguoiId: nguoiId || null,
      tenNguoi: tenNguoi.trim(),
      loaiNghi,
      soNgayNghi,
      soGioNghi: finalSoGioNghi,
      lyDo: lyDo || "",
      createdBy: req.user?.fullname || req.user?.username || "",
    });

    return res.status(201).json({
      message: "Thêm thông tin nghỉ thành công",
      data,
    });
  } catch (error) {
    console.error("createLeave:", error);

    return res.status(500).json({
      message: "Lỗi server",
      error: error.message,
    });
  }
};

// =====================================================
// DANH SÁCH NGHỈ
// GET /api/employee-leave
// =====================================================

exports.getLeaves = async (req, res) => {
  try {
    const { fromDate, toDate, tenNguoi, loaiNghi } = req.query;

    const filter = {};

    const dateFilter = getDateFilter(fromDate, toDate);

    if (Object.keys(dateFilter).length > 0) {
      filter.ngayThang = dateFilter;
    }

    if (tenNguoi) {
      filter.tenNguoi = {
        $regex: tenNguoi,
        $options: "i",
      };
    }

    if (loaiNghi) {
      filter.loaiNghi = loaiNghi;
    }

    const data = await EmployeeLeave.find(filter)
      .sort({
        ngayThang: -1,
        createdAt: -1,
      })
      .lean();

    // Thêm số lần chỉnh sửa
    const result = data.map((item) => ({
      ...item,
      soLanChinhSua: Array.isArray(item.lichSuSua) ? item.lichSuSua.length : 0,
    }));

    return res.json({
      data: result,
    });
  } catch (error) {
    console.error("getLeaves:", error);

    return res.status(500).json({
      message: "Lỗi server",
      error: error.message,
    });
  }
};

// =====================================================
// CHI TIẾT NGHỈ
// GET /api/employee-leave/:id
// =====================================================

exports.getLeaveById = async (req, res) => {
  try {
    const { id } = req.params;

    const data = await EmployeeLeave.findById(id);

    if (!data) {
      return res.status(404).json({
        message: "Không tìm thấy thông tin nghỉ",
      });
    }

    return res.json({
      data,
    });
  } catch (error) {
    console.error("getLeaveById:", error);

    return res.status(500).json({
      message: "Lỗi server",
      error: error.message,
    });
  }
};

// =====================================================
// SỬA NGHỈ
// PUT /api/employee-leave/:id
// =====================================================

exports.updateLeave = async (req, res) => {
  try {
    const { id } = req.params;

    const {
      ngayThang,
      // Không nhận nguoiId, tenNguoi để tránh đổi người khi sửa
      loaiNghi,
      soGioNghi,
      lyDo,
    } = req.body;

    const record = await EmployeeLeave.findById(id);

    if (!record) {
      return res.status(404).json({
        message: "Không tìm thấy thông tin nghỉ",
      });
    }

    // =====================================================
    // LƯU DỮ LIỆU CŨ VÀO BIẾN
    // Chỉ push vào lịch sử sau khi validate thành công
    // =====================================================
    const oldData = {
      ngayThang: record.ngayThang,
      nguoiId: record.nguoiId,
      tenNguoi: record.tenNguoi,
      loaiNghi: record.loaiNghi,
      soNgayNghi: record.soNgayNghi,
      soGioNghi: record.soGioNghi,
      lyDo: record.lyDo,
    };

    // =====================================================
    // NGÀY THÁNG
    // =====================================================
    if (ngayThang !== undefined) {
      const date = normalizeDate(ngayThang);

      if (!date) {
        return res.status(400).json({
          message: "Ngày không hợp lệ",
        });
      }

      record.ngayThang = date;
    }

    // =====================================================
    // KHÔNG CHO THAY ĐỔI NGƯỜI
    // =====================================================
    // Không xử lý:
    // req.body.nguoiId
    // req.body.tenNguoi
    //
    // record.nguoiId và record.tenNguoi được giữ nguyên.

    // =====================================================
    // LOẠI NGHỈ
    // =====================================================
    if (loaiNghi !== undefined) {
      const validTypes = ["ALL_DAY", "HALF_DAY", "LATE", "EARLY"];

      if (!validTypes.includes(loaiNghi)) {
        return res.status(400).json({
          message: "Loại nghỉ không hợp lệ",
        });
      }

      record.loaiNghi = loaiNghi;
    }

    // =====================================================
    // TÍNH LẠI SỐ NGÀY / SỐ GIỜ
    // =====================================================
    if (record.loaiNghi === "ALL_DAY") {
      record.soNgayNghi = 1;
      record.soGioNghi = 0;
    } else if (record.loaiNghi === "HALF_DAY") {
      record.soNgayNghi = 0.5;
      record.soGioNghi = 0;
    } else {
      const hours = Number(soGioNghi);

      if (!Number.isFinite(hours) || hours <= 0) {
        return res.status(400).json({
          message: "Số giờ nghỉ không hợp lệ",
        });
      }

      record.soNgayNghi = 0;
      record.soGioNghi = hours;
    }

    // =====================================================
    // LÝ DO
    // =====================================================
    if (lyDo !== undefined) {
      record.lyDo = String(lyDo || "").trim();
    }

    // =====================================================
    // LƯU LỊCH SỬ SAU KHI VALIDATE THÀNH CÔNG
    // =====================================================
    record.lichSuSua.push({
      thoiGianSua: new Date(),

      nguoiSua:
        req.user?.fullname || req.user?.username || req.body?.updatedBy || "",

      ngayThang: oldData.ngayThang,
      nguoiId: oldData.nguoiId,
      tenNguoi: oldData.tenNguoi,
      loaiNghi: oldData.loaiNghi,
      soNgayNghi: oldData.soNgayNghi,
      soGioNghi: oldData.soGioNghi,
      lyDo: oldData.lyDo,
    });

    // =====================================================
    // LƯU DATABASE
    // =====================================================
    await record.save();

    return res.json({
      message: "Cập nhật thông tin nghỉ thành công",
      data: record,
    });
  } catch (error) {
    console.error("updateLeave:", error);

    return res.status(500).json({
      message: "Lỗi server",
      error: error.message,
    });
  }
};

// =====================================================
// XÓA NGHỈ
// DELETE /api/employee-leave/:id
// =====================================================

exports.deleteLeave = async (req, res) => {
  try {
    const { id } = req.params;

    const data = await EmployeeLeave.findByIdAndDelete(id);

    if (!data) {
      return res.status(404).json({
        message: "Không tìm thấy thông tin nghỉ",
      });
    }

    return res.json({
      message: "Xóa thông tin nghỉ thành công",
    });
  } catch (error) {
    console.error("deleteLeave:", error);

    return res.status(500).json({
      message: "Lỗi server",
      error: error.message,
    });
  }
};

// =====================================================
// TAB 2
// QUẢN LÝ ỨNG TIỀN
// =====================================================

// =====================================================
// THÊM ỨNG TIỀN
// POST /api/employee-advance
// =====================================================

exports.createAdvance = async (req, res) => {
  try {
    const {
      ngayThang,
      nguoiId,
      tenNguoi,
      soTienUng,
      lyDo,
      phuongAnXuLy,
      noiDungKhac,
    } = req.body;

    if (!ngayThang) {
      return res.status(400).json({
        message: "Vui lòng chọn ngày",
      });
    }

    if (!tenNguoi) {
      return res.status(400).json({
        message: "Vui lòng chọn lái xe/nhân viên",
      });
    }

    const amount = Number(soTienUng);

    if (!Number.isFinite(amount) || amount <= 0) {
      return res.status(400).json({
        message: "Số tiền ứng không hợp lệ",
      });
    }

    const validMethods = ["SALARY", "TRIP_PAYMENT", "OTHER"];

    if (!validMethods.includes(phuongAnXuLy)) {
      return res.status(400).json({
        message: "Phương án xử lý không hợp lệ",
      });
    }

    if (phuongAnXuLy === "OTHER" && !String(noiDungKhac || "").trim()) {
      return res.status(400).json({
        message: "Vui lòng nhập nội dung khi chọn phương án Khác",
      });
    }

    const date = normalizeDate(ngayThang);

    if (!date) {
      return res.status(400).json({
        message: "Ngày không hợp lệ",
      });
    }

    const data = await EmployeeAdvance.create({
      ngayThang: date,
      nguoiId: nguoiId || null,
      tenNguoi: tenNguoi.trim(),
      soTienUng: amount,
      lyDo: lyDo || "",
      phuongAnXuLy,
      noiDungKhac:
        phuongAnXuLy === "OTHER" ? String(noiDungKhac || "").trim() : "",
      createdBy: req.user?.fullname || req.user?.username || "",
    });

    return res.status(201).json({
      message: "Thêm khoản ứng tiền thành công",
      data,
    });
  } catch (error) {
    console.error("createAdvance:", error);

    return res.status(500).json({
      message: "Lỗi server",
      error: error.message,
    });
  }
};

// =====================================================
// DANH SÁCH ỨNG TIỀN
// GET /api/employee-advance
// =====================================================

exports.getAdvances = async (req, res) => {
  try {
    const { fromDate, toDate, tenNguoi, phuongAnXuLy } = req.query;

    const filter = {};

    const dateFilter = getDateFilter(fromDate, toDate);

    if (Object.keys(dateFilter).length > 0) {
      filter.ngayThang = dateFilter;
    }

    if (tenNguoi) {
      filter.tenNguoi = {
        $regex: tenNguoi,
        $options: "i",
      };
    }

    if (phuongAnXuLy) {
      filter.phuongAnXuLy = phuongAnXuLy;
    }

    const data = await EmployeeAdvance.find(filter)
      .sort({
        ngayThang: -1,
        createdAt: -1,
      })
      .lean();

    // Thêm số lần chỉnh sửa
    const result = data.map((item) => ({
      ...item,
      soLanChinhSua: Array.isArray(item.lichSuSua) ? item.lichSuSua.length : 0,
    }));

    return res.json({
      data: result,
    });
  } catch (error) {
    console.error("getAdvances:", error);

    return res.status(500).json({
      message: "Lỗi server",
      error: error.message,
    });
  }
};

// =====================================================
// CHI TIẾT ỨNG TIỀN
// GET /api/employee-advance/:id
// =====================================================

exports.getAdvanceById = async (req, res) => {
  try {
    const { id } = req.params;

    const data = await EmployeeAdvance.findById(id);

    if (!data) {
      return res.status(404).json({
        message: "Không tìm thấy khoản ứng",
      });
    }

    return res.json({
      data,
    });
  } catch (error) {
    console.error("getAdvanceById:", error);

    return res.status(500).json({
      message: "Lỗi server",
      error: error.message,
    });
  }
};

// =====================================================
// SỬA ỨNG TIỀN
// PUT /api/employee-advance/:id
// =====================================================

exports.updateAdvance = async (req, res) => {
  try {
    const { id } = req.params;

    const {
      ngayThang,
      // Không nhận nguoiId, tenNguoi để tránh đổi người khi sửa
      soTienUng,
      lyDo,
      phuongAnXuLy,
      noiDungKhac,
    } = req.body;

    const record = await EmployeeAdvance.findById(id);

    if (!record) {
      return res.status(404).json({
        message: "Không tìm thấy khoản ứng",
      });
    }

    // =====================================================
    // LƯU DỮ LIỆU CŨ VÀO BIẾN
    // Chỉ push vào lịch sử sau khi validate thành công
    // =====================================================
    const oldData = {
      ngayThang: record.ngayThang,
      nguoiId: record.nguoiId,
      tenNguoi: record.tenNguoi,
      soTienUng: record.soTienUng,
      lyDo: record.lyDo,
      phuongAnXuLy: record.phuongAnXuLy,
      noiDungKhac: record.noiDungKhac,
    };

    // =====================================================
    // NGÀY THÁNG
    // =====================================================
    if (ngayThang !== undefined) {
      const date = normalizeDate(ngayThang);

      if (!date) {
        return res.status(400).json({
          message: "Ngày không hợp lệ",
        });
      }

      record.ngayThang = date;
    }

    // =====================================================
    // KHÔNG CHO THAY ĐỔI NGƯỜI
    // =====================================================
    // Không xử lý:
    // req.body.nguoiId
    // req.body.tenNguoi
    //
    // record.nguoiId và record.tenNguoi được giữ nguyên.

    // =====================================================
    // SỐ TIỀN
    // =====================================================
    if (soTienUng !== undefined) {
      const amount = Number(soTienUng);

      if (!Number.isFinite(amount) || amount <= 0) {
        return res.status(400).json({
          message: "Số tiền ứng không hợp lệ",
        });
      }

      record.soTienUng = amount;
    }

    // =====================================================
    // LÝ DO
    // =====================================================
    if (lyDo !== undefined) {
      record.lyDo = String(lyDo || "").trim();
    }

    // =====================================================
    // PHƯƠNG ÁN XỬ LÝ
    // =====================================================
    if (phuongAnXuLy !== undefined) {
      const validMethods = ["SALARY", "TRIP_PAYMENT", "OTHER"];

      if (!validMethods.includes(phuongAnXuLy)) {
        return res.status(400).json({
          message: "Phương án xử lý không hợp lệ",
        });
      }

      record.phuongAnXuLy = phuongAnXuLy;
    }

    // =====================================================
    // PHƯƠNG ÁN KHÁC
    // =====================================================
    if (record.phuongAnXuLy === "OTHER") {
      const otherText = String(
        noiDungKhac !== undefined ? noiDungKhac : record.noiDungKhac || "",
      ).trim();

      if (!otherText) {
        return res.status(400).json({
          message: "Vui lòng nhập nội dung khi chọn phương án Khác",
        });
      }

      record.noiDungKhac = otherText;
    } else {
      record.noiDungKhac = "";
    }

    // =====================================================
    // LƯU LỊCH SỬ SAU KHI VALIDATE THÀNH CÔNG
    // =====================================================
    record.lichSuSua.push({
      thoiGianSua: new Date(),

      nguoiSua:
        req.user?.fullname || req.user?.username || req.body?.updatedBy || "",

      ngayThang: oldData.ngayThang,
      nguoiId: oldData.nguoiId,
      tenNguoi: oldData.tenNguoi,
      soTienUng: oldData.soTienUng,
      lyDo: oldData.lyDo,
      phuongAnXuLy: oldData.phuongAnXuLy,
      noiDungKhac: oldData.noiDungKhac,
    });

    // =====================================================
    // LƯU DATABASE
    // =====================================================
    await record.save();

    return res.json({
      message: "Cập nhật khoản ứng thành công",
      data: record,
    });
  } catch (error) {
    console.error("updateAdvance:", error);

    return res.status(500).json({
      message: "Lỗi server",
      error: error.message,
    });
  }
};

// =====================================================
// XÓA ỨNG TIỀN
// DELETE /api/employee-advance/:id
// =====================================================

exports.deleteAdvance = async (req, res) => {
  try {
    const { id } = req.params;

    const data = await EmployeeAdvance.findByIdAndDelete(id);

    if (!data) {
      return res.status(404).json({
        message: "Không tìm thấy khoản ứng",
      });
    }

    return res.json({
      message: "Xóa khoản ứng thành công",
    });
  } catch (error) {
    console.error("deleteAdvance:", error);

    return res.status(500).json({
      message: "Lỗi server",
      error: error.message,
    });
  }
};

// =====================================================
// TAB 3
// TỔNG HỢP NGHỈ / ỨNG TIỀN
// GET /api/employee-leave-advance/summary
// =====================================================

exports.getSummary = async (req, res) => {
  try {
    const { fromDate, toDate, tenNguoi } = req.query;

    const leaveFilter = {};
    const advanceFilter = {};

    const dateFilter = getDateFilter(fromDate, toDate);

    if (Object.keys(dateFilter).length > 0) {
      leaveFilter.ngayThang = dateFilter;
      advanceFilter.ngayThang = dateFilter;
    }

    if (tenNguoi) {
      const regex = {
        $regex: tenNguoi,
        $options: "i",
      };

      leaveFilter.tenNguoi = regex;
      advanceFilter.tenNguoi = regex;
    }

    // Lấy song song
    const [leaves, advances] = await Promise.all([
      EmployeeLeave.find(leaveFilter)
        .sort({
          ngayThang: 1,
          tenNguoi: 1,
        })
        .lean(),

      EmployeeAdvance.find(advanceFilter)
        .sort({
          ngayThang: 1,
          tenNguoi: 1,
        })
        .lean(),
    ]);

    // =================================================
    // GỘP THEO NGÀY + TÊN
    // =================================================

    const summaryMap = new Map();

    const getKey = (date, name) => {
      const d = new Date(date);

      const dateString = [
        d.getFullYear(),
        String(d.getMonth() + 1).padStart(2, "0"),
        String(d.getDate()).padStart(2, "0"),
      ].join("-");

      return `${dateString}__${name}`;
    };

    // =================================================
    // GỘP NGHỈ
    // =================================================

    for (const item of leaves) {
      const key = getKey(item.ngayThang, item.tenNguoi);

      if (!summaryMap.has(key)) {
        summaryMap.set(key, {
          ngayThang: item.ngayThang,
          tenNguoi: item.tenNguoi,

          soNgayNghi: 0,
          soGioNghi: 0,

          soTienUng: 0,

          phuongAnXuLy: [],
          ghiChu: [],
        });
      }

      const row = summaryMap.get(key);

      row.soNgayNghi += Number(item.soNgayNghi || 0);

      row.soGioNghi += Number(item.soGioNghi || 0);

      if (item.lyDo) {
        row.ghiChu.push(item.lyDo);
      }
    }

    // =================================================
    // GỘP ỨNG TIỀN
    // =================================================

    for (const item of advances) {
      const key = getKey(item.ngayThang, item.tenNguoi);

      if (!summaryMap.has(key)) {
        summaryMap.set(key, {
          ngayThang: item.ngayThang,
          tenNguoi: item.tenNguoi,

          soNgayNghi: 0,
          soGioNghi: 0,

          soTienUng: 0,

          phuongAnXuLy: [],
          ghiChu: [],
        });
      }

      const row = summaryMap.get(key);

      row.soTienUng += Number(item.soTienUng || 0);

      // Hiển thị tiếng Việt cho FE
      let phuongAn = "";

      if (item.phuongAnXuLy === "SALARY") {
        phuongAn = "Trừ lương";
      }

      if (item.phuongAnXuLy === "TRIP_PAYMENT") {
        phuongAn = "Trừ thanh toán lịch trình";
      }

      if (item.phuongAnXuLy === "OTHER") {
        phuongAn = item.noiDungKhac ? `Khác: ${item.noiDungKhac}` : "Khác";
      }

      if (phuongAn && !row.phuongAnXuLy.includes(phuongAn)) {
        row.phuongAnXuLy.push(phuongAn);
      }

      if (item.lyDo) {
        row.ghiChu.push(item.lyDo);
      }
    }

    // =================================================
    // CHUYỂN MAP -> ARRAY
    // =================================================

    const data = Array.from(summaryMap.values())
      .map((item) => ({
        ...item,

        phuongAnXuLy: item.phuongAnXuLy.join(" / "),

        ghiChu: item.ghiChu.join(" / "),
      }))
      .sort((a, b) => {
        const dateA = new Date(a.ngayThang);
        const dateB = new Date(b.ngayThang);

        if (dateA - dateB !== 0) {
          return dateA - dateB;
        }

        return a.tenNguoi.localeCompare(b.tenNguoi, "vi");
      });

    return res.json({
      data,
      total: data.length,
    });
  } catch (error) {
    console.error("getSummary:", error);

    return res.status(500).json({
      message: "Lỗi server",
      error: error.message,
    });
  }
};

// =====================================================
// LẤY LỊCH SỬ SỬA ỨNG TIỀN
// GET /api/employee-advance/:id/history
// =====================================================

exports.getAdvanceHistory = async (req, res) => {
  try {
    const { id } = req.params;

    const record = await EmployeeAdvance.findById(id)
      .select("tenNguoi lichSuSua")
      .lean();

    if (!record) {
      return res.status(404).json({
        message: "Không tìm thấy khoản ứng",
      });
    }

    const history = Array.isArray(record.lichSuSua)
      ? [...record.lichSuSua].sort(
          (a, b) => new Date(b.thoiGianSua) - new Date(a.thoiGianSua),
        )
      : [];

    return res.json({
      message: "Lấy lịch sử sửa khoản ứng thành công",
      data: history,
    });
  } catch (error) {
    console.error("getAdvanceHistory:", error);

    return res.status(500).json({
      message: "Lỗi server",
      error: error.message,
    });
  }
};

// =====================================================
// LẤY LỊCH SỬ SỬA NGHỈ
// GET /api/employee-leave/:id/history
// =====================================================

exports.getLeaveHistory = async (req, res) => {
  try {
    const { id } = req.params;

    const record = await EmployeeLeave.findById(id)
      .select("tenNguoi lichSuSua")
      .lean();

    if (!record) {
      return res.status(404).json({
        message: "Không tìm thấy thông tin nghỉ",
      });
    }

    const history = Array.isArray(record.lichSuSua)
      ? [...record.lichSuSua].sort(
          (a, b) => new Date(b.thoiGianSua) - new Date(a.thoiGianSua),
        )
      : [];

    return res.json({
      message: "Lấy lịch sử sửa ngày nghỉ thành công",
      data: history,
    });
  } catch (error) {
    console.error("getLeaveHistory:", error);

    return res.status(500).json({
      message: "Lỗi server",
      error: error.message,
    });
  }
};
