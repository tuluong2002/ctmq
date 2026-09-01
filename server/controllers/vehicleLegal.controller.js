const ExcelJS = require("exceljs");
const VehicleLegal = require("../models/VehicleLegal");
const VehicleProfit = require("../models/VehicleProfit");

/* =======================
   LẤY DỮ LIỆU CÓ THÊM FILTER
   Lọc theo kỳ phân bổ:
   tháng chọn >= tháng ngayGhiTang
   và
   tháng chọn < tháng (ngayGhiTang + soKyPB)
======================= */
exports.getAll = async (req, res) => {
  try {
    const { month, vehicleNos } = req.query;

    const filter = {};

    if (month) {
      const [year, mon] = month.split("-").map(Number);

      if (!year || !mon || mon < 1 || mon > 12) {
        return res.status(400).json({
          message: "Tháng không hợp lệ",
        });
      }

      // Ngày đầu tháng được chọn
      const startMonth = new Date(year, mon - 1, 1);

      // Ngày đầu tháng tiếp theo
      const nextMonth = new Date(year, mon, 1);

      /*
       * Điều kiện:
       *
       * ngayGhiTang < tháng tiếp theo
       *
       * và
       *
       * ngayGhiTang + soKyPB tháng > tháng được chọn
       *
       * Ví dụ:
       * ngayGhiTang = 15/06/2026
       * soKyPB = 3
       *
       * => kỳ PB: 06/2026, 07/2026, 08/2026
       */

      filter.ngayGhiTang = {
        $lt: nextMonth,
      };

      filter.$expr = {
        $gt: [
          {
            $dateAdd: {
              startDate: "$ngayGhiTang",
              unit: "month",
              amount: "$soKyPB",
            },
          },
          startMonth,
        ],
      };
    }

    // Lọc theo mảng biển số xe
    if (vehicleNos) {
      let arr = [];

      try {
        arr = JSON.parse(vehicleNos);

        if (!Array.isArray(arr)) {
          arr = [];
        }
      } catch {
        arr = [];
      }

      if (arr.length > 0) {
        filter.bienSoXe = {
          $in: arr,
        };
      }
    }

    const data = await VehicleLegal.find(filter).sort({
      ngayGhiTang: -1,
    });

    res.json(data);
  } catch (err) {
    console.error("VehicleLegal getAll error:", err);

    res.status(500).json({
      message: err.message,
    });
  }
};

/* =======================
   LẤY DANH SÁCH BIỂN SỐ XE DUY NHẤT
======================= */
exports.getUniqueVehicleNos = async (req, res) => {
  try {
    const vehicleNos = await VehicleLegal.distinct("bienSoXe");
    vehicleNos.sort((a, b) =>
      a.localeCompare(b, undefined, { sensitivity: "base" }),
    );
    res.json(vehicleNos);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

/* =======================
   THÊM
======================= */
exports.create = async (req, res) => {
  try {
    const data = await VehicleLegal.create(req.body);
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
    const data = await VehicleLegal.findByIdAndUpdate(id, req.body, {
      new: true,
    });
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
    await VehicleLegal.findByIdAndDelete(req.params.id);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

/* =======================
   XOÁ TẤT CẢ
======================= */
exports.removeAll = async (req, res) => {
  try {
    await VehicleLegal.deleteMany({});
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

/* =======================
   IMPORT EXCEL
   - KHÔNG GHI ĐÈ
   - Trùng biển số xe vẫn thêm bản ghi mới
======================= */
exports.importExcel = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        message: "Không có file Excel",
      });
    }

    const workbook = new ExcelJS.Workbook();
    await workbook.xlsx.load(req.file.buffer);

    const sheet = workbook.worksheets[0];

    let totalValid = 0;
    let inserted = 0;

    const bulk = [];

    for (let i = 2; i <= sheet.rowCount; i++) {
      const row = sheet.getRow(i);

      const bienSoXe = row.getCell(3).value;

      // Bỏ dòng không có biển số xe
      if (!bienSoXe || String(bienSoXe).trim() === "") {
        continue;
      }

      totalValid++;

      bulk.push({
        maCCDC: row.getCell(1)?.value || "",
        tenCCDE: row.getCell(2)?.value || "",

        // Trùng biển số vẫn insert bản ghi mới
        bienSoXe: String(bienSoXe).trim(),

        typeCCDC: row.getCell(4)?.value || "",
        reason: row.getCell(5)?.value || "",

        ngayGhiTang: row.getCell(6)?.value || null,

        soCT: row.getCell(7)?.value || "",
        soKyPB: row.getCell(8)?.value || 0,
        soKyPBconlai: row.getCell(9)?.value || 0,

        valueCCDC: row.getCell(10)?.value || 0,
        valuePB: row.getCell(11)?.value || 0,

        pbk: row.getCell(12)?.value || 0,
        lkPB: row.getCell(13)?.value || 0,
        valueOld: row.getCell(14)?.value || 0,

        tkPB: row.getCell(15)?.value || "",
      });
    }

    // Không kiểm tra trùng -> luôn thêm mới
    if (bulk.length > 0) {
      const insertedData = await VehicleLegal.insertMany(bulk);
      inserted = insertedData.length;
    }

    res.json({
      success: true,
      totalValid,
      inserted,
      message: `Đã thêm ${inserted} dòng mới`,
    });
  } catch (err) {
    console.error("Import VehicleLegal Error:", err);

    res.status(500).json({
      message: err.message,
    });
  }
};
/* =======================
   CẬP NHẬT CHI PHÍ ĐK - ĐK - BH XE
======================= */
exports.updateVehicleProfitDKDKBH = async (req, res) => {
  try {
    const { month } = req.body;

    if (!month) {
      return res.status(400).json({
        message: "Thiếu tháng cần cập nhật",
      });
    }

    const [year, mon] = month.split("-").map(Number);

    if (!year || !mon || mon < 1 || mon > 12) {
      return res.status(400).json({
        message: "Tháng không hợp lệ",
      });
    }

    // Tháng đang tính, lấy ngày đầu tháng
    const targetMonth = new Date(year, mon - 1, 1);

    // Tháng tiếp theo
    const nextMonth = new Date(year, mon, 1);

    // Lấy tất cả CCDC
    const vehicleLegals = await VehicleLegal.find({});

    // Reset cpDKDKBH của tháng trước khi tính lại
    const maLoiNhuan = `LN.${mon}.${year}`;

    await VehicleProfit.updateMany(
      { maLoiNhuan },
      {
        $set: {
          cpDKDKBH: 0,
        },
      },
    );

    // Lưu tổng chi phí theo biển số
    const costByVehicle = {};

    for (const item of vehicleLegals) {
      if (!item.ngayGhiTang) continue;

      const soKyPB = Number(item.soKyPB || 0);
      const valueCCDC = Number(item.valueCCDC || 0);

      if (soKyPB <= 0 || valueCCDC <= 0) continue;

      const ngayGhiTang = new Date(item.ngayGhiTang);

      // Tháng bắt đầu phân bổ
      const startMonth = new Date(
        ngayGhiTang.getFullYear(),
        ngayGhiTang.getMonth(),
        1,
      );

      // Tháng kết thúc = tháng ghi tăng + số kỳ phân bổ
      const endMonth = new Date(
        ngayGhiTang.getFullYear(),
        ngayGhiTang.getMonth() + soKyPB,
        1,
      );

      /*
       * Điều kiện:
       *
       * targetMonth >= startMonth
       * và
       * targetMonth < endMonth
       *
       * => tháng đang tính nằm trong thời gian phân bổ
       */
      if (targetMonth >= startMonth && targetMonth < endMonth) {
        const chiPhiKy = valueCCDC / soKyPB;

        const bsx = String(item.bienSoXe || "").trim();

        if (!bsx) continue;

        if (!costByVehicle[bsx]) {
          costByVehicle[bsx] = 0;
        }

        costByVehicle[bsx] += chiPhiKy;
      }
    }

    // Cập nhật VehicleProfit
    let updated = 0;

    for (const [bsx, cpDKDKBH] of Object.entries(costByVehicle)) {
      const result = await VehicleProfit.updateOne(
        {
          maLoiNhuan,
          bsx: {
            $regex: bsx.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"),
            $options: "i",
          },
        },
        {
          $set: {
            cpDKDKBH,
          },
        },
      );

      if (result.modifiedCount > 0 || result.matchedCount > 0) {
        updated++;
      }
    }

    res.json({
      success: true,
      message: `Đã cập nhật chi phí ĐK - ĐK - BH xe tháng ${month} vào doanh thu`,
      maLoiNhuan,
      updated,
    });
  } catch (err) {
    console.error("updateVehicleProfitDKDKBH:", err);

    res.status(500).json({
      message: err.message,
    });
  }
};
