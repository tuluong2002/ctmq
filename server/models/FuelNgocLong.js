const mongoose = require("mongoose");

const FuelNgocLongSchema = new mongoose.Schema(
  {
    // ===== NGÀY =====
    dateFull: Date, // Ngày Tháng Năm
    day: Number, // Ngày

    // ===== XE =====
    vehiclePlate: String, // Biển số xe
    vehicleCode: String, // Mã xe

    // ===== NHIÊN LIỆU =====
    amount: Number, // Số tiền
    liter: Number, // Số lít
    mayDo: String, // Máy đổ

    cumulativeMechanical1: Number, // Số điện tử máy 1
    cumulativeMechanical2: Number, // Số điện tử máy 2

    checkElectronic1: Number, // Check số điện tử máy 1
    checkElectronic2: Number, // Check số điện tử máy 2

    // ===== GIÁ + TỒN =====
    internalFuelPrice: Number, // Giá dầu Nội bộ đã gồm VAT
    fuelRemaining: Number, // Tồn dầu

    infoVehicle: String, // Thông tin xe
    placeFuel: String, // Nơi đổ dầu

    isDontMatchCP: {
      type: Boolean,
      default: false,
    },
  },
  { timestamps: true },
);

module.exports = mongoose.model("FuelNgocLong", FuelNgocLongSchema);
