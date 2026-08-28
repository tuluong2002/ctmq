const mongoose = require("mongoose");

const RepairSchema = new mongoose.Schema(
  {
    // ==========================================
    // MÃ SỬA XE
    // Format: SX.tháng.năm.xxxx
    // Ví dụ: SX.8.2026.0001
    // ==========================================
    repairCode: {
      type: String,
      required: true,
      unique: true,
      trim: true,
    },

    // ==========================================
    // MÃ SỐ THUẾ
    // ==========================================
    taxCode: {
      type: String,
      default: "",
      trim: true,
    },

    // ==========================================
    // ĐƠN VỊ SỬA CHỮA
    // ==========================================
    repairUnit: {
      type: String,
      required: true,
      trim: true,
    },

    // ==========================================
    // NGÀY SỬA CHỮA
    // ==========================================
    repairDate: {
      type: Date,
      default: Date.now,
    },

    // ==========================================
    // BIỂN SỐ XE
    // ==========================================
    vehiclePlate: {
      type: String,
      default: "",
      trim: true,
    },

    // ==========================================
    // CHI TIẾT SỬA CHỮA
    // ==========================================
    repairDetails: {
      type: String,
      default: "",
      trim: true,
    },

    // ==========================================
    // ĐƠN VỊ TÍNH
    // ==========================================
    unit: {
      type: String,
      default: "",
      trim: true,
    },

    // ==========================================
    // SỐ LƯỢNG
    // ==========================================
    quantity: {
      type: Number,
      default: 0,
      min: 0,
    },

    // ==========================================
    // ĐƠN GIÁ
    // ==========================================
    unitPrice: {
      type: Number,
      default: 0,
      min: 0,
    },

    // ==========================================
    // THÀNH TIỀN
    // quantity * unitPrice
    // ==========================================
    totalAmount: {
      type: Number,
      default: 0,
      min: 0,
    },

    // ==========================================
    // VAT
    // Lưu dạng số:
    // 6 = 6%
    // 8 = 8%
    // 10 = 10%
    // ==========================================
    vat: {
      type: Number,
      default: 0,
      min: 0,
    },

    // ==========================================
    // TỔNG CỘNG
    // Thành tiền + tiền VAT
    // ==========================================
    grandTotal: {
      type: Number,
      default: 0,
      min: 0,
    },

    // ==========================================
    // GHI CHÚ
    // ==========================================
    note: {
      type: String,
      default: "",
      trim: true,
    },

    // ==========================================
    // SỐ HÓA ĐƠN
    // ==========================================
    invoiceNumber: {
      type: String,
      default: "",
      trim: true,
    },

    // ==========================================
    // NGƯỜI PHỤ TRÁCH
    // ==========================================
    personInCharge: {
      type: String,
      default: "",
      trim: true,
    },

    // ==========================================
    // PHIẾU CHI SỐ
    // ==========================================
    paymentVoucherNumber: {
      type: String,
      default: "",
      trim: true,
    },

    // ==========================================
    // NGÀY THANH TOÁN
    // ==========================================
    paymentDate: {
      type: Date,
      default: null,
    },
  },
  {
    timestamps: true,
  }
);

module.exports = mongoose.model("Repair", RepairSchema);