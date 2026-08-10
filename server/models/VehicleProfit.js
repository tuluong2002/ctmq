const mongoose = require("mongoose");

const vehicleProfitSchema = new mongoose.Schema(
  {
    // ==========================================
    // BIỂN SỐ XE
    // ==========================================
    bsx: {
      type: String,
      required: true,
      trim: true,
    },

    // ==========================================
    // MÃ LỢI NHUẬN
    // Ví dụ: LN.7.2026
    // ==========================================
    maLoiNhuan: {
      type: String,
      required: true,
      trim: true,
    },

    // ==========================================
    // CHI PHÍ
    // ==========================================
    chiPhi: {
      type: Number,
      default: 0,
    },

    // ==========================================
    // DOANH THU
    // ==========================================
    doanhThu: {
      type: Number,
      default: 0,
    },

    // ==========================================
    // LỢI NHUẬN
    // = DOANH THU - CHI PHÍ
    // ==========================================
    loiNhuan: {
      type: Number,
      default: 0,
    },
  },
  {
    timestamps: true,
  },
);

// ==========================================
// MỖI BIỂN SỐ + MÃ LỢI NHUẬN CHỈ CÓ 1 BẢN GHI
// ==========================================
vehicleProfitSchema.index(
  {
    bsx: 1,
    maLoiNhuan: 1,
  },
  {
    unique: true,
  },
);

module.exports = mongoose.model("VehicleProfit", vehicleProfitSchema);
