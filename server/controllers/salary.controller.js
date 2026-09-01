const ExcelJS = require("exceljs");
const Salary = require("../models/Salary");
const VehicleProfit = require("../models/VehicleProfit");

/* =======================
   HELPER: RANGE THEO THÁNG
======================= */
function getMonthRange(month) {
  // month: "2025-01"
  const [y, m] = month.split("-");
  const start = new Date(Number(y), Number(m) - 1, 1);
  const end = new Date(Number(y), Number(m), 1);
  return { start, end };
}

/* =======================
   LẤY DỮ LIỆU (FILTER)
   - month: "YYYY-MM"
   - drivers: ["A","B"]
======================= */
exports.getAll = async (req, res) => {
  try {
    const { month, drivers } = req.query;
    const filter = {};

    // Lọc theo tháng
    if (month) {
      const { start, end } = getMonthRange(month);
      filter.ngayThang = { $gte: start, $lt: end };
    }

    // Lọc theo mảng tên lái xe
    if (drivers) {
      let arr = [];
      try {
        arr = JSON.parse(drivers);
        if (!Array.isArray(arr)) arr = [];
      } catch {
        arr = [];
      }
      if (arr.length > 0) {
        filter.tenNhanVien = { $in: arr };
      }
    }

    const data = await Salary.find(filter).sort({
      ngayThang: -1,
      stt: 1,
    });

    res.json(data);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

/* =======================
   LẤY DANH SÁCH TÊN LÁI XE DUY NHẤT
======================= */
exports.getUniqueDrivers = async (req, res) => {
  try {
    const names = await Salary.distinct("tenNhanVien");
    names.sort((a, b) =>
      a.localeCompare(b, undefined, { sensitivity: "base" }),
    );
    res.json(names);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

/* =======================
   THÊM
======================= */
exports.create = async (req, res) => {
  try {
    const data = await Salary.create(req.body);
    res.json(data);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

/* =======================
   SỬA
======================= */
exports.update = async (req, res) => {
  try {
    const { id } = req.params;
    const data = await Salary.findByIdAndUpdate(id, req.body, { new: true });
    res.json(data);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

/* =======================
   XOÁ 1
======================= */
exports.remove = async (req, res) => {
  try {
    await Salary.findByIdAndDelete(req.params.id);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

/* =======================
   XOÁ TẤT CẢ (THEO THÁNG)
======================= */
exports.removeAllByMonth = async (req, res) => {
  try {
    const { month } = req.query;
    if (!month) {
      return res.status(400).json({ message: "Thiếu month" });
    }

    const { start, end } = getMonthRange(month);
    const result = await Salary.deleteMany({
      ngayThang: { $gte: start, $lt: end },
    });

    res.json({ success: true, deletedCount: result.deletedCount });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

/* =======================
   IMPORT EXCEL
   - BẮT ĐẦU DÒNG 3
   - ĐÚNG THỨ TỰ MODEL
======================= */
function parseThangNam(value) {
  if (!value) return null;

  // Nếu Excel trả về Date thật (trường hợp khác)
  if (value instanceof Date) return value;

  const str = String(value).trim();

  // Match "Tháng 11/2025"
  const match = str.match(/Tháng\s*(\d{1,2})\s*\/\s*(\d{4})/i);
  if (!match) return null;

  const month = Number(match[1]); // 1-12
  const year = Number(match[2]);

  if (month < 1 || month > 12) return null;

  // Lấy ngày 01 của tháng
  return new Date(year, month - 1, 1);
}

exports.importExcel = async (req, res) => {
  try {
    if (!req.file)
      return res.status(400).json({ message: "Không có file Excel" });

    const workbook = new ExcelJS.Workbook();
    await workbook.xlsx.load(req.file.buffer);
    const sheet = workbook.worksheets[0];

    let totalValid = 0;
    let inserted = 0;
    const bulk = [];

    // Bắt đầu từ dòng 3
    for (let i = 3; i <= sheet.rowCount; i++) {
      const row = sheet.getRow(i);

      const tenNhanVien = row.getCell(4)?.value;
      if (!tenNhanVien || String(tenNhanVien).trim() === "") continue;

      totalValid++;
      const rawNgayThang = row.getCell(1)?.value;

      const ngayThangParsed = parseThangNam(rawNgayThang) || new Date();

      bulk.push({
        ngayThang: ngayThangParsed,

        bienSoXe: row.getCell(2)?.value || "",

        stt: Number(row.getCell(3)?.value || 0),
        tenNhanVien: String(tenNhanVien).trim(),

        soTaiKhoan: row.getCell(5)?.value || "",
        tenNganHang: row.getCell(6)?.value || "",

        luongThoaThuan: Number(row.getCell(7)?.value || 0),
        donGiaNgayCong: Number(row.getCell(8)?.value || 0),

        soNgayCongDiLam: Number(row.getCell(9)?.value || 0),
        tienCongDiLam: Number(row.getCell(10)?.value || 0),
        tienDienThoai: Number(row.getCell(11)?.value || 0),

        soNgayCongNghi: Number(row.getCell(12)?.value || 0),
        tienCongNghi: Number(row.getCell(13)?.value || 0),

        muoiPhanTramLuong: Number(row.getCell(14)?.value || 0),
        tongSo: Number(row.getCell(15)?.value || 0),
        soTienTamUng: Number(row.getCell(16)?.value || 0),
        bhxh: Number(row.getCell(17)?.value || 0),

        hoTroTienDienThoai: Number(row.getCell(18)?.value || 0),
        thuongLeTet: Number(row.getCell(19)?.value || 0),
        diMuonVeSom: Number(row.getCell(20)?.value || 0),
        damHieu: Number(row.getCell(21)?.value || 0),
        chuyenCan: Number(row.getCell(22)?.value || 0),

        soTienConDuocLinh: Number(row.getCell(23)?.value || 0),
        ghiChu: row.getCell(24)?.value || "",

        soTienLuongDaGiu: Number(row.getCell(25)?.value || 0),
        soTienLuongConPhaiGiu: Number(row.getCell(26)?.value || 0),
      });
    }

    if (bulk.length > 0) {
      await Salary.insertMany(bulk);
      inserted = bulk.length;
    }

    res.json({ success: true, totalValid, inserted });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: err.message });
  }
};

/* =========================================================
   CẬP NHẬT CHI PHÍ LƯƠNG THEO THÁNG

   FE gửi:
   {
     month: "2026-08"
   }

   LOGIC:
   - FE gửi tháng/năm
   - Tạo mã lợi nhuận: LN.THÁNG.NĂM
   - Chỉ lấy Salary trong đúng tháng đó
   - Đối chiếu Salary.bienSoXe với VehicleProfit.bsx
   - Cộng tongSo của các Salary cùng BSX
   - Ghi tổng vào cpLuong
   - Dùng $set để chạy nhiều lần không bị cộng trùng
========================================================= */

exports.updateVehicleProfitSalary = async (req, res) => {
  try {
    // =====================================================
    // 1. LẤY THÁNG FE GỬI XUỐNG
    // =====================================================

    const { month } = req.body;

    if (!month) {
      return res.status(400).json({
        success: false,
        message: "Vui lòng gửi tháng. Ví dụ: 2026-08",
      });
    }

    const [yearStr, monthStr] = String(month).split("-");

    const year = Number(yearStr);
    const monthNumber = Number(monthStr);

    if (
      !Number.isInteger(year) ||
      !Number.isInteger(monthNumber) ||
      monthNumber < 1 ||
      monthNumber > 12
    ) {
      return res.status(400).json({
        success: false,
        message: "Tháng không hợp lệ. Ví dụ: 2026-08",
      });
    }

    // =====================================================
    // 2. MÃ LỢI NHUẬN
    // =====================================================

    const maLoiNhuan = `LN.${monthNumber}.${year}`;

    // =====================================================
    // 3. NGÀY ĐẦU THÁNG / NGÀY ĐẦU THÁNG SAU
    // =====================================================

    const fromDate = new Date(year, monthNumber - 1, 1);
    const toDate = new Date(year, monthNumber, 1);

    // =====================================================
    // 4. LẤY SALARY TRONG THÁNG
    // =====================================================

    const salaries = await Salary.find({
      ngayThang: {
        $gte: fromDate,
        $lt: toDate,
      },

      bienSoXe: {
        $exists: true,
        $nin: [null, ""],
      },

      tongSo: {
        $ne: null,
      },
    }).lean();

    // =====================================================
    // 5. LẤY VEHICLE PROFIT CỦA ĐÚNG MÃ LỢI NHUẬN
    // =====================================================

    const vehicleProfits = await VehicleProfit.find({
      maLoiNhuan,
    }).lean();

    // =====================================================
    // 6. HÀM CHUẨN HOÁ BIỂN SỐ
    // =====================================================

    const normalizeBsx = (value) => {
      return String(value || "")
        .trim()
        .toUpperCase()
        .replace(/[\s\-–—.]/g, "");
    };

    // =====================================================
    // 7. GOM TỔNG tongSo THEO BIỂN SỐ
    // =====================================================

    const salaryMap = new Map();

    let totalSalary = 0;

    for (const salary of salaries) {
      const bsx = normalizeBsx(salary.bienSoXe);

      if (!bsx) continue;

      const tongSo = Number(salary.tongSo || 0);

      if (!Number.isFinite(tongSo)) continue;

      if (!salaryMap.has(bsx)) {
        salaryMap.set(bsx, 0);
      }

      salaryMap.set(bsx, salaryMap.get(bsx) + tongSo);

      totalSalary += tongSo;
    }

    // =====================================================
    // 8. BULK UPDATE VEHICLE PROFIT
    // =====================================================

    const bulkOps = [];

    let matchedCount = 0;
    let notMatchedCount = 0;
    let matchedAmount = 0;

    const details = [];

    for (const item of vehicleProfits) {
      const profitBsx = normalizeBsx(item.bsx);

      const salaryAmount = salaryMap.get(profitBsx) || 0;

      if (salaryAmount > 0) {
        matchedCount++;
        matchedAmount += salaryAmount;
      } else {
        notMatchedCount++;
      }

      bulkOps.push({
        updateOne: {
          filter: {
            _id: item._id,
          },

          update: {
            $set: {
              cpLuong: salaryAmount,
            },
          },
        },
      });

      details.push({
        _id: item._id,
        bsx: item.bsx,
        maLoiNhuan: item.maLoiNhuan,
        cpLuong: salaryAmount,
      });
    }

    // =====================================================
    // 9. UPDATE VEHICLE PROFIT
    // =====================================================

    if (bulkOps.length > 0) {
      await VehicleProfit.bulkWrite(bulkOps);
    }

    // =====================================================
    // 10. RESPONSE
    // =====================================================

    return res.json({
      success: true,

      message: `Đã cập nhật chi phí lương ${maLoiNhuan}`,

      maLoiNhuan,

      month,

      totalSalaryCount: salaries.length,

      totalVehicleProfit: vehicleProfits.length,

      totalSalary,

      matchedCount,

      notMatchedCount,

      matchedAmount,

      updatedCount: bulkOps.length,

      details,
    });
  } catch (error) {
    console.error("LỖI UPDATE VEHICLE PROFIT SALARY:", error);

    return res.status(500).json({
      success: false,
      message: "Lỗi cập nhật chi phí lương vào VehicleProfit",
      error: error.message,
    });
  }
};

exports.getVehicleProfitSalaryByMonth = async (req, res) => {
  try {
    const { month } = req.query;

    if (!month) {
      return res.status(400).json({
        message: "Vui lòng gửi tháng",
      });
    }

    // month = 2026-08
    const [year, mon] = month.split("-");

    const y = Number(year);
    const m = Number(mon);

    if (!Number.isInteger(y) || !Number.isInteger(m) || m < 1 || m > 12) {
      return res.status(400).json({
        message: "Tháng không hợp lệ. Ví dụ: 2026-08",
      });
    }

    // Mã lợi nhuận dạng LN.8.2026
    const maLoiNhuan = `LN.${m}.${y}`;

    const data = await VehicleProfit.find(
      {
        maLoiNhuan,
      },
      {
        _id: 1,
        maLoiNhuan: 1,
        bsx: 1,
        company: 1,
        cpLuong: 1,
      },
    )
      .sort({ bsx: 1 })
      .lean();

    return res.json(data);
  } catch (error) {
    console.error("Lỗi getVehicleProfitSalaryByMonth:", error);

    return res.status(500).json({
      message: "Lỗi lấy danh sách lợi nhuận lương theo tháng",
      error: error.message,
    });
  }
};
