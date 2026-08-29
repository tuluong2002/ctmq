const mongoose = require("mongoose");

const deNghiThanhToanSchema = new mongoose.Schema(
  {
    // ==========================================
    // MÃ SỐ PHIẾU
    // DNTT08.2026.0001
    // ==========================================
    maPhieu: {
      type: String,
      required: true,
      unique: true,
      trim: true,
    },

    // ==========================================
    // NGÀY ĐỀ NGHỊ
    // ==========================================
    ngayDeNghi: {
      type: Date,
      required: true,
    },

    // ==========================================
    // NGƯỜI ĐỀ NGHỊ
    // ==========================================
    nguoiDeNghi: {
      type: String,
      required: true,
      trim: true,
    },

    // ==========================================
    // MÃ SỐ THUẾ
    // ==========================================
    maSoThue: {
      type: String,
      trim: true,
      default: "",
    },

    // ==========================================
    // NHÀ CUNG CẤP
    // ==========================================
    nhaCungCap: {
      type: String,
      trim: true,
      default: "",
    },

    // ==========================================
    // SỐ TÀI KHOẢN NGÂN HÀNG
    // ==========================================
    stkNganHang: {
      type: String,
      trim: true,
      default: "",
    },

    // ==========================================
    // NỘI DUNG CHUYỂN KHOẢN
    // ==========================================
    noiDungCK: {
      type: String,
      trim: true,
      default: "",
    },

    // ==========================================
    // HÓA ĐƠN SỐ
    // ==========================================
    hoaDonSo: {
      type: String,
      trim: true,
      default: "",
    },

    // ==========================================
    // NHÓM CHI PHÍ
    // ==========================================
    nhomChiPhi: {
      type: String,
      trim: true,
      default: "",
    },

    // ==========================================
    // GHI CHÚ
    // ==========================================
    ghiChu: {
      type: String,
      trim: true,
      default: "",
    },

    // ==========================================
    // SỐ TIỀN ĐỀ NGHỊ TRƯỚC THUẾ
    // ==========================================
    soTienTruocThue: {
      type: Number,
      default: 0,
    },

    // ==========================================
    // THUẾ
    // ==========================================
    thue: {
      type: Number,
      default: 0,
    },

    // ==========================================
    // TỔNG TIỀN
    // ==========================================
    tongTien: {
      type: Number,
      default: 0,
    },

    // ==========================================
    // LỊCH SỬ IN
    // ==========================================
    lichSuIn: [
      {
        nguoiIn: {
          type: String,
          required: true,
        },

        ngayIn: {
          type: Date,
          default: Date.now,
        },
      },
    ],

    huyPhieuTT: { type: Boolean, default: false },

    // ==========================================
    // NGƯỜI TẠO / CẬP NHẬT
    // ==========================================
    createdBy: {
      type: String,
      default: "",
    },

    updatedBy: {
      type: String,
      default: "",
    },
  },
  {
    timestamps: true,
  }
);

// Index để lấy danh sách theo tháng nhanh hơn
deNghiThanhToanSchema.index({
  ngayDeNghi: 1,
});

module.exports = mongoose.model("DeNghiThanhToan", deNghiThanhToanSchema);
