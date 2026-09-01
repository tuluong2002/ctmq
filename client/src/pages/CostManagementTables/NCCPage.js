import React, { useEffect, useRef, useState } from "react";
import axios from "axios";
import API from "../../api";
import NCCModal from "../../components/CostModal/NCCModal";
import { FiEdit2, FiTrash2 } from "react-icons/fi";

export default function NCCPage() {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(false);
  const [importing, setImporting] = useState(false);

  const [modalOpen, setModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState("add");
  const [selectedNCC, setSelectedNCC] = useState(null);

  const fileInputRef = useRef(null);

  // =====================================================
  // LOAD USERS
  // =====================================================

  const [userList, setUserList] = useState([]);

  const fetchUsers = async () => {
    try {
      const response = await axios.get(`${API}/trip-actual-cost/users`);

      setUserList(response.data?.data || []);
    } catch (error) {
      console.error("fetchUsers error:", error);

      alert(
        error.response?.data?.message || "Không thể tải danh sách người dùng",
      );
    }
  };

  useEffect(() => {
    fetchUsers();
  }, []);

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
     MỞ MODAL THÊM
  ========================================================= */
  const handleAdd = () => {
    setSelectedNCC(null);
    setModalMode("add");
    setModalOpen(true);
  };

  /* =========================================================
     MỞ MODAL SỬA
  ========================================================= */
  const handleEdit = (item) => {
    setSelectedNCC(item);
    setModalMode("edit");
    setModalOpen(true);
  };

  /* =========================================================
     ĐÓNG MODAL
  ========================================================= */
  const handleCloseModal = () => {
    if (loading) return;

    setModalOpen(false);
    setSelectedNCC(null);
  };

  /* =========================================================
     SAU KHI THÊM / SỬA
  ========================================================= */
  const handleModalSuccess = async () => {
    await fetchData();
  };

  /* =========================================================
     XOÁ 1 NCC
  ========================================================= */
  const handleDelete = async (item) => {
    if (!item?.stt) {
      alert("Không xác định được NCC cần xoá");
      return;
    }

    const confirmDelete = window.confirm(
      `Bạn có chắc muốn xoá NCC "${item.tenNguoiBan || item.stt}"?\n\n` +
        `STT: ${item.stt}\n\n` +
        `Thao tác này không thể hoàn tác.`,
    );

    if (!confirmDelete) return;

    try {
      setLoading(true);

      const res = await axios.delete(
        `${API}/ncc/${encodeURIComponent(item.stt)}`,
      );

      alert(res.data?.message || "Đã xoá NCC");

      await fetchData();
    } catch (error) {
      console.error("Lỗi xoá NCC:", error);

      alert(error.response?.data?.message || "Xoá NCC thất bại");
    } finally {
      setLoading(false);
    }
  };

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

  return (
    <div className="w-full">
      {/* =====================================================
          HEADER
      ===================================================== */}
      <div className="mb-4 rounded-lg border bg-white p-4">
        <div className="flex items-center justify-between gap-3">
          <div>
            <h1 className="text-lg font-semibold">DANH SÁCH NHÀ CUNG CẤP</h1>

            <div className="mt-1 text-gray-500">
              Tổng số:{" "}
              <span className="font-semibold text-black">{data.length}</span>{" "}
              NCC
            </div>
          </div>

          <div className="flex items-center gap-2">
            {/* THÊM NCC */}
            <button
              type="button"
              disabled={loading || importing}
              onClick={handleAdd}
              className="rounded bg-green-600 px-4 py-2 text-white hover:bg-green-700 disabled:cursor-not-allowed disabled:opacity-50"
            >
              Thêm mới
            </button>

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
              className="rounded bg-blue-600 px-4 py-2 text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {importing ? "Đang import..." : "Import Excel"}
            </button>

            {/* XOÁ TẤT CẢ */}
            <button
              type="button"
              disabled={loading || importing || data.length === 0}
              onClick={handleDeleteAll}
              className="rounded bg-red-600 px-4 py-2 text-white hover:bg-red-700 disabled:cursor-not-allowed disabled:opacity-50"
            >
              Xoá tất cả
            </button>

            {/* LOAD LẠI */}
            <button
              type="button"
              disabled={loading || importing}
              onClick={fetchData}
              className="rounded border bg-white px-4 py-2 hover:bg-gray-100 disabled:opacity-50"
            >
              ↻ Tải lại
            </button>
          </div>
        </div>
      </div>

      {/* =====================================================
          BẢNG
      ===================================================== */}
      <div className="overflow-hidden rounded-lg border bg-white">
        <div className="max-h-[calc(100vh-180px)] overflow-auto">
          <table className="w-full border-separate border-spacing-0 text-xs">
            <thead className="sticky top-0 z-20 bg-gray-200">
              <tr>
                <th className="whitespace-nowrap border p-2">STT</th>
                <th className="whitespace-nowrap border p-2">
                  MST người bán/MST người xuất hàng
                </th>
                <th className="whitespace-nowrap border p-2">
                  Tên người bán/Tên người xuất hàng
                </th>
                <th className="whitespace-nowrap border p-2">STK NGÂN HÀNG</th>
                <th className="whitespace-nowrap border p-2">HẠNG MỤC</th>
                <th className="whitespace-nowrap border p-2">
                  CHI TIẾT CHI PHÍ
                </th>
                <th className="whitespace-nowrap border p-2">
                  NGƯỜI PHỤ TRÁCH
                </th>
                <th className="whitespace-nowrap border p-2">XUẤT TỪ</th>
                <th className="whitespace-nowrap border p-2">GHI CHÚ</th>
                <th className="whitespace-nowrap border p-2">THAO TÁC</th>
              </tr>
            </thead>

            <tbody>
              {loading && data.length === 0 ? (
                <tr>
                  <td
                    colSpan={10}
                    className="border p-6 text-center text-gray-500"
                  >
                    Đang tải dữ liệu...
                  </td>
                </tr>
              ) : data.length === 0 ? (
                <tr>
                  <td
                    colSpan={10}
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
                    <td className="whitespace-nowrap border p-2 text-center font-medium">
                      {item.stt}
                    </td>

                    {/* MST */}
                    <td className="whitespace-nowrap border p-2">
                      {item.mst || ""}
                    </td>

                    {/* TÊN */}
                    <td className="min-w-[250px] border p-2">
                      {item.tenNguoiBan || ""}
                    </td>

                    {/* STK */}
                    <td className="whitespace-nowrap border p-2">
                      {item.stkNganHang || ""}
                    </td>

                    {/* HẠNG MỤC */}
                    <td className="min-w-[180px] border p-2">
                      {item.hangMuc || ""}
                    </td>

                    {/* CHI TIẾT */}
                    <td className="min-w-[250px] border p-2">
                      {item.chiTietChiPhi || ""}
                    </td>

                    {/* NGƯỜI PHỤ TRÁCH */}
                    <td className="whitespace-nowrap border p-2">
                      {item.nguoiPhuTrach || ""}
                    </td>

                    {/* XUẤT TỪ */}
                    <td className="whitespace-nowrap border p-2">
                      {item.xuatTu || ""}
                    </td>

                    {/* GHI CHÚ */}
                    <td className="min-w-[250px] border p-2">
                      {item.ghiChu || ""}
                    </td>

                    {/* THAO TÁC */}
                    <td className="whitespace-nowrap border p-2">
                      <div className="flex justify-center gap-1">
                        <button
                          type="button"
                          disabled={loading || importing}
                          onClick={() => handleEdit(item)}
                          className="rounded bg-blue-500 px-2 py-1 text-white hover:bg-yellow-500 disabled:opacity-50"
                        >
                          <FiEdit2 />
                        </button>

                        <button
                          type="button"
                          disabled={loading || importing}
                          onClick={() => handleDelete(item)}
                          className="rounded bg-red-500 px-2 py-1 text-white hover:bg-red-700 disabled:opacity-50"
                        >
                          <FiTrash2 />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* =====================================================
          MODAL THÊM / SỬA
      ===================================================== */}
      <NCCModal
        open={modalOpen}
        mode={modalMode}
        data={selectedNCC}
        userList = {userList}
        onClose={handleCloseModal}
        onSuccess={handleModalSuccess}
      />
    </div>
  );
}
