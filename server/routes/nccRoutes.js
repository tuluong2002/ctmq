const express = require("express");
const router = express.Router();

const {
  getAllNCC,
  createNCC,
  updateNCC,
  deleteNCC,
  importNCC,
  deleteAllNCC,
} = require("../controllers/NCCController");

router.get("/", getAllNCC);

router.post("/", createNCC);

router.put("/:stt", updateNCC);

router.delete("/:stt", deleteNCC);

router.post("/import", importNCC);

router.delete("/delete-all", deleteAllNCC);

module.exports = router;
