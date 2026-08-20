const mongoose = require("mongoose");

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
  },
  {
    timestamps: true,
  }
);

EmployeeAdvanceSchema.index({
  ngayThang: 1,
  tenNguoi: 1,
});

module.exports = mongoose.model("EmployeeAdvance", EmployeeAdvanceSchema);