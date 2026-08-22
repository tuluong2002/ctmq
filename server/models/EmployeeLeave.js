const mongoose = require("mongoose");

// =====================================================
// LỊCH SỬ SỬA NGÀY NGHỈ
// =====================================================
const LeaveHistorySchema = new mongoose.Schema(
  {
    // Thời điểm sửa
    thoiGianSua: {
      type: Date,
      default: Date.now,
    },

    // Người thực hiện sửa
    nguoiSua: {
      type: String,
      default: "",
    },

    // Dữ liệu cũ trước khi sửa
    ngayThang: {
      type: Date,
      default: null,
    },

    nguoiId: {
      type: String,
      default: null,
    },

    tenNguoi: {
      type: String,
      default: "",
    },

    loaiNghi: {
      type: String,
      default: "",
    },

    soNgayNghi: {
      type: Number,
      default: 0,
    },

    soGioNghi: {
      type: Number,
      default: 0,
    },

    lyDo: {
      type: String,
      default: "",
    },
  },
  {
    _id: true,
  },
);

// =====================================================
// MODEL NGÀY NGHỈ
// =====================================================
const EmployeeLeaveSchema = new mongoose.Schema(
  {
    // Ngày nghỉ
    ngayThang: {
      type: Date,
      required: true,
    },

    // ID nhân viên/lái xe
    nguoiId: {
      type: String,
      default: null,
    },

    // Tên nhân viên/lái xe
    tenNguoi: {
      type: String,
      required: true,
      trim: true,
    },

    // Loại nghỉ
    loaiNghi: {
      type: String,
      required: true,
    },

    // Số ngày nghỉ
    soNgayNghi: {
      type: Number,
      default: 0,
      min: 0,
    },

    // Số giờ nghỉ
    soGioNghi: {
      type: Number,
      default: 0,
      min: 0,
    },

    // Lý do nghỉ / ghi chú
    lyDo: {
      type: String,
      default: "",
      trim: true,
    },

    // Người tạo
    createdBy: {
      type: String,
      default: "",
    },

    // =================================================
    // LỊCH SỬ CÁC LẦN SỬA
    // =================================================
    lichSuSua: {
      type: [LeaveHistorySchema],
      default: [],
    },
  },
  {
    timestamps: true,
  },
);

// Index
EmployeeLeaveSchema.index({
  ngayThang: 1,
  tenNguoi: 1,
});

module.exports = mongoose.model("EmployeeLeave", EmployeeLeaveSchema);
