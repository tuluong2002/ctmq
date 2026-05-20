const Customer = require("../models/Customer");
const XLSX = require("xlsx");
const mongoose = require("mongoose");
const fs = require("fs");
const path = require("path");
const ExcelJS = require("exceljs");
const ScheduleAdmin = require("../models/ScheduleAdmin");
const CustomerCommissionHistory = require("../models/CustomerCommissionHistory");

const toNum = (v) => Number(String(v || 0).replace(/[.,]/g, "")) || 0;

// ==============================
// DANH SÁCH
// ==============================
const listCustomers = async (req, res) => {
  try {
    const { q } = req.query;
    const filter = {};
    if (q) {
      const re = new RegExp(q, "i");
      filter.$or = [{ name: re }, { accountant: re }, { code: re }];
    }
    const customers = await Customer.find(filter).sort({ createdAt: -1 });
    res.json(customers);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Lỗi server khi lấy danh sách khách hàng" });
  }
};

// ==============================
// LẤY 1 KHÁCH HÀNG
// ==============================
const getCustomer = async (req, res) => {
  try {
    const { id } = req.params;
    if (!mongoose.isValidObjectId(id))
      return res.status(400).json({ error: "ID không hợp lệ" });
    const customer = await Customer.findById(id);
    if (!customer)
      return res.status(404).json({ error: "Không tìm thấy khách hàng" });
    res.json(customer);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Lỗi server" });
  }
};

// ==============================
// THÊM MỚI
// ==============================
const createCustomer = async (req, res) => {
  try {
    const body = req.body || {};
    const saved = await Customer.create({
      name: body.name,
      nameHoaDon: body.nameHoaDon,
      mstCCCD: body.mstCCCD,
      address: body.address,
      accountant: body.accountant,
      code: body.code,
      accUsername: body.accUsername,
      percentHH: body.percentHH,
      createdBy: req.user?.username || body.createdBy || "",
      diemDongHang: body.diemDongHang,
    });
    res.status(201).json(saved);
  } catch (err) {
    console.error("Lỗi khi tạo khách hàng:", err);
    res.status(500).json({ error: err.message });
  }
};

// ==============================
// CẬP NHẬT
// ==============================
const updateCustomer = async (req, res) => {
  try {
    const { id } = req.params;
    if (!mongoose.isValidObjectId(id))
      return res.status(400).json({ error: "ID không hợp lệ" });

    const body = req.body || {};

    const customer = await Customer.findOneAndUpdate(
      { _id: id },
      {
        name: body.name,
        nameHoaDon: body.nameHoaDon,
        mstCCCD: body.mstCCCD,
        address: body.address,
        accountant: body.accountant,
        code: body.code,
        accUsername: body.accUsername,
        diemDongHang: body.diemDongHang,
      },
      { new: true }
    );

    if (!customer)
      return res.status(404).json({ error: "Không tìm thấy khách hàng" });

    res.json(customer);
  } catch (err) {
    console.error("Lỗi khi cập nhật khách hàng:", err);
    res.status(500).json({ error: err.message });
  }
};

// ==============================
// XOÁ
// ==============================
const deleteCustomer = async (req, res) => {
  try {
    const { id } = req.params;
    if (!mongoose.isValidObjectId(id))
      return res.status(400).json({ error: "ID không hợp lệ" });
    const customer = await Customer.findById(id);
    if (!customer)
      return res.status(404).json({ error: "Không tìm thấy khách hàng" });

    await customer.deleteOne();
    res.json({ message: "Đã xóa thành công" });
  } catch (err) {
    console.error("Lỗi khi xóa khách hàng:", err);
    res.status(500).json({ error: err.message });
  }
};

// ==============================
// IMPORT TỪ EXCEL
// ==============================
const importCustomersFromExcel = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: "Chưa upload file Excel" });
    }

    const mode = req.query.mode || "add";
    // mode = add | overwrite

    const workbook = XLSX.read(req.file.buffer, { type: "buffer" });
    const sheet = workbook.Sheets[workbook.SheetNames[0]];
    const rows = XLSX.utils.sheet_to_json(sheet);

    let imported = 0;
    let updated = 0;
    let skipped = 0;
    const errors = [];

    for (const [idx, row] of rows.entries()) {
      try {
        const code = row["MÃ KH"];

        if (code === undefined || code === null || code === "") {
          skipped++;
          continue;
        }

        const data = {
          name: row["DANH SÁCH KHÁCH HÀNG"] || "",
          nameHoaDon: row["TÊN KHÁCH HÀNG TRÊN HÓA ĐƠN"] || "",
          mstCCCD: row["MST/CCCD CHỦ HỘ"] || "",
          address: row["ĐỊA CHỈ"] || "",
          accountant: row["GHI CHÚ"] || "",
          percentHH: row["%HH"] || 0,
          code: code,
          accUsername: row["User"] || "",
          diemDongHang: row["Điểm đóng hàng"] || ""
        };

        // CHECK TRÙNG THEO CODE
        const existing = await Customer.findOne({ code });

        if (!existing) {
          // thêm mới nếu chưa có
          await Customer.create(data);
          imported++;
        } else if (mode === "overwrite") {
          // ghi đè nếu mode=overwrite
          await Customer.findOneAndUpdate(
            { code },
            { $set: data },
            { new: true }
          );
          updated++;
        } else {
          // nếu mode=add thì bỏ qua khách trùng code
          skipped++;
        }
      } catch (err) {
        errors.push({ row: idx + 2, error: err.message });
      }
    }

    res.json({
      message: "Import hoàn tất",
      imported,
      updated,
      skipped,
      errors,
    });
  } catch (err) {
    console.error("Lỗi import Excel:", err);
    res.status(500).json({ error: err.message });
  }
};

// ⚠️ Toggle cảnh báo
const toggleWarning = async (req, res) => {
  try {
    const { id } = req.params;

    const schedule = await Customer.findById(id);
    if (!schedule) {
      return res.status(404).json({ error: "Không tìm thấy" });
    }

    // Đảo trạng thái cảnh báo
    schedule.warning = !schedule.warning;
    await schedule.save();

    res.json({
      success: true,
      message: schedule.warning ? "Đã bật cảnh báo" : "Đã tắt cảnh báo",
      warning: schedule.warning,
    });
  } catch (err) {
    console.error("❌ Lỗi toggle cảnh báo:", err);
    res.status(500).json({ error: err.message });
  }
};

// ==============================
// ✅ XUẤT EXCEL THEO FORM MẪU
// ==============================
// Hàm convert string số → number an toàn
function cleanNumber(value) {
  if (value === null || value === undefined || value === "") return 0;
  if (typeof value === "number") return value;

  const cleaned = String(value).replace(/[^\d-]/g, "");
  const num = Number(cleaned);
  return isNaN(num) ? 0 : num;
}

function getRowSchema(sheet, sourceRowNumber) {
  const row = sheet.getRow(sourceRowNumber);
  const schema = {};

  row.eachCell({ includeEmpty: true }, (cell, colNumber) => {
    schema[colNumber] = {
      numFmt: cell.numFmt || null,
      style: JSON.parse(JSON.stringify(cell.style || {})),
      type: cell.type, // VERY IMPORTANT
    };
  });

  return schema;
}

const exportTripsByCustomer = async (req, res) => {
  try {
    const { maKH } = req.params;
    const { from, to } = req.query;

    if (!maKH || !from || !to) {
      return res.status(400).json({ message: "Thiếu maKH, from hoặc to" });
    }

    const customer = await Customer.findOne({ code: maKH });
    if (!customer) {
      return res.status(404).json({ message: "Không tìm thấy khách hàng" });
    }

    const fromDate = new Date(from);
    const toDate = new Date(to);
    toDate.setHours(23, 59, 59, 999);

    const trips = await ScheduleAdmin.find({
      maKH,
      ngayGiaoHang: { $gte: fromDate, $lte: toDate },
    }).sort({ ngayGiaoHang: 1 });

    const workbook = new ExcelJS.Workbook();
    await workbook.xlsx.readFile(
      path.join(__dirname, "../templates/form_mau.xlsx")
    );

    const sheet = workbook.getWorksheet("BẢNG KÊ");

    // Header
    sheet.getCell("C6").value = customer.nameHoaDon || "";
    sheet.getCell("C7").value = customer.address || "";
    sheet.getCell("C8").value = customer.mstCCCD || "";

    // ==========================
    // SCHEMA
    // ==========================
    const startRow = 11;
    const templateRows = 7;

    const rowSchema = getRowSchema(sheet, startRow);

    if (trips.length > templateRows) {
      sheet.duplicateRow(startRow, trips.length - templateRows, true);
    }

    // ==========================
    // GHI DỮ LIỆU
    // ==========================
    trips.forEach((trip, index) => {
      const row = sheet.getRow(startRow + index);

      row.getCell("A").value = index + 1;

      // DATE – BẮT BUỘC LÀ Date object
      if (trip.ngayGiaoHang) {
        const d = new Date(trip.ngayGiaoHang);
        d.setHours(0, 0, 0, 0);
        row.getCell("B").value = d;
      } else {
        row.getCell("B").value = null;
      }

      row.getCell("C").value = trip.diemXepHang || "";
      row.getCell("D").value = trip.diemDoHang || "";
      row.getCell("E").value = trip.soDiem || "";
      row.getCell("F").value = trip.trongLuong || "";
      row.getCell("G").value = trip.bienSoXe || "";

      const cuocPhi = cleanNumber(trip.cuocPhiBS || trip.cuocPhi);
      const bocXep = cleanNumber(trip.bocXepBS || trip.bocXep);
      const ve = cleanNumber(trip.veBS || trip.ve);
      const hangVe = cleanNumber(trip.hangVeBS || trip.hangVe);
      const luuCa = cleanNumber(trip.luuCaBS || trip.luuCa);
      const cpKhac = cleanNumber(trip.cpKhacBS || trip.luatChiPhiKhac);

      row.getCell("H").value = cuocPhi;
      row.getCell("J").value = bocXep;
      row.getCell("K").value = ve;
      row.getCell("L").value = hangVe;
      row.getCell("M").value = luuCa;
      row.getCell("N").value = cpKhac;

      row.getCell("O").value = cuocPhi + bocXep + ve + hangVe + luuCa + cpKhac;

      row.getCell("Q").value = trip.maChuyen || "";

      row.commit();
    });

    // ==========================
    // TỔNG
    // ==========================
    const lastRow = startRow + trips.length;

    let sumO = 0;
    for (let i = 0; i < trips.length; i++) {
      sumO += Number(sheet.getCell(`O${startRow + i}`).value) || 0;
    }

    const totalRow = lastRow <= 17 ? 18 : lastRow;
    const vatRow = totalRow + 1;
    const grandTotalRow = totalRow + 2;
    const signRow = totalRow + 4;

    sheet.getCell(`O${totalRow}`).value = sumO;
    sheet.getCell(`O${vatRow}`).value = Math.round(sumO * 0.08);
    sheet.getCell(`O${grandTotalRow}`).value = Math.round(sumO * 1.08);
    sheet.getCell(`I${signRow}`).value = customer.nameHoaDon || "";

    res.setHeader(
      "Content-Disposition",
      `attachment; filename=BANG_KE_${maKH}_${from}_den_${to}.xlsx`
    );
    res.setHeader(
      "Content-Type",
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
    );

    await workbook.xlsx.write(res);
    res.end();
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Lỗi xuất bảng kê" });
  }
};

// ==============================
// XOÁ TẤT CẢ KHÁCH HÀNG
// ==============================
const deleteAllCustomers = async (req, res) => {
  try {
    // Nếu muốn kiểm soát quyền, có thể check ở đây: req.user?.permissions
    await Customer.deleteMany({});
    res.json({ message: "Đã xóa tất cả khách hàng" });
  } catch (err) {
    console.error("Lỗi khi xóa tất cả khách hàng:", err);
    res.status(500).json({ error: err.message });
  }
};

// ==============================
// EXPORT DS KHÁCH HÀNG (FORM MẪU)
// ==============================
const exportCustomers = async (req, res) => {
  try {
    const includePercentHH = req.query.includePercentHH === "true";

    // 1️⃣ LẤY DATA
    const customers = await Customer.find({}).sort({ createdAt: 1 });

    if (!customers.length) {
      return res.status(400).json({ message: "Không có dữ liệu khách hàng" });
    }

    // 2️⃣ LOAD FORM MẪU
    const workbook = new ExcelJS.Workbook();
    await workbook.xlsx.readFile(
      path.join(__dirname, "../templates/DS_KHACH_HANG.xlsx")
    );

    const sheet = workbook.getWorksheet("DSKH");
    if (!sheet) {
      return res.status(500).json({ message: "Không tìm thấy sheet DSKH" });
    }

    // 3️⃣ GHI DATA
    const startRow = 2;

    customers.forEach((c, index) => {
      const row = sheet.getRow(startRow + index);

      if (includePercentHH) {
        // CÓ %HH
        row.getCell("A").value = c.code ?? "";
        row.getCell("B").value = c.name ?? "";
        row.getCell("C").value = c.nameHoaDon ?? "";
        row.getCell("D").value = c.mstCCCD ?? "";
        row.getCell("E").value = c.address ?? "";
        row.getCell("F").value = c.percentHH ?? 0;
        row.getCell("G").value = c.accountant ?? "";
        row.getCell("H").value = c.accUsername ?? "";
        row.getCell("I").value = c.diemDongHang ?? ""
      } else {
        // ❌ KHÔNG %HH → DỒN CỘT
        row.getCell("A").value = c.code ?? "";
        row.getCell("B").value = c.name ?? "";
        row.getCell("C").value = c.nameHoaDon ?? "";
        row.getCell("D").value = c.mstCCCD ?? "";
        row.getCell("E").value = c.address ?? "";
        row.getCell("G").value = c.accountant ?? "";
        row.getCell("H").value = c.accUsername ?? "";
        row.getCell("I").value = c.diemDongHang ?? ""
      }

      row.commit();
    });

    // 4️⃣ TRẢ FILE
    res.setHeader(
      "Content-Disposition",
      "attachment; filename=DANH_SACH_KHACH_HANG.xlsx"
    );
    res.setHeader(
      "Content-Type",
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
    );

    await workbook.xlsx.write(res);
    res.end();
  } catch (err) {
    console.error("❌ Export customers error:", err);
    res.status(500).json({ message: "Lỗi xuất danh sách khách hàng" });
  }
};

// ==============================
// 🔥 CẬP NHẬT HOA HỒNG / TIỀN CHUYẾN (CÓ LỊCH SỬ)
// ==============================
const updateCustomerCommission = async (req, res) => {
  try {
    const { id } = req.params;
    const { percentHH = 0, oneTripMoney = 0, timeStart } = req.body;

    if (!mongoose.isValidObjectId(id)) {
      return res.status(400).json({ error: "ID không hợp lệ" });
    }

    if (!timeStart) {
      return res.status(400).json({ error: "Thiếu timeStart" });
    }

    const customer = await Customer.findById(id);
    if (!customer) {
      return res.status(404).json({ error: "Không tìm thấy khách hàng" });
    }

    const startDate = new Date(timeStart);

    // ===============================
    // 1️⃣ ĐÓNG LỊCH SỬ CŨ
    // ===============================
    const currentHistory = await CustomerCommissionHistory.findOne({
      customerCode: customer.code,
      endDate: null,
    });

    if (currentHistory) {
      currentHistory.endDate = startDate;
      await currentHistory.save();
    }

    // ===============================
    // 2️⃣ TẠO LỊCH SỬ MỚI
    // ===============================
    await CustomerCommissionHistory.create({
      customerCode: customer.code,
      percentHH: Number(percentHH) || 0,
      moneyPerTrip: Number(oneTripMoney) || 0,
      startDate,
      endDate: null,
      createdBy: req.user?.username || "",
    });

    // ===============================
    // 3️⃣ UPDATE CUSTOMER
    // ===============================
    customer.percentHH = Number(percentHH) || 0;
    customer.oneTripMoney = Number(oneTripMoney) || 0;
    customer.timeStart = startDate;
    await customer.save();

    // ===============================
    // 4️⃣ 🔥 UPDATE TẤT CẢ CHUYẾN
    // ===============================
    const schedules = await ScheduleAdmin.find({
      maKH: customer.code,
      isDeleted: false,
      ngayGiaoHang: { $gte: startDate },
    });

    for (const sch of schedules) {
      const cuocPhiBS = toNum(sch.cuocPhiBS);
      const themDiem = toNum(sch.themDiem);
      const hangVeBS = toNum(sch.hangVeBS);
      const veBS = toNum(sch.veBS);
      const bocXepBS = toNum(sch.bocXepBS);
      const luuCaBS = toNum(sch.luuCaBS);
      const cpKhacBS = toNum(sch.cpKhacBS);
      const cuocTraXN = toNum(sch.cuocTraXN);

      const baseHH = cuocPhiBS + themDiem + hangVeBS;
      const total =
        cuocPhiBS + themDiem + hangVeBS + veBS + bocXepBS + luuCaBS + cpKhacBS;

      if (Number(oneTripMoney) > 0) {
        // ✅ TÍNH THEO TIỀN / CHUYẾN
        sch.percentHH = 0;
        sch.moneyHH = Number(oneTripMoney);
        sch.moneyConLai = total - sch.moneyHH;
        sch.doanhThu = total - sch.moneyHH - cuocTraXN;
      } else {
        // ✅ TÍNH THEO %
        const percent = Number(percentHH) || 0;
        const moneyHH = Math.round((baseHH * percent) / 100);

        sch.percentHH = percent;
        sch.moneyHH = moneyHH;
        sch.moneyConLai = total - moneyHH;
        sch.doanhThu = total - sch.moneyHH - cuocTraXN;
      }

      await sch.save();
    }

    res.json({
      success: true,
      message: "Cập nhật hoa hồng & cập nhật chuyến thành công",
      updatedTrips: schedules.length,
    });
  } catch (err) {
    console.error("❌ updateCustomerCommission error:", err);
    res.status(500).json({ error: err.message });
  }
};

// ==============================
// 📜 LỊCH SỬ HOA HỒNG KHÁCH HÀNG
// ==============================
const getCustomerCommissionHistory = async (req, res) => {
  try {
    const { code } = req.params;

    if (!code) {
      return res.status(400).json({ error: "Thiếu mã khách hàng" });
    }

    const history = await CustomerCommissionHistory.find({
      customerCode: code,
    }).sort({ startDate: -1 });

    res.json(history);
  } catch (err) {
    console.error("❌ getCustomerCommissionHistory error:", err);
    res.status(500).json({ error: err.message });
  }
};

module.exports = {
  listCustomers,
  getCustomer,
  createCustomer,
  updateCustomer,
  deleteCustomer,
  importCustomersFromExcel,
  toggleWarning,
  exportTripsByCustomer,
  deleteAllCustomers,
  exportCustomers,
  updateCustomerCommission,
  getCustomerCommissionHistory,
};
