const ExcelJS = require("exceljs");
const FuelVinhKhuc = require("../models/FuelVinhKhuc");

/* =======================
   LẤY DỮ LIỆU CÓ THÊM FILTER
======================= */
exports.getAll = async (req, res) => {
  try {
    const { month, vehicleNos } = req.query;

    const filter = {};

    // Lọc theo tháng
    if (month) {
      const [year, mon] = month.split("-");

      const startDate = new Date(Number(year), Number(mon) - 1, 1);

      const endDate = new Date(Number(year), Number(mon), 0, 23, 59, 59, 999);

      filter.dateFull = {
        $gte: startDate,
        $lte: endDate,
      };
    }

    // Lọc theo mảng vehicleNo
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
        filter.vehicleNo = {
          $in: arr,
        };
      }
    }

    const data = await FuelVinhKhuc.find(filter).sort({ dateFull: -1 });

    res.json(data);
  } catch (err) {
    res.status(500).json({
      message: err.message,
    });
  }
};

/* =======================
   LẤY DANH SÁCH VEHICLENO DUY NHẤT
======================= */
exports.getUniqueVehicleNos = async (req, res) => {
  try {
    const vehicleNos = await FuelVinhKhuc.distinct("vehicleNo");

    vehicleNos.sort((a, b) =>
      a.localeCompare(b, undefined, {
        sensitivity: "base",
      }),
    );

    res.json(vehicleNos);
  } catch (err) {
    res.status(500).json({
      message: err.message,
    });
  }
};

/* =======================
   XOÁ TẤT CẢ
======================= */
exports.removeAll = async (req, res) => {
  try {
    await FuelVinhKhuc.deleteMany({});

    res.json({
      success: true,
    });
  } catch (err) {
    res.status(500).json({
      message: err.message,
    });
  }
};

/* =======================
   IMPORT EXCEL
   THỨ TỰ CỘT EXCEL:
   1. dateFull
   2. day
   3. vehicleNo
   4. vehicleCode
   5. amount
   6. liter
   7. fuelPrice
   8. note
   9. infoVehicle
   10. placeFuel
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

    if (!sheet) {
      return res.status(400).json({
        message: "File Excel không có sheet",
      });
    }

    let totalValid = 0;
    let inserted = 0;

    const bulk = [];

    for (let i = 2; i <= sheet.rowCount; i++) {
      const row = sheet.getRow(i);

      // =======================
      // LẤY THEO ĐÚNG THỨ TỰ MODEL
      // =======================

      const dateFull = row.getCell(1).value;
      const day = row.getCell(2).value;
      const vehicleNo = row.getCell(3).value;
      const vehicleCode = row.getCell(4).value;
      const amount = row.getCell(5).value;
      const liter = row.getCell(6).value;
      const fuelPrice = row.getCell(7).value;
      const note = row.getCell(8).value;
      const infoVehicle = row.getCell(9).value;
      const placeFuel = row.getCell(10).value;

      // Bỏ dòng không có số xe
      if (
        vehicleNo === null ||
        vehicleNo === undefined ||
        String(vehicleNo).trim() === ""
      ) {
        continue;
      }

      totalValid++;

      bulk.push({
        dateFull: dateFull || null,

        day:
          day !== null && day !== undefined && day !== "" ? Number(day) : null,

        vehicleNo: String(vehicleNo).trim(),

        vehicleCode:
          vehicleCode !== null && vehicleCode !== undefined
            ? String(vehicleCode).trim()
            : "",

        amount:
          amount !== null && amount !== undefined && amount !== ""
            ? Number(amount)
            : 0,

        liter:
          liter !== null && liter !== undefined && liter !== ""
            ? Number(liter)
            : 0,

        fuelPrice:
          fuelPrice !== null && fuelPrice !== undefined && fuelPrice !== ""
            ? Number(fuelPrice)
            : 0,

        note: note !== null && note !== undefined ? String(note).trim() : "",

        infoVehicle:
          infoVehicle !== null && infoVehicle !== undefined
            ? String(infoVehicle).trim()
            : "",

        placeFuel:
          placeFuel !== null && placeFuel !== undefined
            ? String(placeFuel).trim()
            : "",
      });
    }

    if (bulk.length > 0) {
      await FuelVinhKhuc.insertMany(bulk);
      inserted = bulk.length;
    }

    res.json({
      success: true,
      totalValid,
      inserted,
    });
  } catch (err) {
    console.error("IMPORT FUEL VINH KHUC ERROR:", err);

    res.status(500).json({
      message: err.message,
    });
  }
};
