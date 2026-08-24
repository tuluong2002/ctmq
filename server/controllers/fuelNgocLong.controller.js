const ExcelJS = require("exceljs");
const FuelNgocLong = require("../models/FuelNgocLong");

/* =======================
   LẤY DỮ LIỆU CÓ THÊM FILTER
======================= */
exports.getAll = async (req, res) => {
  try {
    const { month, vehiclePlates } = req.query;

    const filter = {};

    // Lọc theo tháng
    if (month) {
      const [year, mon] = month.split("-");

      const startDate = new Date(
        Number(year),
        Number(mon) - 1,
        1
      );

      const endDate = new Date(
        Number(year),
        Number(mon),
        0,
        23,
        59,
        59,
        999
      );

      filter.dateFull = {
        $gte: startDate,
        $lte: endDate,
      };
    }

    // Lọc theo mảng vehiclePlate
    if (vehiclePlates) {
      let arr = [];

      try {
        arr = JSON.parse(vehiclePlates);

        if (!Array.isArray(arr)) {
          arr = [];
        }
      } catch {
        arr = [];
      }

      if (arr.length > 0) {
        filter.vehiclePlate = {
          $in: arr,
        };
      }
    }

    const data = await FuelNgocLong
      .find(filter)
      .sort({ dateFull: -1 });

    res.json(data);
  } catch (err) {
    res.status(500).json({
      message: err.message,
    });
  }
};


/* =======================
   LẤY DANH SÁCH VEHICLEPLATE DUY NHẤT
======================= */
exports.getUniqueVehiclePlates = async (req, res) => {
  try {
    const vehiclePlates =
      await FuelNgocLong.distinct(
        "vehiclePlate"
      );

    vehiclePlates.sort((a, b) =>
      String(a).localeCompare(
        String(b),
        undefined,
        {
          sensitivity: "base",
        }
      )
    );

    res.json(vehiclePlates);
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
    await FuelNgocLong.deleteMany({});

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
   PARSE NGÀY EXCEL
======================= */
function parseExcelDate(val) {
  if (!val) {
    return null;
  }

  // Đã là Date object
  if (val instanceof Date) {
    return val;
  }

  // ExcelJS object
  if (typeof val === "object") {
    val = val.text || val.result || null;
  }

  if (typeof val === "string") {
    const parts = val.split("/");

    if (parts.length === 3) {
      const [day, month, year] =
        parts.map(Number);

      if (
        !isNaN(day) &&
        !isNaN(month) &&
        !isNaN(year)
      ) {
        return new Date(
          year,
          month - 1,
          day
        );
      }
    }
  }

  return null;
}


/* =======================
   CHUYỂN SANG NUMBER
======================= */
function toNumber(val) {
  if (
    val === null ||
    val === undefined ||
    val === ""
  ) {
    return null;
  }

  // ExcelJS object
  if (typeof val === "object") {
    val = val.result ?? val.text ?? null;
  }

  if (typeof val === "number") {
    return isNaN(val) ? null : val;
  }

  if (typeof val !== "string") {
    return null;
  }

  let s = val.trim();

  if (!s) {
    return null;
  }

  // Không có số
  if (!/\d/.test(s)) {
    return null;
  }

  // Quy ước VN:
  // . = phân cách hàng nghìn
  // , = số thập phân
  s = s
    .replace(/\./g, "")
    .replace(",", ".");

  const num = Number(s);

  return isNaN(num) ? null : num;
}


/* =======================
   IMPORT EXCEL

   THỨ TỰ CỘT EXCEL:

   1  dateFull
   2  day
   3  vehiclePlate
   4  vehicleCode
   5  amount
   6  liter
   7  mayDo
   8  cumulativeMechanical1
   9  cumulativeMechanical2
   10 checkElectronic1
   11 checkElectronic2
   12 internalFuelPrice
   13 fuelRemaining
   14 infoVehicle
   15 placeFuel
======================= */
exports.importExcel = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        message: "Không có file Excel",
      });
    }

    const workbook =
      new ExcelJS.Workbook();

    await workbook.xlsx.load(
      req.file.buffer
    );

    const sheet =
      workbook.worksheets[0];

    if (!sheet) {
      return res.status(400).json({
        message: "File Excel không có sheet",
      });
    }

    let inserted = 0;
    let skipped = 0;

    const bulk = [];

    /*
      Nếu Excel có dòng tiêu đề ở dòng 1
      thì bắt đầu từ dòng 2.
    */
    for (
      let i = 2;
      i <= sheet.rowCount;
      i++
    ) {
      const row = sheet.getRow(i);

      /* =======================
         1. NGÀY
      ======================= */
      const dateFull =
        parseExcelDate(
          row.getCell(1).value
        );

      /* =======================
         2. NGÀY
      ======================= */
      const day = toNumber(
        row.getCell(2).value
      );

      /* =======================
         3. BIỂN SỐ XE
      ======================= */
      const rawVehiclePlate =
        row.getCell(3).value;

      let vehiclePlate =
        rawVehiclePlate;

      if (
        typeof vehiclePlate ===
        "object"
      ) {
        vehiclePlate =
          vehiclePlate.text ??
          vehiclePlate.result ??
          "";
      }

      vehiclePlate = String(
        vehiclePlate || ""
      ).trim();

      // Không có biển số => bỏ dòng
      if (!vehiclePlate) {
        skipped++;
        continue;
      }

      /* =======================
         4. MÃ XE
      ======================= */
      let vehicleCode =
        row.getCell(4).value;

      if (
        typeof vehicleCode ===
        "object"
      ) {
        vehicleCode =
          vehicleCode.text ??
          vehicleCode.result ??
          "";
      }

      vehicleCode = String(
        vehicleCode || ""
      ).trim();

      /* =======================
         5. SỐ TIỀN
      ======================= */
      const amount = toNumber(
        row.getCell(5).value
      );

      /* =======================
         6. SỐ LÍT
      ======================= */
      const liter = toNumber(
        row.getCell(6).value
      );

      /*
        Không phải dòng dữ liệu
        nếu thiếu các thông tin
        bắt buộc.
      */
      if (
        !dateFull ||
        day === null ||
        amount === null ||
        liter === null
      ) {
        skipped++;
        continue;
      }

      /* =======================
         7. MÁY ĐỔ
      ======================= */
      let mayDo =
        row.getCell(7).value;

      if (
        typeof mayDo ===
        "object"
      ) {
        mayDo =
          mayDo.text ??
          mayDo.result ??
          "";
      }

      mayDo = String(
        mayDo || ""
      ).trim();

      /* =======================
         8. CỘNG DỒN CƠ MÁY 1
      ======================= */
      const cumulativeMechanical1 =
        toNumber(
          row.getCell(8).value
        );

      /* =======================
         9. CỘNG DỒN CƠ MÁY 2
      ======================= */
      const cumulativeMechanical2 =
        toNumber(
          row.getCell(9).value
        );

      /* =======================
         10. CHECK ĐIỆN TỬ MÁY 1
      ======================= */
      const checkElectronic1 =
        toNumber(
          row.getCell(10).value
        );

      /* =======================
         11. CHECK ĐIỆN TỬ MÁY 2
      ======================= */
      const checkElectronic2 =
        toNumber(
          row.getCell(11).value
        );

      /* =======================
         12. GIÁ DẦU NỘI BỘ
      ======================= */
      const internalFuelPrice =
        toNumber(
          row.getCell(12).value
        );

      /* =======================
         13. TỒN DẦU
      ======================= */
      const fuelRemaining =
        toNumber(
          row.getCell(13).value
        );

      /* =======================
         14. THÔNG TIN XE
      ======================= */
      let infoVehicle =
        row.getCell(14).value;

      if (
        typeof infoVehicle ===
        "object"
      ) {
        infoVehicle =
          infoVehicle.text ??
          infoVehicle.result ??
          "";
      }

      infoVehicle = String(
        infoVehicle || ""
      ).trim();

      /* =======================
         15. NƠI ĐỔ DẦU
      ======================= */
      let placeFuel =
        row.getCell(15).value;

      if (
        typeof placeFuel ===
        "object"
      ) {
        placeFuel =
          placeFuel.text ??
          placeFuel.result ??
          "";
      }

      placeFuel = String(
        placeFuel || ""
      ).trim();

      /* =======================
         PAYLOAD THEO ĐÚNG MODEL
      ======================= */
      bulk.push({
        dateFull,
        day,
        vehiclePlate,
        vehicleCode,
        amount,
        liter,
        mayDo,
        cumulativeMechanical1,
        cumulativeMechanical2,
        checkElectronic1,
        checkElectronic2,
        internalFuelPrice,
        fuelRemaining,
        infoVehicle,
        placeFuel,
      });
    }

    /* =======================
       INSERT BULK
    ======================= */
    if (bulk.length > 0) {
      await FuelNgocLong.insertMany(
        bulk
      );

      inserted = bulk.length;
    }

    res.json({
      success: true,
      inserted,
      skipped,
    });
  } catch (err) {
    console.error(
      "IMPORT FUEL NGOC LONG ERROR:",
      err
    );

    res.status(500).json({
      message: err.message,
    });
  }
};