const mongoose = require("mongoose");

const DoanhThuTongSchema = new mongoose.Schema(
  {
    maLoiNhuan: {
      type: String,
      required: true,
      unique: true,
      index: true,
    },

    tongDoanhThu: {
      type: Number,
      default: 0,
    },

    tongChiPhiTheoXe: {
      type: Number,
      default: 0,
    },

    chiPhiKhac: {
      type: Number,
      default: 0,
    },

    loiNhuan: {
      type: Number,
      default: 0,
    },
  },
  {
    timestamps: true,
  }
);

module.exports = mongoose.model("DoanhThuTong", DoanhThuTongSchema);
