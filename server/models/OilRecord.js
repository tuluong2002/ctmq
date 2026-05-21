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
      enum: [1, 2],
      required: true,
    },

    bienSoXe: {
      type: String,
      required: true,
      trim: true,
    },

    tenLaiXe: {
      type: String,
      default: "",
      trim: true,
    },

    soLit: {
      type: Number,
      required: true,
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
  },
  {
    timestamps: true,
  },
);

module.exports = mongoose.model("OilRecord", oilRecordSchema);