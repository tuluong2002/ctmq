import { useEffect, useState } from "react";
import axios from "axios";
import API from "../../api";

export default function VehicleProfitSalaryModal({ open, onClose, month }) {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(false);

  const token = localStorage.getItem("token");

  // =====================================================
  // FORMAT TIỀN
  // =====================================================

  const formatMoney = (value) => {
    return Number(value || 0).toLocaleString("vi-VN");
  };

  // =====================================================
  // LOAD CP LƯƠNG THEO THÁNG
  // =====================================================

  const fetchData = async () => {
    if (!month) return;

    setLoading(true);

    try {
      const res = await axios.get(`${API}/salary/vehicle-profit-salary`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
        params: {
          month,
        },
      });

      setData(res.data || []);
    } catch (err) {
      console.error(err);

      alert(err.response?.data?.message || "Lỗi lấy danh sách chi phí lương");
    } finally {
      setLoading(false);
    }
  };

  // =====================================================
  // KHI MỞ MODAL
  // =====================================================

  useEffect(() => {
    if (open && month) {
      fetchData();
    }
  }, [open, month]);

  // =====================================================
  // TỔNG
  // =====================================================

  const total = data.reduce((sum, item) => sum + Number(item.cpLuong || 0), 0);

  // =====================================================
  // FORMAT THÁNG
  // =====================================================

  const formatMonth = (value) => {
    if (!value) return "";

    const [year, monthNumber] = value.split("-");

    return `${monthNumber}/${year}`;
  };

  if (!open) {
    return null;
  }

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/40">
      <div className="bg-white rounded-lg shadow-xl w-[700px] max-w-[95vw] max-h-[85vh] flex flex-col">
        {/* =================================================
            HEADER
        ================================================= */}

        <div className="flex items-center justify-between border-b px-4 py-3">
          <div>
            <h2 className="font-semibold text-lg">CHI PHÍ LƯƠNG</h2>

            <div className="text-xs text-gray-500 flex">
              Mã lợi nhuận:
              <p className="ml-1 text-black font-semibold">
                LN.
                {Number(month.split("-")[1])}.{Number(month.split("-")[0])}
              </p>
            </div>

            <div className="text-xs text-gray-500 flex mt-0.5">
              Tháng:
              <p className="ml-1 text-black font-semibold">
                {formatMonth(month)}
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="text-gray-500 hover:text-red-600 text-xl px-2"
          >
            ×
          </button>
        </div>

        {/* =================================================
            BODY
        ================================================= */}

        <div className="p-4 overflow-auto">
          {loading ? (
            <div className="text-center py-8 text-gray-500">Đang tải...</div>
          ) : (
            <>
              {/* SUMMARY */}

              <div className="flex justify-between items-center mb-3 text-sm">
                <div>
                  Số xe: <b>{data.length}</b>
                </div>

                <div>
                  Tổng chi phí:{" "}
                  <b className="text-red-600">{formatMoney(total)}</b> VNĐ
                </div>
              </div>

              {/* TABLE */}

              <div className="border rounded overflow-auto max-h-[55vh]">
                <table className="w-full border-collapse text-sm">
                  <thead className="sticky top-0 bg-blue-600 text-white">
                    <tr>
                      <th className="border px-3 py-2 text-center w-16">STT</th>

                      <th className="border px-3 py-2 text-center">
                        BIỂN SỐ XE
                      </th>

                      <th className="border px-3 py-2 text-center">
                        ĐƠN VỊ VẬN TẢI
                      </th>

                      <th className="border px-3 py-2 text-right">CP LƯƠNG</th>
                    </tr>
                  </thead>

                  <tbody>
                    {data.map((item, index) => (
                      <tr
                        key={item._id || item.bsx}
                        className="even:bg-gray-50 hover:bg-blue-50"
                      >
                        <td className="border px-3 py-2 text-center">
                          {index + 1}
                        </td>

                        <td className="border px-3 py-2 text-center font-semibold">
                          {item.bsx}
                        </td>

                        <td className="border px-3 py-2 text-center font-semibold">
                          {item.company || ""}
                        </td>

                        <td className="border px-3 py-2 text-right font-semibold">
                          {formatMoney(item.cpLuong)}
                        </td>
                      </tr>
                    ))}

                    {!loading && data.length === 0 && (
                      <tr>
                        <td
                          colSpan={4}
                          className="border px-3 py-8 text-center text-gray-500"
                        >
                          Không có dữ liệu
                        </td>
                      </tr>
                    )}
                  </tbody>

                  {data.length > 0 && (
                    <tfoot>
                      <tr className="bg-gray-100 font-semibold">
                        <td colSpan={3} className="border px-3 py-2 text-right">
                          TỔNG CỘNG
                        </td>

                        <td className="border px-3 py-2 text-right text-red-600">
                          {formatMoney(total)} VNĐ
                        </td>
                      </tr>
                    </tfoot>
                  )}
                </table>
              </div>
            </>
          )}
        </div>

        {/* =================================================
            FOOTER
        ================================================= */}

        <div className="border-t px-4 py-3 flex justify-end">
          <button
            onClick={onClose}
            className="bg-gray-500 hover:bg-gray-600 text-white px-4 py-1.5 rounded text-sm"
          >
            Đóng
          </button>
        </div>
      </div>
    </div>
  );
}
