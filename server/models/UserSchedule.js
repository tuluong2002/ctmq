const mongoose = require("mongoose");

const rowSchema = new mongoose.Schema({
  maLichTrinh: {
    type: String,
    unique: true,
    index: true,
  },
  bienSoXe: String,
  tenKhachHang: String,
  giayTo: String,
  noiDi: String,
  noiDen: String,
  trongLuongHang: String,
  soDiem: String,
  haiChieuVaLuuCa: String,
  an: String,
  tangCa: String,
  bocXep: String,
  ve: String,
  tienChuyen: String,
  chiPhiKhac: String,
  laiXeThuKhach: String,
  phuongAn: String,
});

const userScheduleSchema = new mongoose.Schema(
  {
    nguoiTao: String, // thêm duy nhất trường này

    tenLaiXe: String,
    ngayDi: Date,
    ngayVe: Date,
    tongTienLichTrinh: String,

    rows: [rowSchema],
  },
  { timestamps: true }
);

module.exports = mongoose.model(
  "UserSchedule",
  userScheduleSchema
);