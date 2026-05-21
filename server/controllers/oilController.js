const OilRecord = require("../models/OilRecord");

const createOilRecord = async (req, res) => {
  try {
    const record = await OilRecord.create(req.body);
    res.status(201).json(record);
  } catch (err) {
    console.error("❌ Lỗi thêm bơm dầu:", err);
    res.status(500).json({ error: "Lỗi server khi thêm bơm dầu" });
  }
};

module.exports = { createOilRecord };
