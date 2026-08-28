const mongoose = require("mongoose");

const FuelDauNgoaiSchema = new mongoose.Schema(
  {
    dateFull: Date, // Ngày Tháng Năm
    day: Number, // Ngày
    vehicleNo: String, // Số xe
    vehicleCode: String, // Mã xe

    amount: Number, // Số tiền
    liter: Number, // Số lít

    fuelPrice: Number, // Giá dầu
    note: String, // Ghi chú
    infoVehicle: String, // Thông tin xe
    placeFuel: String, // Nơi đổ dầu

    isDontMatchCP: {
      type: Boolean,
      default: false,
    },
  },
  { timestamps: true },
);

module.exports = mongoose.model("FuelDauNgoai", FuelDauNgoaiSchema);
