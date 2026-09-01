const ExcelJS = require("exceljs");
const NCC = require("../models/NCC");

/* =========================================================
   HELPER
========================================================= */

const cleanValue = (value) => {
  if (value === null || value === undefined) {
    return "";
  }

  if (typeof value === "object" && value.result !== undefined) {
    value = value.result;
  }

  return String(value).trim();
};

/* =========================================================
   LẤY DANH SÁCH NCC
   GET /api/ncc
========================================================= */

exports.getAllNCC = async (req, res) => {
  try {
    const data = await NCC.aggregate([
      {
        $addFields: {
          sttNumber: {
            $toInt: {
              $replaceOne: {
                input: "$stt",
                find: "NCC",
                replacement: "",
              },
            },
          },
        },
      },
      {
        $sort: {
          sttNumber: 1,
        },
      },
      {
        $project: {
          sttNumber: 0,
        },
      },
    ]);

    return res.json(data);
  } catch (error) {
    console.error("Lỗi getAllNCC:", error);

    return res.status(500).json({
      message: "Lỗi lấy danh sách NCC",
      error: error.message,
    });
  }
};

/* =========================================================
   IMPORT EXCEL
   POST /api/ncc/import
========================================================= */

exports.importNCC = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        message: "Vui lòng chọn file Excel",
      });
    }

    const workbook = new ExcelJS.Workbook();

    await workbook.xlsx.load(req.file.buffer);

    const worksheet = workbook.worksheets[0];

    if (!worksheet) {
      return res.status(400).json({
        message: "File Excel không có sheet dữ liệu",
      });
    }

    /* =====================================================
       ĐỌC HEADER
    ===================================================== */

    const headerMap = {};

    worksheet.getRow(1).eachCell((cell, colNumber) => {
      const header = cleanValue(cell.value);

      if (header) {
        headerMap[header] = colNumber;
      }
    });

    const requiredHeaders = [
      "STT",
      "MST người bán/MST người xuất hàng",
      "Tên người bán/Tên người xuất hàng",
      "STK NGÂN HÀNG",
      "HẠNG MỤC",
      "CHI TIẾT CHI PHÍ",
      "NGƯỜI PHỤ TRÁCH",
      "XUẤT TỪ",
      "GHI CHÚ",
    ];

    for (const header of requiredHeaders) {
      if (!headerMap[header]) {
        return res.status(400).json({
          message: `Thiếu cột "${header}" trong file Excel`,
        });
      }
    }

    /* =====================================================
       ĐỌC DATA
    ===================================================== */

    const operations = [];
    let totalRows = 0;
    let skippedRows = 0;

    for (let rowNumber = 2; rowNumber <= worksheet.rowCount; rowNumber++) {
      const row = worksheet.getRow(rowNumber);

      const stt = cleanValue(row.getCell(headerMap["STT"]).value);

      // Bỏ qua dòng không có STT
      if (!stt) {
        skippedRows++;
        continue;
      }

      const mst = cleanValue(
        row.getCell(headerMap["MST người bán/MST người xuất hàng"]).value,
      );

      const tenNguoiBan = cleanValue(
        row.getCell(headerMap["Tên người bán/Tên người xuất hàng"]).value,
      );

      const stkNganHang = cleanValue(
        row.getCell(headerMap["STK NGÂN HÀNG"]).value,
      );

      const hangMuc = cleanValue(row.getCell(headerMap["HẠNG MỤC"]).value);

      const chiTietChiPhi = cleanValue(
        row.getCell(headerMap["CHI TIẾT CHI PHÍ"]).value,
      );

      const nguoiPhuTrach = cleanValue(
        row.getCell(headerMap["NGƯỜI PHỤ TRÁCH"]).value,
      );

      const xuatTu = cleanValue(row.getCell(headerMap["XUẤT TỪ"]).value);

      const ghiChu = cleanValue(row.getCell(headerMap["GHI CHÚ"]).value);

      operations.push({
        updateOne: {
          filter: {
            stt,
          },

          update: {
            $set: {
              stt,
              mst,
              tenNguoiBan,
              stkNganHang,
              hangMuc,
              chiTietChiPhi,
              nguoiPhuTrach,
              xuatTu,
              ghiChu,
            },
          },

          upsert: true,
        },
      });

      totalRows++;
    }

    /* =====================================================
       GHI DATABASE
       GHI ĐÈ THEO STT
    ===================================================== */

    if (operations.length > 0) {
      await NCC.bulkWrite(operations, {
        ordered: false,
      });
    }

    return res.json({
      message: "Import NCC thành công",
      totalRows,
      skippedRows,
    });
  } catch (error) {
    console.error("Lỗi importNCC:", error);

    return res.status(500).json({
      message: "Lỗi import NCC",
      error: error.message,
    });
  }
};

/* =========================================================
   XOÁ TẤT CẢ NCC
   DELETE /api/ncc/delete-all
========================================================= */

exports.deleteAllNCC = async (req, res) => {
  try {
    const result = await NCC.deleteMany({});

    return res.json({
      message: "Đã xoá tất cả NCC",
      deletedCount: result.deletedCount,
    });
  } catch (error) {
    console.error("Lỗi deleteAllNCC:", error);

    return res.status(500).json({
      message: "Lỗi xoá tất cả NCC",
      error: error.message,
    });
  }
};

/* =========================================================
   THÊM NCC
   POST /api/ncc
========================================================= */

exports.createNCC = async (req, res) => {
  try {
    const {
      stt,
      mst,
      tenNguoiBan,
      stkNganHang,
      hangMuc,
      chiTietChiPhi,
      nguoiPhuTrach,
      xuatTu,
      ghiChu,
    } = req.body;

    if (!stt || !String(stt).trim()) {
      return res.status(400).json({
        message: "Vui lòng nhập STT",
      });
    }

    const cleanStt = String(stt).trim();

    // Kiểm tra STT đã tồn tại
    const existing = await NCC.findOne({
      stt: cleanStt,
    });

    if (existing) {
      return res.status(400).json({
        message: `STT "${cleanStt}" đã tồn tại`,
      });
    }

    const data = await NCC.create({
      stt: cleanStt,
      mst: cleanValue(mst),
      tenNguoiBan: cleanValue(tenNguoiBan),
      stkNganHang: cleanValue(stkNganHang),
      hangMuc: cleanValue(hangMuc),
      chiTietChiPhi: cleanValue(chiTietChiPhi),
      nguoiPhuTrach: cleanValue(nguoiPhuTrach),
      xuatTu: cleanValue(xuatTu),
      ghiChu: cleanValue(ghiChu),
    });

    return res.status(201).json({
      message: "Thêm NCC thành công",
      data,
    });
  } catch (error) {
    console.error("Lỗi createNCC:", error);

    return res.status(500).json({
      message: "Lỗi thêm NCC",
      error: error.message,
    });
  }
};

/* =========================================================
   SỬA NCC
   PUT /api/ncc/:stt
========================================================= */

exports.updateNCC = async (req, res) => {
  try {
    const { stt } = req.params;

    if (!stt || !String(stt).trim()) {
      return res.status(400).json({
        message: "Thiếu STT NCC",
      });
    }

    const {
      mst,
      tenNguoiBan,
      stkNganHang,
      hangMuc,
      chiTietChiPhi,
      nguoiPhuTrach,
      xuatTu,
      ghiChu,
    } = req.body;

    const data = await NCC.findOneAndUpdate(
      {
        stt: String(stt).trim(),
      },
      {
        $set: {
          mst: cleanValue(mst),
          tenNguoiBan: cleanValue(tenNguoiBan),
          stkNganHang: cleanValue(stkNganHang),
          hangMuc: cleanValue(hangMuc),
          chiTietChiPhi: cleanValue(chiTietChiPhi),
          nguoiPhuTrach: cleanValue(nguoiPhuTrach),
          xuatTu: cleanValue(xuatTu),
          ghiChu: cleanValue(ghiChu),
        },
      },
      {
        new: true,
      },
    );

    if (!data) {
      return res.status(404).json({
        message: `Không tìm thấy NCC có STT "${stt}"`,
      });
    }

    return res.json({
      message: "Cập nhật NCC thành công",
      data,
    });
  } catch (error) {
    console.error("Lỗi updateNCC:", error);

    return res.status(500).json({
      message: "Lỗi cập nhật NCC",
      error: error.message,
    });
  }
};

/* =========================================================
   XOÁ 1 NCC
   DELETE /api/ncc/:stt
========================================================= */

exports.deleteNCC = async (req, res) => {
  try {
    const { stt } = req.params;

    if (!stt || !String(stt).trim()) {
      return res.status(400).json({
        message: "Thiếu STT NCC",
      });
    }

    const data = await NCC.findOneAndDelete({
      stt: String(stt).trim(),
    });

    if (!data) {
      return res.status(404).json({
        message: `Không tìm thấy NCC có STT "${stt}"`,
      });
    }

    return res.json({
      message: "Đã xoá NCC thành công",
      data,
    });
  } catch (error) {
    console.error("Lỗi deleteNCC:", error);

    return res.status(500).json({
      message: "Lỗi xoá NCC",
      error: error.message,
    });
  }
};
