const TripPayment = require("../models/TripPayment");
const ScheduleAdmin = require("../models/ScheduleAdmin");
const SchCustomerOdd = require("../models/SchCustomerOdd");
const ExcelJS = require("exceljs");
const path = require("path");

// ===============================
// 🔧 CALC COST – KH LẺ
// ===============================
const num = (v) => Number(v) || 0;

const calcOddTotalFromBaseTrip = (t) =>
  num(t.cuocPhi) +
  num(t.bocXep) +
  num(t.ve) +
  num(t.hangVe) +
  num(t.luuCa) +
  num(t.luatChiPhiKhac) +
  num(t.themDiem);

const genDebtCodeFromDate = (date) => {
  const d = new Date(date);
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const yy = String(d.getFullYear()).slice(-2);
  return `CN.KL.${mm}.${yy}`;
};

// =====================================================
// 📌 TẠO CÔNG NỢ KH 26
// =====================================================
exports.createOddDebtByDate = async (req, res) => {
  try {
    const { startDate, endDate } = req.body;
    if (!startDate || !endDate)
      return res.status(400).json({ error: "Thiếu ngày" });

    const start = new Date(startDate);
    const end = new Date(endDate);
    end.setDate(end.getDate() + 1);

    const baseTrips = await ScheduleAdmin.find({
      maKH: "26",
      ngayGiaoHang: { $gte: start, $lt: end },
    }).lean();

    const docs = [];

    for (const t of baseTrips) {
      // 🚫 chuyến gốc đã gắn công nợ → không tạo nữa
      if (t.debtCode) continue;

      const existed = await SchCustomerOdd.findOne({ maChuyen: t.maChuyen });
      if (existed) continue;

      const tongTien = calcOddTotalFromBaseTrip(t);
      const daThanhToan = num(t.daThanhToan);
      const debtCode = genDebtCodeFromDate(t.ngayGiaoHang);

      docs.push({
        maChuyen: t.maChuyen,
        maKH: t.maKH,

        // ===== COPY =====
        tenLaiXe: t.tenLaiXe,
        bienSoXe: t.bienSoXe,
        dienGiai: t.dienGiai,
        ngayBocHang: t.ngayBocHang,
        ngayGiaoHang: t.ngayGiaoHang,
        diemXepHang: t.diemXepHang,
        diemDoHang: t.diemDoHang,
        soDiem: t.soDiem,
        trongLuong: t.trongLuong,
        ghiChu: t.ghiChu,

        cuocPhi: t.cuocPhi,
        bocXep: t.bocXep,
        ve: t.ve,
        hangVe: t.hangVe,
        luuCa: t.luuCa,
        luatChiPhiKhac: t.luatChiPhiKhac,
        themDiem: t.themDiem,

        daThanhToan,

        // ===== CÔNG NỢ =====
        debtCode,
        tongTien,
        conLai: tongTien - daThanhToan,
        status:
          tongTien - daThanhToan < 0
            ? "TRA_THUA"
            : tongTien - daThanhToan === 0
              ? "HOAN_TAT"
              : daThanhToan > 0
                ? "TRA_MOT_PHAN"
                : "CHUA_TRA",
      });

      // ✅ GẮN MÃ CÔNG NỢ CHO CHUYẾN GỐC
      await ScheduleAdmin.updateOne({ _id: t._id }, { $set: { debtCode } });
    }

    if (docs.length) await SchCustomerOdd.insertMany(docs);

    res.json({
      message: "Đã tạo công nợ KH lẻ",
      soChuyenTaoMoi: docs.length,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Lỗi tạo công nợ KH lẻ" });
  }
};

// =====================================================
// 📌 SYNC DỮ LIỆU TỪ CHUYẾN GỐC → KH LẺ (THEO NGÀY GIAO)
// =====================================================
exports.syncOddDebtByDate = async (req, res) => {
  try {
    const { startDate, endDate } = req.body;
    if (!startDate || !endDate) {
      return res.status(400).json({ error: "Thiếu ngày" });
    }

    const start = new Date(startDate);
    const end = new Date(endDate);
    end.setDate(end.getDate() + 1);

    // ==============================
    // 1️⃣ LẤY CHUYẾN KH LẺ THEO NGÀY
    // ==============================
    const oddTrips = await SchCustomerOdd.find({
      ngayGiaoHang: { $gte: start, $lt: end },
    }).lean();

    if (!oddTrips.length) {
      return res.json({
        message: "Không có chuyến KH lẻ cần sync",
        soChuyenCapNhat: 0,
      });
    }

    const maChuyens = oddTrips.map((t) => t.maChuyen);

    // ==============================
    // 2️⃣ LẤY CHUYẾN GỐC THEO maChuyen
    // ==============================
    const baseTrips = await ScheduleAdmin.find({
      maChuyen: { $in: maChuyens },
    }).lean();

    const baseTripMap = {};
    baseTrips.forEach((t) => {
      baseTripMap[t.maChuyen] = t;
    });

    const updateOddOps = [];
    const deleteOddOps = [];
    const resetDebtCodeOps = [];

    // ==============================
    // 3️⃣ SO SÁNH & XỬ LÝ
    // ==============================
    for (const odd of oddTrips) {
      if (odd.isLocked) continue;

      const base = baseTripMap[odd.maChuyen];

      // ❌ không còn chuyến gốc → bỏ
      if (!base) continue;

      // ❌ KHÔNG CÒN LÀ KH LẺ
      if (base.maKH !== "26") {
        deleteOddOps.push({
          deleteOne: {
            filter: { _id: odd._id },
          },
        });

        resetDebtCodeOps.push({
          updateOne: {
            filter: { _id: base._id },
            update: { $set: { debtCode: "" } },
          },
        });

        continue;
      }

      // ==============================
      // ✅ CÒN LÀ KH LẺ → SYNC
      // ==============================
      const tongTien = calcOddTotalFromBaseTrip(base);
      const daThanhToan = num(base.daThanhToan);
      const conLai = tongTien - daThanhToan;

      updateOddOps.push({
        updateOne: {
          filter: { _id: odd._id },
          update: {
            $set: {
              tenLaiXe: base.tenLaiXe,
              bienSoXe: base.bienSoXe,
              dienGiai: base.dienGiai,
              ngayBocHang: base.ngayBocHang,
              ngayGiaoHang: base.ngayGiaoHang,
              diemXepHang: base.diemXepHang,
              diemDoHang: base.diemDoHang,
              soDiem: base.soDiem,
              trongLuong: base.trongLuong,
              ghiChu: base.ghiChu,

              cuocPhi: base.cuocPhi,
              bocXep: base.bocXep,
              ve: base.ve,
              hangVe: base.hangVe,
              luuCa: base.luuCa,
              luatChiPhiKhac: base.luatChiPhiKhac,
              themDiem: base.themDiem,

              daThanhToan,
              tongTien,
              conLai,

              status:
                conLai < 0
                  ? "TRA_THUA"
                  : conLai === 0
                    ? "HOAN_TAT"
                    : daThanhToan > 0
                      ? "TRA_MOT_PHAN"
                      : "CHUA_TRA",
            },
          },
        },
      });
    }

    // ==============================
    // 4️⃣ BULK WRITE
    // ==============================
    if (updateOddOps.length) {
      await SchCustomerOdd.bulkWrite(updateOddOps);
    }

    if (deleteOddOps.length) {
      await SchCustomerOdd.bulkWrite(deleteOddOps);
    }

    if (resetDebtCodeOps.length) {
      await ScheduleAdmin.bulkWrite(resetDebtCodeOps);
    }

    res.json({
      message: "Đã sync KH lẻ theo chuyến phát sinh",
      soChuyenCapNhat: updateOddOps.length,
      soChuyenXoa: deleteOddOps.length,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Lỗi sync KH lẻ từ chuyến gốc" });
  }
};

// =====================================================
// 📌 LẤY CÔNG NỢ KHÁCH LẺ (KH = 26)
// + FILTER MẢNG FIELD
// + SORT ABC & SORT NGÀY GIAO
// =====================================================
const buildOddDebtFilter = (query) => {
  const andConditions = [];

  // ===== KH LẺ =====
  andConditions.push({ maKH: "26" });

  // ===== LỌC NGÀY GIAO (KHOẢNG) =====
  if (query.startDate || query.endDate) {
    const range = {};
    if (query.startDate) range.$gte = new Date(query.startDate);
    if (query.endDate) {
      const end = new Date(query.endDate);
      end.setHours(23, 59, 59, 999);
      range.$lte = end;
    }
    andConditions.push({ ngayGiaoHang: range });
  }

  // ===== FILTER MẢNG (CÓ __EMPTY__) =====
  const ARRAY_FIELDS = {
    nameCustomer: "nameCustomer",
    tenLaiXe: "tenLaiXe",
    bienSoXe: "bienSoXe",
    dienGiai: "dienGiai",
    cuocPhi: "cuocPhi",
    daThanhToan: "daThanhToan",
    ngayGiaoHang: "ngayGiaoHang",
  };

  for (const [queryKey, field] of Object.entries(ARRAY_FIELDS)) {
    let values = query[queryKey] || query[`${queryKey}[]`];
    if (!values) continue;
    if (!Array.isArray(values)) values = [values];

    const hasEmpty = values.includes("__EMPTY__");

    const normalValues = values.filter((v) => v && v !== "__EMPTY__");

    const orConditions = [];

    // ===== RIÊNG NGÀY =====
    if (field === "ngayGiaoHang" && normalValues.length) {
      const dateOr = normalValues.map((d) => {
        const start = new Date(d);
        const end = new Date(d);
        end.setHours(23, 59, 59, 999);
        return { ngayGiaoHang: { $gte: start, $lte: end } };
      });
      orConditions.push({ $or: dateOr });
    }

    // ===== FIELD THƯỜNG =====
    if (field !== "ngayGiaoHang" && normalValues.length) {
      orConditions.push({ [field]: { $in: normalValues } });
    }

    // ===== EMPTY =====
    if (hasEmpty) {
      orConditions.push({
        $or: [
          { [field]: { $exists: false } },
          { [field]: null },
          { [field]: "" },
        ],
      });
    }

    if (orConditions.length === 1) {
      andConditions.push(orConditions[0]);
    } else if (orConditions.length > 1) {
      andConditions.push({ $or: orConditions });
    }
  }

  // ===== TEXT SEARCH =====
  const TEXT_FIELDS = [
    "ghiChu",
    "noteOdd",
    "maChuyen",
    "diemXepHang",
    "diemDoHang",
    "soDiem",
  ];

  TEXT_FIELDS.forEach((f) => {
    if (query[f]) {
      andConditions.push({
        [f]: { $regex: query[f], $options: "i" },
      });
    }
  });

  // ===== NUMBER RANGE =====
  const NUMBER_FIELDS = ["tongTien", "conLai"];

  NUMBER_FIELDS.forEach((f) => {
    const from = query[`${f}From`];
    const to = query[`${f}To`];
    if (from || to) {
      const cond = {};
      if (from) cond.$gte = Number(from);
      if (to) cond.$lte = Number(to);
      andConditions.push({ [f]: cond });
    }
  });

  return andConditions.length ? { $and: andConditions } : {};
};

exports.getOddCustomerDebt = async (req, res) => {
  try {
    let { page = 1, limit = 50 } = req.query;

    page = Number(page);
    limit = Number(limit);
    const skip = (page - 1) * limit;

    const filter = buildOddDebtFilter(req.query);

    // ===== SORT =====
    let sortObj = {};
    if (req.query.sort) {
      try {
        let sort = req.query.sort;
        if (typeof sort === "string") sort = JSON.parse(sort);
        sort.forEach((s) => {
          if (s?.field) sortObj[s.field] = s.order === "asc" ? 1 : -1;
        });
      } catch {}
    }

    if (!Object.keys(sortObj).length) {
      sortObj = {
        ngayGiaoHang: -1,
        nameCustomer: 1,
      };
    }

    const [total, trips, sumResult] = await Promise.all([
      SchCustomerOdd.countDocuments(filter),
      SchCustomerOdd.find(filter).sort(sortObj).skip(skip).limit(limit).lean(),
      SchCustomerOdd.aggregate([
        { $match: filter },
        {
          $group: {
            _id: null,
            tongTien: { $sum: "$tongTien" },
            conLai: { $sum: "$conLai" },
          },
        },
      ]),
    ]);

    const list = await Promise.all(
      trips.map(async (t) => {
        const latestPayment = await TripPayment.findOne({
          maChuyenCode: t.maChuyen,
        })
          .sort({ createdAt: -1 })
          .lean();

        return {
          ...t,
          ngayCK: latestPayment?.createdDay || null,
          taiKhoanCK: latestPayment?.method || "",
          noiDungCK: latestPayment?.note || "",
        };
      }),
    );

    res.json({
      maKH: "26",
      soChuyen: total,
      page,
      limit,
      chiTietChuyen: list,
      tongTienAll: sumResult[0]?.tongTien || 0,
      conLaiAll: sumResult[0]?.conLai || 0,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Lỗi lấy công nợ KH lẻ" });
  }
};

// ==============================
// Lấy tất cả filter options theo khoảng ngày giao
// ==============================
exports.getAllOddDebtFilterOptions = async (req, res) => {
  try {
    const filter = buildOddDebtFilter(req.query);

    const fields = [
      "nameCustomer",
      "tenLaiXe",
      "bienSoXe",
      "dienGiai",
      "cuocPhi",
      "daThanhToan",
      "ngayGiaoHang",
    ];

    const result = {};

    await Promise.all(
      fields.map(async (field) => {
        // ===== NGÀY =====
        if (field === "ngayGiaoHang") {
          const values = await SchCustomerOdd.distinct(field, filter);

          const dates = values.filter(Boolean).map((d) => {
            const date = new Date(d);
            const y = date.getFullYear();
            const m = String(date.getMonth() + 1).padStart(2, "0");
            const day = String(date.getDate()).padStart(2, "0");
            return `${y}-${m}-${day}`;
          });

          const unique = [...new Set(dates)].sort();

          const hasEmpty = await SchCustomerOdd.exists({
            ...filter,
            $or: [{ ngayGiaoHang: { $exists: false } }, { ngayGiaoHang: null }],
          });

          if (hasEmpty) unique.unshift("__EMPTY__");

          result.ngayGiaoHang = unique;
          return;
        }

        // ===== FIELD THƯỜNG =====
        const values = await SchCustomerOdd.distinct(field, filter);

        const cleaned = values
          .map((v) => v?.toString().trim())
          .filter(Boolean)
          .sort();

        const hasEmpty = await SchCustomerOdd.exists({
          ...filter,
          $or: [
            { [field]: { $exists: false } },
            { [field]: null },
            { [field]: "" },
          ],
        });

        if (hasEmpty) cleaned.unshift("__EMPTY__");

        result[field] = cleaned;
      }),
    );

    res.json(result);
  } catch (err) {
    console.error("❌ Odd filter options error:", err);
    res.status(500).json({ error: err.message });
  }
};

// =====================================================
// 📌 LỊCH SỬ THANH TOÁN THEO CHUYẾN
// =====================================================
exports.getTripPaymentHistory = async (req, res) => {
  try {
    const { maChuyenCode } = req.params; // lấy maChuyenCode từ params
    if (!maChuyenCode) {
      return res.status(400).json({ error: "Thiếu maChuyenCode" });
    }

    const data = await TripPayment.find({ maChuyenCode }).sort({
      createdAt: -1,
    });

    res.json(data);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Không lấy được lịch sử thanh toán chuyến" });
  }
};

// =====================================================
// 📌 THÊM THANH TOÁN THEO CHUYẾN (CẬP NHẬT SCHEDULEADMIN)
// =====================================================
exports.addTripPayment = async (req, res) => {
  try {
    const { maChuyenCode, createdDay, amount, method, note, createdBy } =
      req.body;

    if (!maChuyenCode) {
      return res.status(400).json({ error: "Thiếu maChuyenCode" });
    }

    const numericAmount = Number(amount);

    if (Number.isNaN(numericAmount)) {
      return res.status(400).json({ error: "Amount không hợp lệ" });
    }

    // 2️⃣ Cập nhật SCH CUSTOMER ODD
    const oddTrip = await SchCustomerOdd.findOne({ maChuyen: maChuyenCode });
    if (!oddTrip) {
      return res.status(404).json({ error: "Không tìm thấy chuyến" });
    }

    if (oddTrip.isLocked) {
      return res.status(403).json({ error: "Chuyến đã bị khoá" });
    }

    const createdDayDate = createdDay
      ? new Date(createdDay + "T00:00:00.000Z")
      : new Date();

    // 1️⃣ Thêm payment
    const payment = await TripPayment.create({
      maChuyenCode,
      amount: Number(amount),
      method: method || "CASH",
      note: note || "",
      createdBy: createdBy || "",
      createdDay: createdDayDate,
    });

    const currentPaid = parseMoneyStr(oddTrip.daThanhToan); // number
    const payAmount = Number(amount) || 0;

    const newPaid = currentPaid + payAmount;

    // ✅ LƯU LẠI DẠNG STRING
    oddTrip.daThanhToan = newPaid.toString();

    oddTrip.conLai = Number(oddTrip.tongTien) - newPaid;

    oddTrip.status =
      oddTrip.conLai < 0
        ? "TRA_THUA"
        : oddTrip.conLai === 0
          ? "HOAN_TAT"
          : oddTrip.daThanhToan > 0
            ? "TRA_MOT_PHAN"
            : "CHUA_TRA";

    await oddTrip.save();

    res.json({
      message: "Đã thêm thanh toán",
      payment,
      daThanhToan: oddTrip.daThanhToan,
      conLai: oddTrip.conLai,
      status: oddTrip.status,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Không thể thêm thanh toán cho chuyến" });
  }
};

// =====================================================
// 📌 XOÁ THANH TOÁN THEO CHUYẾN (CẬP NHẬT LẠI ScheduleAdmin)
// =====================================================
exports.deleteTripPayment = async (req, res) => {
  try {
    const { paymentId } = req.params;
    if (!paymentId) {
      return res.status(400).json({ error: "Thiếu paymentId" });
    }

    const payment = await TripPayment.findById(paymentId);
    if (!payment) {
      return res.status(404).json({ error: "Không tìm thấy thanh toán" });
    }

    const { maChuyenCode, amount } = payment;

    const oddTrip = await SchCustomerOdd.findOne({ maChuyen: maChuyenCode });
    if (!oddTrip) {
      return res.status(404).json({ error: "Không tìm thấy chuyến" });
    }

    // 🚫 CHUYẾN ĐÃ KHOÁ → KHÔNG CHO XOÁ THANH TOÁN
    if (oddTrip.isLocked) {
      return res.status(403).json({
        error: "Chuyến đã bị khoá, không được xoá thanh toán",
      });
    }

    await payment.deleteOne();

    const currentPaid = parseMoneyStr(oddTrip.daThanhToan);
    const newPaid = Math.max(0, currentPaid - Number(amount));

    oddTrip.daThanhToan = newPaid.toString();
    oddTrip.conLai = Number(oddTrip.tongTien) - newPaid;

    if (oddTrip.daThanhToan < 0) oddTrip.daThanhToan = 0;

    oddTrip.conLai = oddTrip.tongTien - oddTrip.daThanhToan;
    oddTrip.status =
      oddTrip.conLai < 0
        ? "TRA_THUA"
        : oddTrip.conLai === 0
          ? "HOAN_TAT"
          : oddTrip.daThanhToan > 0
            ? "TRA_MOT_PHAN"
            : "CHUA_TRA";

    await oddTrip.save();

    res.json({
      message: "Đã xoá thanh toán",
      maChuyen: maChuyenCode,
      daThanhToan: oddTrip.daThanhToan,
      conLai: oddTrip.conLai,
      status: oddTrip.status,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Không thể xoá thanh toán" });
  }
};

// =====================================================
// ✏️ CẬP NHẬT nameCustomer THEO DANH SÁCH CHUYẾN
// =====================================================
exports.updateTripNameCustomer = async (req, res) => {
  try {
    const { maChuyenList, nameCustomer } = req.body;

    if (!Array.isArray(maChuyenList) || maChuyenList.length === 0) {
      return res.status(400).json({ error: "maChuyenList không hợp lệ" });
    }

    if (nameCustomer === undefined) {
      return res.status(400).json({ error: "Thiếu nameCustomer" });
    }

    const result = await SchCustomerOdd.updateMany(
      {
        maChuyen: { $in: maChuyenList },
        isLocked: { $ne: true },
      },
      { $set: { nameCustomer } },
    );

    res.json({
      message: "Đã cập nhật nameCustomer cho các chuyến",
      matched: result.matchedCount,
      modified: result.modifiedCount,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Không thể cập nhật nameCustomer" });
  }
};

// =====================================================
// ✏️ CẬP NHẬT noteOdd THEO DANH SÁCH CHUYẾN
// =====================================================
exports.updateTripNoteOdd = async (req, res) => {
  try {
    const { maChuyenList, noteOdd } = req.body;

    if (!Array.isArray(maChuyenList) || maChuyenList.length === 0) {
      return res.status(400).json({ error: "maChuyenList không hợp lệ" });
    }

    // noteOdd cho phép rỗng => chỉ check undefined
    if (noteOdd === undefined) {
      return res.status(400).json({ error: "Thiếu noteOdd" });
    }

    const result = await SchCustomerOdd.updateMany(
      {
        maChuyen: { $in: maChuyenList },
        isLocked: { $ne: true },
      },
      { $set: { noteOdd } },
    );

    res.json({
      message: "Đã cập nhật noteOdd cho các chuyến",
      matched: result.matchedCount,
      modified: result.modifiedCount,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Không thể cập nhật noteOdd" });
  }
};

const parseMoneyStr = (v) => {
  if (v === null || v === undefined || v === "") return 0;
  const n = Number(String(v).replace(/,/g, ""));
  return isNaN(n) ? 0 : n;
};

// =====================================================
// ✏️ SỬA CÁC TRƯỜNG TIỀN – GIỮ STRING (KH LẺ)
// =====================================================
exports.updateOddTripMoney = async (req, res) => {
  try {
    const {
      maChuyen,
      cuocPhi,
      bocXep,
      ve,
      hangVe,
      luuCa,
      luatChiPhiKhac,
      themDiem,
      daThanhToan,
    } = req.body;

    if (!maChuyen) {
      return res.status(400).json({ error: "Thiếu maChuyen" });
    }

    const trip = await SchCustomerOdd.findOne({ maChuyen });
    if (!trip) {
      return res.status(404).json({ error: "Không tìm thấy chuyến" });
    }

    if (trip.isLocked) {
      return res.status(403).json({ error: "Chuyến đã bị khoá" });
    }

    // ✅ GHI STRING NGUYÊN VẸN (CHO PHÉP ÂM)
    if (cuocPhi !== undefined) trip.cuocPhi = cuocPhi;
    if (bocXep !== undefined) trip.bocXep = bocXep;
    if (ve !== undefined) trip.ve = ve;
    if (hangVe !== undefined) trip.hangVe = hangVe;
    if (luuCa !== undefined) trip.luuCa = luuCa;
    if (luatChiPhiKhac !== undefined) trip.luatChiPhiKhac = luatChiPhiKhac;
    if (themDiem !== undefined) trip.themDiem = themDiem;
    if (daThanhToan !== undefined) trip.daThanhToan = daThanhToan;

    // 🔢 PARSE TẠM ĐỂ TÍNH
    const tongTien =
      parseMoneyStr(trip.cuocPhi) +
      parseMoneyStr(trip.bocXep) +
      parseMoneyStr(trip.ve) +
      parseMoneyStr(trip.hangVe) +
      parseMoneyStr(trip.luuCa) +
      parseMoneyStr(trip.luatChiPhiKhac) +
      parseMoneyStr(trip.themDiem);

    const daTT = parseMoneyStr(trip.daThanhToan);
    const conLai = tongTien - daTT;

    trip.tongTien = tongTien;
    trip.conLai = conLai;

    // ✅ STATUS (LOGIC MÀY ĐANG DÙNG)
    if (tongTien === 0) {
      trip.status = "CHUA_TRA";
    } else if (conLai < 0) {
      trip.status = "TRA_THUA";
    } else if (conLai === 0) {
      trip.status = "HOAN_TAT";
    } else if (daTT !== 0) {
      trip.status = "TRA_MOT_PHAN";
    } else {
      trip.status = "CHUA_TRA";
    }

    await trip.save();

    res.json({
      message: "Đã cập nhật tiền chuyến",
      maChuyen,
      tongTien,
      daThanhToan: trip.daThanhToan,
      conLai,
      status: trip.status,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Lỗi sửa tiền chuyến KH lẻ" });
  }
};

// =====================================================
// 🔁 CHÈN KH LẺ → CHUYẾN GỐC THEO NGÀY GIAO
// =====================================================
exports.syncOddToBaseByDate = async (req, res) => {
  try {
    const { startDate, endDate } = req.body;
    if (!startDate || !endDate) {
      return res.status(400).json({ error: "Thiếu startDate hoặc endDate" });
    }

    const start = new Date(startDate);
    const end = new Date(endDate);
    end.setDate(end.getDate() + 1);

    // lấy toàn bộ odd trong khoảng ngày
    const oddTrips = await SchCustomerOdd.find({
      ngayGiaoHang: { $gte: start, $lt: end },
    }).lean();

    if (!oddTrips.length) {
      return res.json({
        message: "Không có chuyến KH lẻ trong khoảng ngày",
        soChuyenCapNhat: 0,
      });
    }

    const ops = [];

    for (const o of oddTrips) {
      ops.push({
        updateOne: {
          filter: { maChuyen: o.maChuyen },
          update: {
            $set: {
              // ===== MAP TIỀN BS =====
              cuocPhiBS: parseMoneyStr(o.cuocPhi),
              veBS: parseMoneyStr(o.ve),
              hangVeBS: parseMoneyStr(o.hangVe),
              luuCaBS: parseMoneyStr(o.luuCa),
              bocXepBS: parseMoneyStr(o.bocXep),
              cpKhacBS: parseMoneyStr(o.luatChiPhiKhac),

              // ===== GIỮ NGUYÊN =====
              themDiem: parseMoneyStr(o.themDiem),
              daThanhToan: parseMoneyStr(o.daThanhToan),
            },
          },
        },
      });
    }

    if (ops.length) {
      await ScheduleAdmin.bulkWrite(ops);
    }

    res.json({
      message: "Đã chèn chi phí KH lẻ vào chuyến gốc",
      soChuyenCapNhat: ops.length,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Lỗi sync KH lẻ → chuyến gốc" });
  }
};

// =====================================================
// HIGHLIGHT
// =====================================================
exports.updateHighlight = async (req, res) => {
  const { maChuyen, color } = req.body;

  await SchCustomerOdd.updateOne({ maChuyen }, { highlightColor: color || "" });

  res.json({ success: true });
};

// =====================================================
// 🔒 KHOÁ CHUYẾN KH LẺ THEO KHOẢNG NGÀY GIAO
// =====================================================
exports.lockOddTripsByDate = async (req, res) => {
  try {
    const { startDate, endDate } = req.body;
    if (!startDate || !endDate) {
      return res.status(400).json({ error: "Thiếu startDate hoặc endDate" });
    }

    const start = new Date(startDate);
    const end = new Date(endDate);
    end.setDate(end.getDate() + 1);

    const result = await SchCustomerOdd.updateMany(
      {
        ngayGiaoHang: { $gte: start, $lt: end },
      },
      { $set: { isLocked: true } },
    );

    res.json({
      message: "Đã khoá chuyến theo khoảng ngày giao",
      locked: result.modifiedCount,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Lỗi khoá chuyến theo ngày" });
  }
};

// =====================================================
// 🔁 TOGGLE KHOÁ / MỞ 1 CHUYẾN KH LẺ
// =====================================================
exports.toggleLockOddTrip = async (req, res) => {
  try {
    const { maChuyen } = req.body;
    if (!maChuyen) {
      return res.status(400).json({ error: "Thiếu maChuyen" });
    }

    const trip = await SchCustomerOdd.findOne({ maChuyen });
    if (!trip) {
      return res.status(404).json({ error: "Không tìm thấy chuyến" });
    }

    trip.isLocked = !trip.isLocked;
    await trip.save();

    res.json({
      message: trip.isLocked ? "Đã khoá chuyến" : "Đã mở khoá chuyến",
      maChuyen,
      isLocked: trip.isLocked,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Lỗi toggle khoá chuyến" });
  }
};

// ===================================
// XUẤT FILE EXCEL CÔNG NỢ KHÁCH LẺ
// ===================================
const STATUS_VI = {
  CHUA_TRA: "Chưa trả",
  TRA_MOT_PHAN: "Trả một phần",
  HOAN_TAT: "Hoàn tất",
  TRA_THUA: "Trả thừa",
};

const METHOD_VI = {
  PERSONAL_VCB: "VCB cá nhân",
  PERSONAL_TCB: "TCB cá nhân",
  COMPANY_VCB: "VCB công ty",
  COMPANY_TCB: "TCB công ty",
  CASH: "Tiền mặt",
  OTHER: "Khác",
};

const HIGHLIGHT_COLORS = {
  yellow: "#EEEE00",
  green: "#00EE00",
  blue: "#436EEE",
  pink: "#FF69B4",
  purple: "#FF83FA",
  orange: "#FFE4B5",
  red: "#FA8072",
  cyan: "#98F5FF",
  gray: "#9C9C9C",
  lime: "#54FF9F",
};

const getExcelARGBFromKey = (colorKey) => {
  if (!colorKey) return null;

  const key = String(colorKey).trim().toLowerCase();

  // nếu lưu thẳng hex trong DB
  if (key.startsWith("#")) {
    return "FF" + key.replace("#", "").toUpperCase();
  }

  const hex = HIGHLIGHT_COLORS[key];
  if (!hex) return null;

  return "FF" + hex.replace("#", "").toUpperCase();
};

exports.exportOddDebtByDateRange = async (req, res) => {
  try {
    const { from, to } = req.body;
    if (!from || !to) {
      return res.status(400).json({ message: "Thiếu from hoặc to" });
    }

    const fromDate = new Date(from + "T00:00:00");
    const toDate = new Date(to + "T23:59:59");

    const trips = await SchCustomerOdd.find({
      maKH: "26",
      ngayGiaoHang: { $gte: fromDate, $lte: toDate },
    })
      .sort({ ngayGiaoHang: 1 })
      .lean();

    if (!trips.length) {
      return res.status(400).json({ message: "Không có dữ liệu KH lẻ" });
    }

    const workbook = new ExcelJS.Workbook();
    await workbook.xlsx.readFile(
      path.join(__dirname, "../templates/DSC_KL.xlsx"),
    );

    const sheet = workbook.getWorksheet("Sheet1");
    const startRow = 2;

    // ======================
    // GHI DỮ LIỆU + PAYMENT
    // ======================
    let rowIndex = startRow;

    for (const t of trips) {
      const row = sheet.getRow(rowIndex++);

      // 🔹 PAYMENT GẦN NHẤT
      const payment = await TripPayment.findOne({
        maChuyenCode: t.maChuyen,
      })
        .sort({ createdAt: -1 })
        .lean();

      const startCol = 1; // A
      const endCol = 28; // AB

      const argb = getExcelARGBFromKey(t.highlightColor);

      if (argb) {
        for (let col = startCol; col <= endCol; col++) {
          const cell = row.getCell(col);

          cell.style = {
            ...cell.style,
            fill: {
              type: "pattern",
              pattern: "solid",
              fgColor: { argb },
            },
          };
        }
      }

      row.getCell("A").value = t.maKH || "";
      row.getCell("B").value = t.maChuyen || "";
      row.getCell("C").value = t.tenLaiXe || "";
      row.getCell("D").value = t.nameCustomer || "KH LẺ";
      row.getCell("E").value = t.dienGiai || "";

      row.getCell("F").value = t.ngayBocHang ? new Date(t.ngayBocHang) : "";
      row.getCell("G").value = t.ngayGiaoHang ? new Date(t.ngayGiaoHang) : "";

      row.getCell("H").value = t.diemXepHang || "";
      row.getCell("I").value = t.diemDoHang || "";
      row.getCell("J").value = t.soDiem || "";
      row.getCell("K").value = t.trongLuong || "";
      row.getCell("L").value = t.bienSoXe || "";

      // ===== TIỀN KH LẺ =====
      row.getCell("M").value = parseMoneyStr(t.cuocPhi);
      const mixedValue = (v) => {
        if (v === null || v === undefined || v === "") return "";

        // nếu là number
        if (typeof v === "number") return v;

        const str = String(v).trim();

        // chỉ parse khi là số thật
        const cleaned = str.replace(/,/g, "");
        if (/^-?\d+(\.\d+)?$/.test(cleaned)) {
          return Number(cleaned);
        }

        // còn lại giữ nguyên text
        return str;
      };

      row.getCell("N").value = mixedValue(t.themDiem);
      row.getCell("O").value = mixedValue(t.bocXep);
      row.getCell("P").value = mixedValue(t.ve);
      row.getCell("Q").value = mixedValue(t.hangVe);
      row.getCell("R").value = mixedValue(t.luuCa);
      row.getCell("S").value = mixedValue(t.luatChiPhiKhac);
      row.getCell("T").value = t.ghiChu || "";
      row.getCell("U").value = t.tongTien;
      row.getCell("V").value = parseMoneyStr(t.daThanhToan);
      row.getCell("W").value = t.conLai;
      let statusText = "";

      // Ưu tiên logic tiền
      if (Number(t.tongTien) === 0) {
        statusText = STATUS_VI.CHUA_TRA;
      } else {
        statusText = STATUS_VI[t.status] || "";
      }

      row.getCell("X").value = statusText;

      // ===== THANH TOÁN (CÙNG DÒNG) =====
      row.getCell("Y").value = payment?.createdDay
        ? new Date(payment.createdDay)
        : "";
      row.getCell("Z").value = payment?.method
        ? METHOD_VI[payment.method] || payment.method
        : "";

      row.getCell("AA").value = payment?.note || "";

      row.getCell("AB").value = t.noteOdd || "";

      row.commit();
    }

    res.setHeader(
      "Content-Disposition",
      `attachment; filename=CONG_NO_KH_LE_${from}_DEN_${to}.xlsx`,
    );
    res.setHeader(
      "Content-Type",
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    );

    await workbook.xlsx.write(res);
    res.end();
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Lỗi xuất Excel công nợ KH lẻ" });
  }
};
