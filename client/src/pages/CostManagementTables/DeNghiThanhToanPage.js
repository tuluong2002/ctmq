import { useEffect, useState } from "react";
import { useOutletContext } from "react-router-dom";
import axios from "axios";
import DeNghiThanhToanModal from "../../components/CostModal/DeNghiThanhToanModal";
import API from "../../api";

export default function DeNghiThanhToanPage({}) {
  const { user } = useOutletContext();

  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(false);

  // =========================================================
  // DANH SÁCH NCC
  // =========================================================

  const [nccList, setNccList] = useState([]);
  const [loadingNcc, setLoadingNcc] = useState(false);

  // =========================================================
  // MẶC ĐỊNH THÁNG HIỆN TẠI
  // =========================================================

  const now = new Date();

  const [month, setMonth] = useState(
    `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`,
  );

  // =========================================================
  // MODAL
  // =========================================================

  const [editing, setEditing] = useState(null);
  const [showForm, setShowForm] = useState(false);
  const [showHistory, setShowHistory] = useState(null);

  const token = localStorage.getItem("token");

  // =========================================================
  // FORMAT TIỀN
  // =========================================================

  const formatMoney = (value) => {
    if (value === null || value === undefined || value === "") {
      return "";
    }

    return Number(value).toLocaleString("vi-VN");
  };

  // =========================================================
  // LOAD PHIẾU
  // =========================================================

  const fetchData = async () => {
    try {
      setLoading(true);

      const [year, mon] = month.split("-");

      const res = await axios.get(`${API}/de-nghi-thanh-toan`, {
        params: {
          month: Number(mon),
          year: Number(year),
        },
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      setData(res.data?.data || []);
    } catch (error) {
      console.error("fetchData:", error);

      alert(error.response?.data?.message || "Không thể lấy danh sách phiếu");
    } finally {
      setLoading(false);
    }
  };

  // =========================================================
  // LOAD DANH SÁCH NCC
  // =========================================================

  const fetchNccList = async () => {
    try {
      setLoadingNcc(true);

      const res = await axios.get(`${API}/de-nghi-thanh-toan/ncc-unique`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      setNccList(res.data?.data || []);
    } catch (error) {
      console.error("fetchNccList:", error);

      alert(
        error.response?.data?.message || "Không thể lấy danh sách nhà cung cấp",
      );
    } finally {
      setLoadingNcc(false);
    }
  };

  // =========================================================
  // LOAD KHI PAGE MỞ
  // =========================================================

  useEffect(() => {
    fetchData();
  }, [month]);

  useEffect(() => {
    fetchNccList();
  }, []);

  // =========================================================
  // THÊM
  // =========================================================

  const openAdd = () => {
    setEditing(null);
    setShowForm(true);
  };

  // =========================================================
  // SỬA
  // =========================================================

  const openEdit = (item) => {
    setEditing(item);
    setShowForm(true);
  };

  // =========================================================
  // ĐÓNG MODAL
  // =========================================================

  const closeForm = () => {
    setShowForm(false);
    setEditing(null);
  };

  // =========================================================
  // SAVE
  // Modal trả payload lên đây
  // =========================================================

  const handleSubmit = async (payload) => {
    try {
      if (editing) {
        await axios.put(`${API}/de-nghi-thanh-toan/${editing._id}`, payload, {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });
      } else {
        await axios.post(`${API}/de-nghi-thanh-toan`, payload, {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });
      }

      closeForm();

      await fetchData();
    } catch (error) {
      console.error("handleSubmit:", error);

      alert(error.response?.data?.message || "Không thể lưu phiếu");
    }
  };

  // =========================================================
  // DELETE
  // =========================================================

  const handleDelete = async (item) => {
    const ok = window.confirm(`Bạn có chắc muốn xóa phiếu ${item.maPhieu}?`);

    if (!ok) return;

    try {
      await axios.delete(`${API}/de-nghi-thanh-toan/${item._id}`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      await fetchData();
    } catch (error) {
      console.error("handleDelete:", error);

      alert(error.response?.data?.message || "Không thể xóa phiếu");
    }
  };

  // =========================================================
  // PRINT
  // =========================================================

  const handlePrint = async (item) => {
    try {
      await axios.post(
        `${API}/de-nghi-thanh-toan/${item._id}/print`,
        {},
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        },
      );

      window.open(`/ke-toan/de-nghi-thanh-toan/${item._id}/print`, "_blank");
    } catch (error) {
      console.error("handlePrint:", error);

      alert(error.response?.data?.message || "Không thể ghi nhận lịch sử in");
    }
  };

  // =========================================================
  // UI
  // =========================================================

  return (
    <div className="text-xs">
      {/* =====================================================
          HEADER
      ===================================================== */}

      <div className="flex items-center justify-between mb-3">
        <div>
          <h1 className="text-lg font-bold">Sổ phiếu đề nghị thanh toán</h1>

          <div className="text-gray-500 mt-1">
            Quản lý phiếu đề nghị thanh toán
          </div>
        </div>

        <div className="flex items-center gap-2">
          {/* =================================================
              CHỌN THÁNG
          ================================================= */}

          <input
            type="month"
            value={month}
            onChange={(e) => setMonth(e.target.value)}
            className="border rounded px-3 py-2 bg-white"
          />

          {/* =================================================
              THÊM
          ================================================= */}

          <button
            onClick={openAdd}
            className="px-3 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
          >
            + Thêm phiếu
          </button>
        </div>
      </div>

      {/* =====================================================
          THÔNG TIN NCC
      ===================================================== */}

      {loadingNcc && (
        <div className="mb-2 text-gray-500">
          Đang tải danh sách nhà cung cấp...
        </div>
      )}

      {/* =====================================================
          TABLE
      ===================================================== */}

      <div className="bg-white border rounded overflow-auto">
        <table className="min-w-[1800px] w-full border-collapse">
          <thead className="sticky top-0 bg-blue-600 text-white z-10">
            <tr>
              <th className="border px-2 py-2">STT</th>

              <th className="border px-2 py-2">Mã số phiếu</th>

              <th className="border px-2 py-2">Ngày đề nghị</th>

              <th className="border px-2 py-2">Người đề nghị</th>

              <th className="border px-2 py-2">Mã số thuế</th>

              <th className="border px-2 py-2">Nhà cung cấp</th>

              <th className="border px-2 py-2">STK ngân hàng</th>

              <th className="border px-2 py-2 min-w-[200px]">Nội dung CK</th>

              <th className="border px-2 py-2">Hóa đơn số</th>

              <th className="border px-2 py-2">Nhóm chi phí</th>

              <th className="border px-2 py-2 min-w-[160px]">Ghi chú</th>

              <th className="border px-2 py-2">Trước thuế</th>

              <th className="border px-2 py-2">Thuế</th>

              <th className="border px-2 py-2">Tổng tiền</th>

              <th className="border px-2 py-2">Lịch sử in</th>

              <th className="border px-2 py-2 min-w-[140px]">Thao tác</th>
            </tr>
          </thead>

          <tbody>
            {/* =================================================
                LOADING
            ================================================= */}

            {loading ? (
              <tr>
                <td colSpan={16} className="text-center py-10">
                  Đang tải...
                </td>
              </tr>
            ) : data.length === 0 ? (
              /* ===============================================
                 EMPTY
              =============================================== */

              <tr>
                <td colSpan={16} className="text-center py-10 text-gray-500">
                  Không có dữ liệu
                </td>
              </tr>
            ) : (
              /* ===============================================
                 DATA
              =============================================== */

              data.map((item, index) => (
                <tr key={item._id} className="hover:bg-gray-50">
                  {/* STT */}

                  <td className="border px-2 py-2 text-center">{index + 1}</td>

                  {/* MÃ PHIẾU */}

                  <td className="border px-2 py-2 font-semibold text-blue-600">
                    {item.maPhieu}
                  </td>

                  {/* NGÀY */}

                  <td className="border px-2 py-2 text-center">
                    {item.ngayDeNghi
                      ? new Date(item.ngayDeNghi).toLocaleDateString("vi-VN")
                      : ""}
                  </td>

                  {/* NGƯỜI ĐỀ NGHỊ */}

                  <td className="border px-2 py-2">{item.nguoiDeNghi}</td>

                  {/* MST */}

                  <td className="border px-2 py-2">{item.maSoThue}</td>

                  {/* NCC */}

                  <td className="border px-2 py-2">{item.nhaCungCap}</td>

                  {/* STK */}

                  <td className="border px-2 py-2">{item.stkNganHang}</td>

                  {/* NỘI DUNG CK */}

                  <td className="border px-2 py-2">{item.noiDungCK}</td>

                  {/* HÓA ĐƠN */}

                  <td className="border px-2 py-2">{item.hoaDonSo}</td>

                  {/* NHÓM CHI PHÍ */}

                  <td className="border px-2 py-2">{item.nhomChiPhi}</td>

                  {/* GHI CHÚ */}

                  <td className="border px-2 py-2">{item.ghiChu}</td>

                  {/* TRƯỚC THUẾ */}

                  <td className="border px-2 py-2 text-right">
                    {formatMoney(item.soTienTruocThue)}
                  </td>

                  {/* THUẾ */}

                  <td className="border px-2 py-2 text-right">
                    {formatMoney(item.thue)}
                  </td>

                  {/* TỔNG TIỀN */}

                  <td className="border px-2 py-2 text-right font-semibold">
                    {formatMoney(item.tongTien)}
                  </td>

                  {/* LỊCH SỬ IN */}

                  <td className="border px-2 py-2 text-center">
                    {item.lichSuIn?.length > 0 ? (
                      <button
                        onClick={() => setShowHistory(item)}
                        className="text-purple-600 underline hover:text-purple-800"
                      >
                        {item.lichSuIn.length} lần
                      </button>
                    ) : (
                      <span className="text-gray-400">Chưa in</span>
                    )}
                  </td>

                  {/* THAO TÁC */}

                  <td className="border px-2 py-2">
                    <div className="flex gap-1 justify-center">
                      {/* SỬA */}

                      <button
                        onClick={() => openEdit(item)}
                        className="px-2 py-1 border rounded hover:bg-gray-100"
                      >
                        Sửa
                      </button>

                      {/* IN */}

                      <button
                        onClick={() => handlePrint(item)}
                        className="px-2 py-1 bg-green-600 text-white rounded hover:bg-green-700"
                      >
                        In phiếu
                      </button>

                      {/* XÓA */}

                      <button
                        onClick={() => handleDelete(item)}
                        className="px-2 py-1 bg-red-600 text-white rounded hover:bg-red-700"
                      >
                        Xóa
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* =====================================================
          MODAL THÊM / SỬA
      ===================================================== */}

      <DeNghiThanhToanModal
        open={showForm}
        editing={editing}
        month={month}
        user={user}
        nccList={nccList}
        onClose={closeForm}
        onSubmit={handleSubmit}
      />

      {/* =====================================================
          MODAL LỊCH SỬ IN
      ===================================================== */}

      {showHistory && (
        <div className="fixed inset-0 bg-black/40 z-[110] flex items-center justify-center p-4">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-lg">
            {/* HEADER */}

            <div className="px-4 py-3 border-b flex justify-between items-center">
              <div>
                <div className="font-bold text-sm">Lịch sử in</div>

                <div className="text-gray-500 mt-1">{showHistory.maPhieu}</div>
              </div>

              <button
                onClick={() => setShowHistory(null)}
                className="text-xl text-gray-500 hover:text-black"
              >
                ×
              </button>
            </div>

            {/* BODY */}

            <div className="p-4">
              {showHistory.lichSuIn?.length ? (
                <div className="max-h-[400px] overflow-auto">
                  <table className="w-full border-collapse">
                    <thead>
                      <tr className="bg-gray-100">
                        <th className="border px-2 py-2">STT</th>

                        <th className="border px-2 py-2">Người in</th>

                        <th className="border px-2 py-2">Ngày in</th>
                      </tr>
                    </thead>

                    <tbody>
                      {showHistory.lichSuIn.map((history, index) => (
                        <tr key={index}>
                          <td className="border px-2 py-2 text-center">
                            {index + 1}
                          </td>

                          <td className="border px-2 py-2">
                            {history.nguoiIn}
                          </td>

                          <td className="border px-2 py-2 text-center">
                            {history.ngayIn
                              ? new Date(history.ngayIn).toLocaleString("vi-VN")
                              : ""}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div className="text-center text-gray-500 py-5">
                  Chưa có lịch sử in
                </div>
              )}
            </div>

            {/* FOOTER */}

            <div className="border-t px-4 py-3 flex justify-end">
              <button
                onClick={() => setShowHistory(null)}
                className="px-4 py-2 border rounded hover:bg-gray-100"
              >
                Đóng
              </button>
            </div>
          </div>
        </div>
      )}

      {/* =====================================================
          STYLE IN
      ===================================================== */}

      <style>{`
        @media print {
          body * {
            visibility: hidden;
          }

          #root,
          #root * {
            visibility: visible;
          }

          #root {
            position: absolute;
            left: 0;
            top: 0;
            width: 100%;
          }

          button {
            display: none !important;
          }

          input {
            border: none !important;
          }
        }
      `}</style>
    </div>
  );
}
