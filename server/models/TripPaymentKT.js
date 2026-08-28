const mongoose = require("mongoose");

const TripPaymentKTSchema = new mongoose.Schema({
  ngayThang: { type: Date, default: "" }, // Ngày tháng
  maXe: { type: String, default: "" }, //Mã xe
  totalMoney: { type: Number, default: 0 }, //Số tiền
  bienSoXe: { type: String, trim: true }, //Biển số xe
  tenLaiXe: { type: String, trim: true }, //Tên lái xe
  ghiChu: { type: String }, // Ghi chú
  isDontMatchCP: { type: Boolean, default: false},
});

const TripPaymentKT = mongoose.model("TripPaymentKT", TripPaymentKTSchema);

module.exports = TripPaymentKT;
