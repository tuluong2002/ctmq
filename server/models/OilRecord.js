const mongoose = require("mongoose");

const oilRecordSchema = new mongoose.Schema(
  {
    ngay: {
      type: Date,
      required: true,
    },

    ca: {
      type: String,
      enum: ["Sáng", "Chiều"],
      required: true,
    },

    mayDo: {
      type: Number,
      enum: [1, 2, 3],
      required: true,
    },

    bienSoXe: {
      type: String,
      default: "",
    },

    tenLaiXe: {
      type: String,
      default: "",
    },

    soLit: {
      type: Number,
      default: 0,
      min: 0,
    },

    // ===== TỰ ĐIỀN =====
    tongSoDauMay1: {
      type: Number,
      default: 0,
    },

    tongSoDauMay2: {
      type: Number,
      default: 0,
    },

    imageOil: { type: [String], default: [] }, // ĐƯỜNG DẪN FILE ẢNH MÁY BƠM DẦU (REL PATH)
  },
  {
    timestamps: true,
  }
);

module.exports = mongoose.model("OilRecord", oilRecordSchema);
