const mongoose = require("mongoose");

const EmployeeLeaveSchema = new mongoose.Schema(
  {
    // Ngày nghỉ
    ngayThang: {
      type: Date,
      required: true,
    },

    // ID nhân viên/lái xe nếu FE có
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
    // Chỉ dùng cho Đi muộn / Về sớm
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
  },
  {
    timestamps: true,
  }
);

// Index để tìm theo ngày + người nhanh hơn
EmployeeLeaveSchema.index({
  ngayThang: 1,
  tenNguoi: 1,
});

module.exports = mongoose.model("EmployeeLeave", EmployeeLeaveSchema);