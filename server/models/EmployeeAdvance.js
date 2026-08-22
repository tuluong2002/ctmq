const mongoose = require("mongoose");

// =====================================================
// LỊCH SỬ SỬA KHOẢN ỨNG
// =====================================================
const AdvanceHistorySchema = new mongoose.Schema(
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

    soTienUng: {
      type: Number,
      default: 0,
    },

    lyDo: {
      type: String,
      default: "",
    },

    phuongAnXuLy: {
      type: String,
      default: "",
    },

    noiDungKhac: {
      type: String,
      default: "",
    },
  },
  {
    _id: true,
  },
);

// =====================================================
// MODEL KHOẢN ỨNG
// =====================================================
const EmployeeAdvanceSchema = new mongoose.Schema(
  {
    // Ngày ứng
    ngayThang: {
      type: Date,
      required: true,
    },

    // ID nhân viên/lái xe nếu có
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

    // Số tiền ứng
    soTienUng: {
      type: Number,
      required: true,
      min: 0,
    },

    // Lý do ứng / ghi chú
    lyDo: {
      type: String,
      default: "",
      trim: true,
    },

    // Phương án xử lý
    phuongAnXuLy: {
      type: String,
      enum: ["SALARY", "TRIP_PAYMENT", "OTHER"],
      required: true,
    },

    // Nội dung khi chọn "Khác"
    noiDungKhac: {
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
      type: [AdvanceHistorySchema],
      default: [],
    },
  },
  {
    timestamps: true,
  },
);

EmployeeAdvanceSchema.index({
  ngayThang: 1,
  tenNguoi: 1,
});

module.exports = mongoose.model("EmployeeAdvance", EmployeeAdvanceSchema);
