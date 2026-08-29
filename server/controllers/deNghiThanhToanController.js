const DeNghiThanhToan = require("../models/DeNghiThanhToan");
const NCC = require("../models/NCC");

/* =========================================================
   HELPER
========================================================= */

const getMonthYear = (date) => {
  const d = new Date(date);

  if (isNaN(d.getTime())) {
    return null;
  }

  return {
    month: d.getMonth() + 1,
    year: d.getFullYear(),
  };
};

/* ========================================================= 
LẤY DANH SÁCH NCC DUY NHẤT Gồm: - stt - mst - tenNguoiBan - stkNganHang - chiTietChiPhi 
========================================================= */
exports.getNCCUnique = async (req, res) => {
  try {
    const data = await NCC.aggregate([
      {
        $group: {
          _id: {
            stt: "$stt",
            mst: "$mst",
            tenNguoiBan: "$tenNguoiBan",
            stkNganHang: "$stkNganHang",
            chiTietChiPhi: "$chiTietChiPhi",
            nguoiPhuTrach: "$nguoiPhuTrach",
          },
        },
      },
      {
        $project: {
          _id: 0,
          stt: "$_id.stt",
          mst: "$_id.mst",
          tenNguoiBan: "$_id.tenNguoiBan",
          stkNganHang: "$_id.stkNganHang",
          chiTietChiPhi: "$_id.chiTietChiPhi",
          nguoiPhuTrach: "$_id.nguoiPhuTrach",
        },
      },
      { $sort: { stt: 1 } },
    ]);
    res.json({ data });
  } catch (error) {
    console.error("getNCCUnique:", error);
    res.status(500).json({
      message: "Lỗi lấy danh sách nhà cung cấp",
      error: error.message,
    });
  }
};

/* =========================================================
   TẠO MÃ PHIẾU
   DNTT08.2026.0001
========================================================= */

const generateMaPhieu = async (ngayDeNghi) => {
  const info = getMonthYear(ngayDeNghi);

  if (!info) {
    throw new Error("Ngày đề nghị không hợp lệ");
  }

  const { month, year } = info;

  const prefix = `DNTT${String(month).padStart(2, "0")}.${year}.`;

  // Tìm phiếu cuối cùng của tháng/năm
  const lastPhieu = await DeNghiThanhToan.findOne({
    maPhieu: {
      $regex: `^${prefix.replace(".", "\\.")}`,
    },
  })
    .sort({
      maPhieu: -1,
    })
    .lean();

  let nextNumber = 1;

  if (lastPhieu?.maPhieu) {
    const parts = lastPhieu.maPhieu.split(".");
    const lastNumber = Number(parts[2]);

    if (Number.isFinite(lastNumber)) {
      nextNumber = lastNumber + 1;
    }
  }

  return `${prefix}${String(nextNumber).padStart(4, "0")}`;
};

/* =========================================================
   THÊM PHIẾU
========================================================= */

exports.createDeNghiThanhToan = async (req, res) => {
  try {
    const {
      ngayDeNghi,
      nguoiDeNghi,
      maSoThue,
      nhaCungCap,
      stkNganHang,
      noiDungCK,
      hoaDonSo,
      nhomChiPhi,
      ghiChu,
      soTienTruocThue,
      thue,
      tongTien,
    } = req.body;

    if (!ngayDeNghi) {
      return res.status(400).json({
        message: "Vui lòng nhập ngày đề nghị",
      });
    }

    if (!nguoiDeNghi) {
      return res.status(400).json({
        message: "Vui lòng nhập người đề nghị",
      });
    }

    const maPhieu = await generateMaPhieu(ngayDeNghi);

    const user = req.user;

    const item = await DeNghiThanhToan.create({
      maPhieu,
      ngayDeNghi,
      nguoiDeNghi,
      maSoThue,
      nhaCungCap,
      stkNganHang,
      noiDungCK,
      hoaDonSo,
      nhomChiPhi,
      ghiChu,

      soTienTruocThue: Number(soTienTruocThue) || 0,
      thue: Number(thue) || 0,
      tongTien:
        tongTien !== undefined
          ? Number(tongTien) || 0
          : (Number(soTienTruocThue) || 0) + (Number(thue) || 0),

      createdBy: user?.fullname || user?.username || "",
    });

    res.status(201).json({
      message: "Tạo phiếu đề nghị thanh toán thành công",
      data: item,
    });
  } catch (error) {
    console.error("createDeNghiThanhToan:", error);

    res.status(500).json({
      message: "Lỗi tạo phiếu đề nghị thanh toán",
      error: error.message,
    });
  }
};

/* =========================================================
   LẤY DANH SÁCH
   Có filter theo tháng
========================================================= */

exports.getDeNghiThanhToan = async (req, res) => {
  try {
    const { month, year } = req.query;

    const filter = {};

    // Nếu truyền tháng + năm
    if (month && year) {
      const m = Number(month);
      const y = Number(year);

      if (!Number.isInteger(m) || m < 1 || m > 12 || !Number.isInteger(y)) {
        return res.status(400).json({
          message: "Tháng hoặc năm không hợp lệ",
        });
      }

      const fromDate = new Date(y, m - 1, 1);
      const toDate = new Date(y, m, 1);

      filter.ngayDeNghi = {
        $gte: fromDate,
        $lt: toDate,
      };
    }

    const data = await DeNghiThanhToan.find(filter)
      .sort({
        ngayDeNghi: -1,
        maPhieu: -1,
      })
      .lean();

    res.json({
      data,
    });
  } catch (error) {
    console.error("getDeNghiThanhToan:", error);

    res.status(500).json({
      message: "Lỗi lấy danh sách phiếu",
      error: error.message,
    });
  }
};

/* =========================================================
   LẤY 1 PHIẾU
========================================================= */

exports.getOneDeNghiThanhToan = async (req, res) => {
  try {
    const { id } = req.params;

    const item = await DeNghiThanhToan.findById(id);

    if (!item) {
      return res.status(404).json({
        message: "Không tìm thấy phiếu",
      });
    }

    res.json({
      data: item,
    });
  } catch (error) {
    console.error("getOneDeNghiThanhToan:", error);

    res.status(500).json({
      message: "Lỗi lấy phiếu",
      error: error.message,
    });
  }
};

/* =========================================================
   SỬA
========================================================= */

exports.updateDeNghiThanhToan = async (req, res) => {
  try {
    const { id } = req.params;

    const {
      ngayDeNghi,
      nguoiDeNghi,
      maSoThue,
      nhaCungCap,
      stkNganHang,
      noiDungCK,
      hoaDonSo,
      nhomChiPhi,
      ghiChu,
      soTienTruocThue,
      thue,
      tongTien,
    } = req.body;

    const item = await DeNghiThanhToan.findById(id);

    if (!item) {
      return res.status(404).json({
        message: "Không tìm thấy phiếu",
      });
    }

    const user = req.user;

    if (ngayDeNghi !== undefined) {
      item.ngayDeNghi = ngayDeNghi;
    }

    if (nguoiDeNghi !== undefined) {
      item.nguoiDeNghi = nguoiDeNghi;
    }

    if (maSoThue !== undefined) {
      item.maSoThue = maSoThue;
    }

    if (nhaCungCap !== undefined) {
      item.nhaCungCap = nhaCungCap;
    }

    if (stkNganHang !== undefined) {
      item.stkNganHang = stkNganHang;
    }

    if (noiDungCK !== undefined) {
      item.noiDungCK = noiDungCK;
    }

    if (hoaDonSo !== undefined) {
      item.hoaDonSo = hoaDonSo;
    }

    if (nhomChiPhi !== undefined) {
      item.nhomChiPhi = nhomChiPhi;
    }

    if (ghiChu !== undefined) {
      item.ghiChu = ghiChu;
    }

    if (soTienTruocThue !== undefined) {
      item.soTienTruocThue = Number(soTienTruocThue) || 0;
    }

    if (thue !== undefined) {
      item.thue = Number(thue) || 0;
    }

    // Nếu FE truyền tổng tiền thì dùng tổng tiền đó
    // Không truyền thì tự tính
    if (tongTien !== undefined) {
      item.tongTien = Number(tongTien) || 0;
    } else {
      item.tongTien =
        (Number(item.soTienTruocThue) || 0) + (Number(item.thue) || 0);
    }

    item.updatedBy = user?.fullname || user?.username || "";

    await item.save();

    res.json({
      message: "Cập nhật phiếu thành công",
      data: item,
    });
  } catch (error) {
    console.error("updateDeNghiThanhToan:", error);

    res.status(500).json({
      message: "Lỗi cập nhật phiếu",
      error: error.message,
    });
  }
};

/* =========================================================
   XÓA
========================================================= */

exports.deleteDeNghiThanhToan = async (req, res) => {
  try {
    const { id } = req.params;

    const item = await DeNghiThanhToan.findById(id);

    if (!item) {
      return res.status(404).json({
        message: "Không tìm thấy phiếu",
      });
    }

    await DeNghiThanhToan.findByIdAndDelete(id);

    res.json({
      message: "Xóa phiếu thành công",
    });
  } catch (error) {
    console.error("deleteDeNghiThanhToan:", error);

    res.status(500).json({
      message: "Lỗi xóa phiếu",
      error: error.message,
    });
  }
};

/* =========================================================
   GHI LỊCH SỬ IN
========================================================= */

exports.printDeNghiThanhToan = async (req, res) => {
  try {
    const { id } = req.params;

    const item = await DeNghiThanhToan.findById(id);

    if (!item) {
      return res.status(404).json({
        message: "Không tìm thấy phiếu",
      });
    }

    const user = req.body.user;

    const nguoiIn = user?.fullname || user?.username || "Không xác định";

    item.lichSuIn.push({
      nguoiIn,
      ngayIn: new Date(),
    });

    await item.save();

    res.json({
      message: "Đã ghi nhận lịch sử in",
      data: item,
    });
  } catch (error) {
    console.error("printDeNghiThanhToan:", error);

    res.status(500).json({
      message: "Lỗi ghi lịch sử in",
      error: error.message,
    });
  }
};

/* =========================================================
   HỦY PHIẾU THANH TOÁN
========================================================= */

exports.cancelDeNghiThanhToan = async (req, res) => {
  try {
    const { id } = req.params;

    const item = await DeNghiThanhToan.findById(id);

    if (!item) {
      return res.status(404).json({
        message: "Không tìm thấy phiếu",
      });
    }

    item.huyPhieuTT = true;

    await item.save();

    res.json({
      message: "Đã hủy phiếu thanh toán",
      data: item,
    });
  } catch (error) {
    console.error("cancelDeNghiThanhToan:", error);

    res.status(500).json({
      message: "Lỗi hủy phiếu thanh toán",
      error: error.message,
    });
  }
};
