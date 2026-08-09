const mongoose = require("mongoose");

const scheduleErrorSchema = new mongoose.Schema(
  {
    // =========================
    // THÔNG TIN LẤY TỪ CHUYẾN GỐC
    // =========================

    maChuyen: {
      type: String,
      required: true,
      trim: true,
      index: true,
    },

    keToanPhuTrach: {
      type: String,
      default: "",
      trim: true,
    },

    maKH: {
      type: String,
      default: "",
      trim: true,
    },

    khachHang: {
      type: String,
      default: "",
      trim: true,
    },

    dienGiai: {
      type: String,
      default: "",
      trim: true,
    },

    ngayBocHang: {
      type: Date,
      default: null,
    },

    ngayGiaoHang: {
      type: Date,
      default: null,
    },

    diemXepHang: {
      type: String,
      default: "",
      trim: true,
    },

    diemDoHang: {
      type: String,
      default: "",
      trim: true,
    },

    soDiem: {
      type: String,
      default: "",
      trim: true,
    },

    trongLuong: {
      type: String,
      default: "",
      trim: true,
    },

    bienSoXe: {
      type: String,
      default: "",
      trim: true,
    },

    // =========================
    // THÔNG TIN SAI SÓT
    // =========================

    soTienDieuChinh: {
      type: Number,
      default: 0,
    },

    loaiLoi: {
      type: String,
      default: "",
      trim: true,
    },

    ghiChu: {
      type: String,
      default: "",
      trim: true,
    },

    phuongAnXuLy: {
      type: String,
      default: "",
      trim: true,
    },

    ngayXuLy: {
      type: Date,
      default: null,
    },

    trangThai: {
      type: String,
      enum: ["chuaXuLy", "daXuLy"],
      default: "chuaXuLy",
    },

    ngayTao: {
      type: Date,
      default: Date.now,
    },
  },
  {
    timestamps: true,
  },
);

// Nếu có ngày xử lý thì tự động chuyển trạng thái thành đã xử lý
scheduleErrorSchema.pre("save", function (next) {
  if (this.ngayXuLy) {
    this.trangThai = "daXuLy";
  } else {
    this.trangThai = "chuaXuLy";
  }

  next();
});

const ScheduleError = mongoose.model("ScheduleError", scheduleErrorSchema);

module.exports = ScheduleError;
