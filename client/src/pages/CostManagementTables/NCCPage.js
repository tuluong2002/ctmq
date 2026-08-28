import React, { useEffect, useRef, useState } from "react";
import axios from "axios";
import API from "../../api";

export default function NCCPage() {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(false);
  const [importing, setImporting] = useState(false);

  const fileInputRef = useRef(null);

  /* =========================================================
     LẤY DANH SÁCH NCC
  ========================================================= */
  const fetchData = async () => {
    try {
      setLoading(true);

      const res = await axios.get(`${API}/ncc`);

      setData(Array.isArray(res.data) ? res.data : []);
    } catch (error) {
      console.error("Lỗi lấy danh sách NCC:", error);

      alert(error.response?.data?.message || "Không lấy được danh sách NCC");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  /* =========================================================
     CHỌN FILE
  ========================================================= */
  const handleFileChange = async (e) => {
    const file = e.target.files?.[0];

    if (!file) return;

    const isExcel =
      file.name.toLowerCase().endsWith(".xlsx") ||
      file.name.toLowerCase().endsWith(".xls");

    if (!isExcel) {
      alert("Vui lòng chọn file Excel (.xlsx hoặc .xls)");

      e.target.value = "";
      return;
    }

    const confirmImport = window.confirm(
      `Bạn có chắc muốn import file:\n\n${file.name}\n\n` +
        `Các NCC có cùng STT sẽ bị ghi đè dữ liệu.`,
    );

    if (!confirmImport) {
      e.target.value = "";
      return;
    }

    await handleImport(file);

    // Cho phép chọn lại chính file đó
    e.target.value = "";
  };

  /* =========================================================
     IMPORT EXCEL
  ========================================================= */
  const handleImport = async (file) => {
    try {
      setImporting(true);

      const formData = new FormData();

      formData.append("file", file);

      const res = await axios.post(`${API}/ncc/import`, formData, {
        headers: {
          "Content-Type": "multipart/form-data",
        },
      });

      alert(res.data?.message || "Import NCC thành công");

      await fetchData();
    } catch (error) {
      console.error("Lỗi import NCC:", error);

      alert(error.response?.data?.message || "Import NCC thất bại");
    } finally {
      setImporting(false);
    }
  };

  /* =========================================================
     XOÁ TẤT CẢ
  ========================================================= */
  const handleDeleteAll = async () => {
    if (data.length === 0) {
      alert("Không có dữ liệu để xoá");
      return;
    }

    const confirmDelete = window.confirm(
      `Bạn có chắc muốn XOÁ TẤT CẢ ${data.length} NCC?\n\n` +
        `Thao tác này không thể hoàn tác.`,
    );

    if (!confirmDelete) return;

    try {
      setLoading(true);

      const res = await axios.delete(`${API}/ncc/delete-all`);

      alert(res.data?.message || "Đã xoá tất cả NCC");

      await fetchData();
    } catch (error) {
      console.error("Lỗi xoá tất cả NCC:", error);

      alert(error.response?.data?.message || "Xoá tất cả NCC thất bại");
    } finally {
      setLoading(false);
    }
  };

  /* =========================================================
     FORMAT STT
  ========================================================= */
  const getSTTNumber = (stt) => {
    if (!stt) return "";

    const match = String(stt).match(/\d+/);

    return match ? Number(match[0]) : "";
  };

  return (
    <div className="w-full">
      {/* =====================================================
          HEADER
      ===================================================== */}
      <div className="bg-white border rounded-lg p-4 mb-4">
        <div className="flex items-center justify-between gap-3">
          <div>
            <h1 className="text-lg font-semibold">Quản lý NCC</h1>

            <div className="text-gray-500 mt-1">
              Tổng số:{" "}
              <span className="font-semibold text-black">{data.length}</span>{" "}
              NCC
            </div>
          </div>

          <div className="flex items-center gap-2">
            {/* IMPORT */}
            <input
              ref={fileInputRef}
              type="file"
              accept=".xlsx,.xls"
              className="hidden"
              onChange={handleFileChange}
            />

            <button
              type="button"
              disabled={importing || loading}
              onClick={() => fileInputRef.current?.click()}
              className="
                px-4 py-2
                rounded
                bg-blue-600
                text-white
                hover:bg-blue-700
                disabled:opacity-50
                disabled:cursor-not-allowed
              "
            >
              {importing ? "Đang import..." : "Import Excel"}
            </button>

            {/* XOÁ TẤT CẢ */}
            <button
              type="button"
              disabled={loading || importing || data.length === 0}
              onClick={handleDeleteAll}
              className="
                px-4 py-2
                rounded
                bg-red-600
                text-white
                hover:bg-red-700
                disabled:opacity-50
                disabled:cursor-not-allowed
              "
            >
              Xoá tất cả
            </button>

            {/* LOAD LẠI */}
            <button
              type="button"
              disabled={loading || importing}
              onClick={fetchData}
              className="
                px-4 py-2
                rounded
                border
                bg-white
                hover:bg-gray-100
                disabled:opacity-50
              "
            >
              ↻ Tải lại
            </button>
          </div>
        </div>
      </div>

      {/* =====================================================
          BẢNG
      ===================================================== */}
      <div className="bg-white border rounded-lg overflow-hidden">
        <div className="max-h-[calc(100vh-180px)] overflow-auto">
          <table className="w-full border-separate border-spacing-0 text-xs">
            <thead className="sticky top-0 z-20 bg-gray-200">
              <tr>
                <th className="border p-2 whitespace-nowrap">STT</th>

                <th className="border p-2 whitespace-nowrap">
                  MST người bán/MST người xuất hàng
                </th>

                <th className="border p-2 whitespace-nowrap">
                  Tên người bán/Tên người xuất hàng
                </th>

                <th className="border p-2 whitespace-nowrap">STK NGÂN HÀNG</th>

                <th className="border p-2 whitespace-nowrap">HẠNG MỤC</th>

                <th className="border p-2 whitespace-nowrap">
                  CHI TIẾT CHI PHÍ
                </th>

                <th className="border p-2 whitespace-nowrap">
                  NGƯỜI PHỤ TRÁCH
                </th>

                <th className="border p-2 whitespace-nowrap">XUẤT TỪ</th>

                <th className="border p-2 whitespace-nowrap">GHI CHÚ</th>
              </tr>
            </thead>

            <tbody>
              {loading && data.length === 0 ? (
                <tr>
                  <td
                    colSpan={9}
                    className="border p-6 text-center text-gray-500"
                  >
                    Đang tải dữ liệu...
                  </td>
                </tr>
              ) : data.length === 0 ? (
                <tr>
                  <td
                    colSpan={9}
                    className="border p-6 text-center text-gray-500"
                  >
                    Chưa có dữ liệu NCC
                  </td>
                </tr>
              ) : (
                data.map((item, index) => (
                  <tr
                    key={item._id || item.stt || index}
                    className="hover:bg-gray-50"
                  >
                    {/* STT */}
                    <td className="border p-2 text-center whitespace-nowrap font-medium">
                      {item.stt}
                    </td>

                    {/* MST */}
                    <td className="border p-2 whitespace-nowrap">
                      {item.mst || ""}
                    </td>

                    {/* TÊN */}
                    <td className="border p-2 min-w-[250px]">
                      {item.tenNguoiBan || ""}
                    </td>

                    {/* STK */}
                    <td className="border p-2 whitespace-nowrap">
                      {item.stkNganHang || ""}
                    </td>

                    {/* HẠNG MỤC */}
                    <td className="border p-2 min-w-[180px]">
                      {item.hangMuc || ""}
                    </td>

                    {/* CHI TIẾT */}
                    <td className="border p-2 min-w-[250px]">
                      {item.chiTietChiPhi || ""}
                    </td>

                    {/* NGƯỜI PHỤ TRÁCH */}
                    <td className="border p-2 whitespace-nowrap">
                      {item.nguoiPhuTrach || ""}
                    </td>

                    {/* XUẤT TỪ */}
                    <td className="border p-2 whitespace-nowrap">
                      {item.xuatTu || ""}
                    </td>

                    {/* GHI CHÚ */}
                    <td className="border p-2 min-w-[250px]">
                      {item.ghiChu || ""}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
