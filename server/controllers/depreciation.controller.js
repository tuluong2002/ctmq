const ExcelJS = require("exceljs");
const Depreciation = require("../models/Depreciation");
const VehicleProfit = require("../models/VehicleProfit");

/* =======================
   LẤY TẤT CẢ DỮ LIỆU CÓ THÊM FILTER
   query: ?maTSCDs=["31A-123","29C-456"]
======================= */
exports.getAll = async (req, res) => {
  try {
    const { maTSCDs } = req.query;
    const filter = {};

    if (maTSCDs) {
      let arr = [];
      try {
        arr = JSON.parse(maTSCDs);
        if (!Array.isArray(arr)) arr = [];
      } catch {
        arr = [];
      }
      if (arr.length > 0) {
        filter.maTSCD = { $in: arr };
      }
    }

    const data = await Depreciation.find(filter).sort({ maTSCD: 1 });
    res.json(data);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

/* =======================
   LẤY DANH SÁCH maTSCD DUY NHẤT
======================= */
exports.getUniqueMaTSCD = async (req, res) => {
  try {
    const maTSCDs = await Depreciation.distinct("maTSCD");
    maTSCDs.sort((a, b) =>
      a.localeCompare(b, undefined, { sensitivity: "base" })
    );
    res.json(maTSCDs);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

/* =======================
   THÊM 1 BẢN GHI
======================= */
exports.create = async (req, res) => {
  try {
    const data = await Depreciation.create(req.body);
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
    const data = await Depreciation.findByIdAndUpdate(id, req.body, {
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
    await Depreciation.findByIdAndDelete(req.params.id);
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
    await Depreciation.deleteMany({});
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

/* =======================
   IMPORT EXCEL (THEO maTSCD)
   Ghi đè nếu trùng mã, thêm mới nếu chưa có
   Thứ tự cột:
   1 maTSCD | 2 tenTSCD | 3 ngayGhiTang | 4 soCT | 5 ngayStart
   6 timeSD | 7 timeSDremaining | 8 price | 9 valueKH
======================= */
exports.importExcel = async (req, res) => {
  try {
    if (!req.file)
      return res.status(400).json({ message: "Không có file Excel" });

    // mode: 1 = ghi đè | 2 = chỉ thêm mới
    const mode = Number(req.body.mode || 1);

    const workbook = new ExcelJS.Workbook();
    await workbook.xlsx.load(req.file.buffer);
    const sheet = workbook.worksheets[0];

    let totalValid = 0;
    let inserted = 0;
    let updated = 0;
    let skipped = 0;

    const parseNumber = (val) => {
      const num = Number(val);
      return isNaN(num) ? 0 : num;
    };

    for (let i = 2; i <= sheet.rowCount; i++) {
      const row = sheet.getRow(i);

      const maTSCD = row.getCell(1)?.value;
      if (!maTSCD || String(maTSCD).trim() === "") continue;

      const data = {
        maTSCD: String(maTSCD).trim(),
        tenTSCD: row.getCell(2)?.value || "",
        ngayGhiTang: row.getCell(3)?.value
          ? new Date(row.getCell(3).value)
          : null,
        soCT: row.getCell(4)?.value || "",
        ngayStart: row.getCell(5)?.value
          ? new Date(row.getCell(5).value)
          : null,
        timeSD: parseNumber(row.getCell(6)?.value),
        timeSDremaining: parseNumber(row.getCell(7)?.value),
        price: parseNumber(row.getCell(8)?.value),
        valueKH: parseNumber(row.getCell(9)?.value),
      };

      totalValid++;

      const exist = await Depreciation.findOne({ maTSCD: data.maTSCD });

      // ===== MODE 1: GHI ĐÈ =====
      if (mode === 1) {
        if (exist) {
          await Depreciation.updateOne({ maTSCD: data.maTSCD }, data);
          updated++;
        } else {
          await Depreciation.create(data);
          inserted++;
        }
      }

      // ===== MODE 2: CHỈ THÊM MỚI =====
      else if (mode === 2) {
        if (exist) {
          skipped++;
        } else {
          await Depreciation.create(data);
          inserted++;
        }
      }
    }

    res.json({
      success: true,
      mode,
      totalValid,
      inserted,
      updated,
      skipped,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: err.message });
  }
};

/* =========================================================
   CẬP NHẬT CHI PHÍ KHẤU HAO XE THEO THÁNG

   FE gửi:
   {
     month: "2026-05"
   }

   NGUỒN:
   Depreciation
      - maTSCD
      - ngayStart
      - timeSD
      - valueKH

   VehicleProfit
      - bsx
      - maLoiNhuan
      - cpKhauHaoXe

   LOGIC:
   - FE gửi tháng/năm
   - Tạo mã lợi nhuận: LN.THÁNG.NĂM
   - So maTSCD của Depreciation với bsx của VehicleProfit
   - VehicleProfit.bsx có thể có thêm text
   - Tách BSX thực tế trước khi so khớp
   - Nếu tháng cần tính nằm trong thời gian khấu hao:
        cộng valueKH vào cpKhauHaoXe
   - Chạy lại không bị cộng trùng
   - KHÔNG tính lại loiNhuan
========================================================= */

exports.updateVehicleProfitKhauHao = async (req, res) => {
  try {
    // =====================================================
    // 1. LẤY THÁNG FE GỬI XUỐNG
    // =====================================================

    const { month } = req.body;

    if (!month) {
      return res.status(400).json({
        success: false,
        message: "Vui lòng gửi tháng. Ví dụ: 2026-05",
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
        message: "Tháng không hợp lệ. Ví dụ: 2026-05",
      });
    }

    // =====================================================
    // 2. MÃ LỢI NHUẬN
    // =====================================================

    const maLoiNhuan = `LN.${monthNumber}.${year}`;

    // =====================================================
    // 3. THÁNG CẦN TÍNH
    //
    // Ví dụ:
    // 05/2026
    // => 2026 * 12 + 4
    // =====================================================

    const targetMonthIndex = year * 12 + (monthNumber - 1);

    // =====================================================
    // 4. LẤY DEPRECIATION
    // =====================================================

    const depreciations = await Depreciation.find({
      maTSCD: {
        $exists: true,
        $nin: [null, ""],
      },

      ngayStart: {
        $exists: true,
        $ne: null,
      },

      timeSD: {
        $gt: 0,
      },

      valueKH: {
        $ne: null,
      },
    }).lean();

    // =====================================================
    // 5. HÀM CHUẨN HOÁ BSX
    //
    // VD:
    //
    // 89H-121.123
    // => 89H121123
    //
    // 89H 121 123
    // => 89H121123
    // =====================================================

    const normalizeVehicleNo = (value) => {
      return String(value || "")
        .trim()
        .toUpperCase()
        .replace(/[\s\-–—.]/g, "");
    };

    // =====================================================
    // 6. HÀM LẤY BSX THỰC TẾ TỪ VehicleProfit.bsx
    //
    // VD:
    //
    // "89H121123"
    // => "89H121123"
    //
    // "89H121123 XE CON"
    // => "89H121123"
    //
    // "89H-121.123 - XE CON"
    // => "89H121123"
    // =====================================================

    const extractBsx = (value) => {
      const raw = String(value || "")
        .trim()
        .toUpperCase();

      if (!raw) {
        return "";
      }

      const normalized = raw.replace(/[\s\-–—.]/g, "");

      /*
        BSX dạng:

        89H121123
        89A16935
        29C12345

        2 số
        1-2 chữ
        5-6 số
      */

      const match = normalized.match(/\d{2}[A-Z]{1,2}\d{5,6}/);

      if (match) {
        return match[0];
      }

      // fallback
      return raw
        .split(/[\s\-–—]+/)[0]
        .replace(/[.\s\-–—]/g, "")
        .trim();
    };

    // =====================================================
    // 7. LẤY VEHICLE PROFIT CỦA THÁNG
    // =====================================================

    const vehicleProfits = await VehicleProfit.find({
      maLoiNhuan,
    }).lean();

    // =====================================================
    // 8. CHUẨN HOÁ BSX VEHICLE PROFIT
    // =====================================================

    const normalizedProfits = vehicleProfits
      .map((profit) => {
        const bsx = extractBsx(profit.bsx);

        return {
          ...profit,
          normalizedBsx: bsx,
        };
      })
      .filter((profit) => profit.normalizedBsx);

    // =====================================================
    // 9. MAP KHẤU HAO THEO VEHICLE PROFIT
    // =====================================================

    const profitMap = new Map();

    let matchedCount = 0;
    let notMatchedCount = 0;

    let matchedAmount = 0;

    // =====================================================
    // 10. DUYỆT TỪNG DEPRECIATION
    // =====================================================

    for (const item of depreciations) {
      const maTSCD = normalizeVehicleNo(item.maTSCD);

      const valueKH = Number(item.valueKH || 0);
      const timeSD = Number(item.timeSD || 0);

      if (!maTSCD) {
        notMatchedCount++;
        continue;
      }

      if (!Number.isFinite(valueKH) || valueKH === 0) {
        continue;
      }

      if (!Number.isFinite(timeSD) || timeSD <= 0) {
        continue;
      }

      // ===================================================
      // NGÀY BẮT ĐẦU KHẤU HAO
      // ===================================================

      const startDate = new Date(item.ngayStart);

      if (isNaN(startDate.getTime())) {
        notMatchedCount++;
        continue;
      }

      const startMonthIndex =
        startDate.getFullYear() * 12 + startDate.getMonth();

      // ===================================================
      // THÁNG CUỐI CÙNG ĐƯỢC KHẤU HAO
      //
      // VD:
      //
      // ngayStart = 05/2026
      // timeSD = 36
      //
      // Bắt đầu:
      // 05/2026
      //
      // Kết thúc:
      // 04/2029
      // ===================================================

      const endMonthIndex = startMonthIndex + timeSD - 1;

      // ===================================================
      // KIỂM TRA THÁNG HIỆN TẠI CÓ ĐƯỢC KHẤU HAO KHÔNG
      // ===================================================

      if (
        targetMonthIndex < startMonthIndex ||
        targetMonthIndex > endMonthIndex
      ) {
        continue;
      }

      // ===================================================
      // TÌM VEHICLE PROFIT KHỚP BSX
      //
      // maTSCD phải nằm trong bsx đã chuẩn hoá
      // =====================================================

      const matchedProfits = normalizedProfits.filter((profit) => {
        return (
          maTSCD.includes(profit.normalizedBsx) ||
          profit.normalizedBsx.includes(maTSCD)
        );
      });

      // ===================================================
      // KHÔNG MATCH
      // =====================================================

      if (matchedProfits.length === 0) {
        notMatchedCount++;
        continue;
      }

      // ===================================================
      // MATCH
      // =====================================================

      const matchedProfit = matchedProfits[0];

      matchedCount++;
      matchedAmount += valueKH;

      const key = String(matchedProfit._id);

      if (!profitMap.has(key)) {
        profitMap.set(key, {
          id: matchedProfit._id,

          bsx: matchedProfit.bsx,

          maLoiNhuan: matchedProfit.maLoiNhuan,

          amount: 0,
        });
      }

      profitMap.get(key).amount += valueKH;
    }

    // =====================================================
    // 11. CẬP NHẬT cpKhauHaoXe
    //
    // QUAN TRỌNG:
    //
    // DÙNG $set
    //
    // Không dùng $inc để chạy lại nhiều lần
    // không bị cộng trùng.
    // =====================================================

    const bulkOps = [];

    for (const item of vehicleProfits) {
      const key = String(item._id);

      const khauHaoAmount = profitMap.get(key)?.amount || 0;

      bulkOps.push({
        updateOne: {
          filter: {
            _id: item._id,
          },

          update: {
            $set: {
              cpKhauHaoXe: khauHaoAmount,
            },
          },
        },
      });
    }

    // =====================================================
    // 12. BULK UPDATE
    //
    // CHỈ cập nhật:
    // cpKhauHaoXe
    //
    // KHÔNG cập nhật loiNhuan
    // =====================================================

    if (bulkOps.length > 0) {
      await VehicleProfit.bulkWrite(bulkOps);
    }

    // =====================================================
    // 13. RESPONSE
    // =====================================================

    return res.json({
      success: true,

      message: `Đã cập nhật chi phí khấu hao ${maLoiNhuan}`,

      month,

      maLoiNhuan,

      totalDepreciation: depreciations.length,

      matchedCount,

      notMatchedCount,

      matchedAmount,

      updatedCount: bulkOps.length,

      details: Array.from(profitMap.values()),
    });
  } catch (error) {
    console.error("LỖI UPDATE VEHICLE PROFIT KHẤU HAO:", error);

    return res.status(500).json({
      success: false,
      message: "Lỗi cập nhật chi phí khấu hao vào VehicleProfit",
      error: error.message,
    });
  }
};
