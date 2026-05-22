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

module.exports = {
  createOilRecord,
};
