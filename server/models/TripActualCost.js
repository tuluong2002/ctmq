const mongoose = require("mongoose");

const tripActualCostSchema = new mongoose.Schema(
  {
    // =====================================================
    // THÔNG TIN CHUYẾN
    // =====================================================

    maChuyen: {
      type: String,
      required: true,
      trim: true,
      index: true,
    },

    tenLaiXe: {
      type: String,
      default: "",
      trim: true,
    },

    khachHang: {
      type: String,
      default: "",
      trim: true,
    },

    maKH: {
      type: String,
      default: "",
      trim: true,
    },

    ngayGiaoHang: { type: Date, default: null }, // NGÀY GIAO HÀNG

    accountUsername: { type: String, default: "" },

    // =====================================================
    // GIÁ TRỊ GỐC LẤY TỪ SCHEDULE ADMIN
    // =====================================================

    bocXep: {
      type: String,
      default: "",
    },

    ve: {
      type: String,
      default: "",
    },

    hangVe: {
      type: String,
      default: "",
    },

    luuCa: {
      type: String,
      default: "",
    },

    luatChiPhiKhac: {
      type: String,
      default: "",
    },

    // =====================================================
    // GIÁ TRỊ THỰC TẾ
    // =====================================================

    bocXepThucTe: {
      type: String,
      default: "",
    },

    veThucTe: {
      type: String,
      default: "",
    },

    hangVeThucTe: {
      type: String,
      default: "",
    },

    luuCaThucTe: {
      type: String,
      default: "",
    },

    luatChiPhiKhacThucTe: {
      type: String,
      default: "",
    },

    // =====================================================
    // CHÊNH LỆCH
    // = GIÁ TRỊ GỐC - GIÁ TRỊ THỰC TẾ
    // =====================================================

    bocXepChenhLech: {
      type: Number,
      default: 0,
    },

    veChenhLech: {
      type: Number,
      default: 0,
    },

    hangVeChenhLech: {
      type: Number,
      default: 0,
    },

    luuCaChenhLech: {
      type: Number,
      default: 0,
    },

    luatChiPhiKhacChenhLech: {
      type: Number,
      default: 0,
    },

    // =====================================================
    // TỔNG CHÊNH LỆCH
    // =====================================================

    tongChenhLech: {
      type: Number,
      default: 0,
    },

    note: { type: String, default: ""},

    // =====================================================
    // TRẠNG THÁI
    // false = chưa cập nhật về chuyến gốc
    // true  = đã cập nhật về chuyến gốc
    // =====================================================

    isTrue: {
      type: Boolean,
      default: false,
      index: true,
    },

    // Thời điểm cập nhật về chuyến gốc
    updatedToScheduleAt: {
      type: Date,
      default: null,
    },
  },
  {
    timestamps: true,
  },
);

// =====================================================
// INDEX
// =====================================================

tripActualCostSchema.index({
  maChuyen: 1,
});

tripActualCostSchema.index({
  isTrue: 1,
});

const TripActualCost = mongoose.model("TripActualCost", tripActualCostSchema);

module.exports = TripActualCost;
