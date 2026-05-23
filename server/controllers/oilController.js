const OilRecord = require("../models/OilRecord");

const createOilRecord = async (req, res) => {
  try {
    const data = {
      ...req.body,

      mayDo: Number(req.body.mayDo),

      soLit: Number(req.body.soLit || 0),

      tongSoDauMay1: Number(req.body.tongSoDauMay1 || 0),

      tongSoDauMay2: Number(req.body.tongSoDauMay2 || 0),

      imageOil: Array.isArray(req.body.imageOil) ? req.body.imageOil : [],
    };

    const record = await OilRecord.create(data);

    res.status(201).json(record);
  } catch (err) {
    console.error("❌ Lỗi thêm bơm dầu:", err);

    res.status(500).json({
      error: "Lỗi server khi thêm bơm dầu",
    });
  }
};

// 📅 Lấy danh sách theo ngày
const getOilRecordsByDate = async (req, res) => {
  try {
    const { date } = req.query;

    if (!date) {
      return res.status(400).json({
        error: "Thiếu ngày",
      });
    }

    const startDate = new Date(date);
    startDate.setHours(0, 0, 0, 0);

    const endDate = new Date(date);
    endDate.setHours(23, 59, 59, 999);

    const records = await OilRecord.find({
      createdAt: {
        $gte: startDate,
        $lte: endDate,
      },
    }).sort({ createdAt: 1 });

    res.json(records);
  } catch (err) {
    console.error("❌ Lỗi lấy danh sách dầu theo ngày:", err);

    res.status(500).json({
      error: "Lỗi server khi lấy danh sách",
    });
  }
};

module.exports = {
  createOilRecord,
  getOilRecordsByDate,
};
