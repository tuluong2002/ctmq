import React, { useEffect, useState } from "react";
import axios from "axios";
import API from "../../api";

export default function VehicleProfitTripPaymentKTModal({
  open,
  month,
  onClose,
}) {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(false);

  const token = localStorage.getItem("token");

  // =====================================================
  // MÃ LỢI NHUẬN
  // =====================================================

  const getMaLoiNhuan = () => {
    if (!month) return "";

    const [year, monthNumber] = month.split("-");

    return `LN.${Number(monthNumber)}.${year}`;
  };

  // =====================================================
  // FORMAT TIỀN
  // =====================================================

  const formatMoney = (value) => {
    return Number(value || 0).toLocaleString("vi-VN");
  };

  // =====================================================
  // LẤY DANH SÁCH
  // =====================================================

  const fetchData = async () => {
    if (!month) return;

    try {
      setLoading(true);

      const res = await axios.get(`${API}/trip-payment-kt/vehicle-profit`, {
        params: {
          month,
        },

        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      setData(Array.isArray(res.data) ? res.data : []);
    } catch (error) {
      console.error("Lỗi lấy danh sách chi phí thanh toán lịch trình:", error);

      alert(
        error.response?.data?.message ||
          "Lỗi lấy danh sách chi phí thanh toán lịch trình",
      );
    } finally {
      setLoading(false);
    }
  };

  // =====================================================
  // LOAD KHI MỞ MODAL
  // =====================================================

  useEffect(() => {
    if (open) {
      fetchData();
    }
  }, [open, month]);

  // =====================================================
  // TỔNG CHI PHÍ
  // =====================================================

  const totalThanhToanLichTrinh = data.reduce(
    (sum, item) => sum + Number(item.cpThanhToanLichTrinh || 0),
    0,
  );

  // =====================================================
  // MODAL
  // =====================================================

  if (!open) {
    return null;
  }

  return (
    <div
      className="
        fixed
        inset-0
        z-[1000]
        bg-black/40
        flex
        items-center
        justify-center
        p-4
      "
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) {
          onClose();
        }
      }}
    >
      <div
        className="
          bg-white
          rounded-lg
          shadow-xl
          w-full
          max-w-5xl
          max-h-[90vh]
          flex
          flex-col
        "
      >
        {/* =================================================
            HEADER
        ================================================= */}

        <div className="flex items-center justify-between border-b px-4 py-3">
          <div>
            <h2 className="font-semibold text-base">
              CHI PHÍ THANH TOÁN LỊCH TRÌNH
            </h2>

            <div className="text-gray-500 mt-1">
              Mã lợi nhuận:{" "}
              <span className="font-semibold text-black">
                {getMaLoiNhuan()}
              </span>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="
              w-8
              h-8
              rounded
              hover:bg-gray-100
              text-lg
            "
          >
            ×
          </button>
        </div>

        {/* =================================================
            THÔNG TIN
        ================================================= */}

        <div
          className="
            px-4
            py-3
            border-b
            bg-gray-50
            flex
            gap-8
            justify-between
          "
        >
          <div>
            Số xe: <span className="font-semibold">{data.length}</span>
          </div>

          <div>
            Tổng chi phí:{" "}
            <span className="font-semibold text-red-600">
              {formatMoney(totalThanhToanLichTrinh)}
            </span>{" "}
            VNĐ
          </div>
        </div>

        {/* =================================================
            TABLE
        ================================================= */}

        <div className="flex-1 overflow-auto">
          <table className="w-full border-collapse text-xs">
            <thead className="sticky top-0 z-10 bg-gray-200">
              <tr>
                <th className="border p-2 w-16">STT</th>

                <th className="border p-2">MÃ LỢI NHUẬN</th>

                <th className="border p-2">BSX</th>

                <th className="border p-2">ĐƠN VỊ VẬN TẢI</th>

                <th className="border p-2">CHI PHÍ THANH TOÁN LỊCH TRÌNH</th>
              </tr>
            </thead>

            <tbody>
              {loading ? (
                <tr>
                  <td
                    colSpan={5}
                    className="
                      border
                      p-8
                      text-center
                      text-gray-500
                    "
                  >
                    Đang tải dữ liệu...
                  </td>
                </tr>
              ) : data.length === 0 ? (
                <tr>
                  <td
                    colSpan={5}
                    className="
                      border
                      p-8
                      text-center
                      text-gray-500
                    "
                  >
                    Không có dữ liệu
                  </td>
                </tr>
              ) : (
                data.map((item, index) => (
                  <tr key={item._id || index} className="hover:bg-gray-50">
                    {/* STT */}

                    <td className="border p-2 text-center">{index + 1}</td>

                    {/* MÃ LỢI NHUẬN */}

                    <td className="border p-2 text-center">
                      {item.maLoiNhuan || ""}
                    </td>

                    {/* BSX */}

                    <td className="border p-2 text-center font-medium">
                      {item.bsx || ""}
                    </td>

                    {/* ĐVVT */}

                    <td className="border p-2 text-center">
                      {item.company || ""}
                    </td>

                    {/* CHI PHÍ */}

                    <td className="border p-2 text-right font-medium">
                      {formatMoney(item.cpThanhToanLichTrinh)}
                    </td>
                  </tr>
                ))
              )}
            </tbody>

            {/* =================================================
                FOOTER TỔNG
            ================================================= */}

            {!loading && data.length > 0 && (
              <tfoot>
                <tr className="bg-gray-100 font-semibold">
                  <td colSpan={4} className="border p-2 text-right">
                    TỔNG
                  </td>

                  <td className="border p-2 text-right">
                    {formatMoney(totalThanhToanLichTrinh)}
                  </td>
                </tr>
              </tfoot>
            )}
          </table>
        </div>

        {/* =================================================
            FOOTER
        ================================================= */}

        <div className="border-t px-4 py-3 flex justify-end">
          <button
            type="button"
            onClick={onClose}
            className="
              px-4
              py-2
              rounded
              border
              hover:bg-gray-100
            "
          >
            Đóng
          </button>
        </div>
      </div>
    </div>
  );
}
