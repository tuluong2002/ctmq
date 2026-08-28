const mongoose = require("mongoose");

const NCCSchema = new mongoose.Schema(
  {
    // =========================
    // MÃ NCC
    // =========================
    stt: {
      type: String,
      required: true,
      unique: true,
      trim: true,
    },

    // =========================
    // THÔNG TIN NGƯỜI BÁN
    // =========================
    mst: {
      type: String,
      trim: true,
      default: "",
    },

    tenNguoiBan: {
      type: String,
      trim: true,
      default: "",
    },

    stkNganHang: {
      type: String,
      trim: true,
      default: "",
    },

    // =========================
    // CHI PHÍ
    // =========================
    hangMuc: {
      type: String,
      trim: true,
      default: "",
    },

    chiTietChiPhi: {
      type: String,
      trim: true,
      default: "",
    },

    nguoiPhuTrach: {
      type: String,
      trim: true,
      default: "",
    },

    // =========================
    // HÓA ĐƠN
    // =========================
    xuatTu: {
      type: String,
      trim: true,
      default: "",
    },

    ghiChu: {
      type: String,
      trim: true,
      default: "",
    },
  },
  {
    timestamps: true,
  },
);

module.exports = mongoose.model("NCC", NCCSchema);
