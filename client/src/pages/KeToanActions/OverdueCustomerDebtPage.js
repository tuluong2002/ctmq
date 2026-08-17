import React, { useEffect, useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import axios from "axios";
import {
  FiRefreshCw,
  FiSearch,
  FiAlertCircle,
  FiDollarSign,
  FiX,
} from "react-icons/fi";

import API from "../../api";

const OverdueCustomerDebtPage = ({ user }) => {
  const navigate = useNavigate();
  // =====================================================
  // STATE
  // =====================================================

  const YEAR_STORAGE_KEY = "overdue_customer_debt_year";

  const currentYear = new Date().getFullYear();

  const [soNgay, setSoNgay] = useState(60);

  const [nam, setNam] = useState(() => {
    const savedYear = localStorage.getItem(YEAR_STORAGE_KEY);

    return savedYear ? Number(savedYear) : currentYear;
  });

  const [data, setData] = useState([]);
  const [searchMaChuyen, setSearchMaChuyen] = useState("");
  const [searchKhachHang, setSearchKhachHang] = useState("");

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const hasCongNo26Permission = user?.permissions?.includes("cong_no_26");

  const location = useLocation();
  const isActive = (path) => location.pathname === path;

  // 👉 Hàm chuyển sang trang quản lý lái xe
  const handleGoToDrivers = () => {
    navigate("/manage-driver", { state: { user } });
  };

  const handleGoToCustomers = () => {
    navigate("/manage-customer", { state: { user } });
  };

  const handleGoToVehicles = () => {
    navigate("/manage-vehicle", { state: { user } });
  };

  const handleGoToTrips = () => {
    navigate("/manage-trip", { state: { user } });
  };

  const handleGoToAllTrips = () => {
    navigate("/manage-all-trip", { state: { user } });
  };

  const handleGoToAllCustomers = () => {
    navigate("/customer-debt", { state: { user } });
  };

  const handleGoToCustomer26 = () => {
    navigate("/customer-debt-26", { state: { user } });
  };

  const handleGoToVouchers = () =>
    navigate("/voucher-list", { state: { user } });

  const handleGoToContract = () => {
    navigate("/contract", { state: { user } });
  };

  const handleGoToTCB = () => {
    navigate("/tcb-person", { state: { user } });
  };

  const handleGoToOnlKT = () => {
    navigate("/onl-schedules", { state: { user } });
  };

  const handleGoToScheErr = () => {
    navigate("/schedule-errors", { state: { user } });
  };

  const handleGoToCNKLQH = () => {
    navigate("/overdue-customer-debt", { state: { user } });
  };

  // =====================================================
  // FORMAT TIỀN
  // =====================================================

  const formatMoney = (value) => {
    const number = Number(value || 0);

    return number.toLocaleString("vi-VN");
  };

  // =====================================================
  // FORMAT NGÀY
  // =====================================================

  const formatDate = (value) => {
    if (!value) return "";

    const date = new Date(value);

    if (Number.isNaN(date.getTime())) {
      return "";
    }

    return date.toLocaleDateString("vi-VN");
  };

  // =====================================================
  // TẢI DANH SÁCH QUÁ HẠN
  // =====================================================

  const fetchOverdueTrips = async () => {
    const days = Number(soNgay);
    const year = Number(nam);

    if (!Number.isFinite(days) || days < 0) {
      setError("Số ngày quá hạn không hợp lệ");
      return;
    }

    if (!Number.isInteger(year) || year < 2000 || year > 2100) {
      setError("Năm không hợp lệ");
      return;
    }

    // Lưu năm đã chọn vào localStorage
    localStorage.setItem(YEAR_STORAGE_KEY, String(year));

    try {
      setLoading(true);
      setError("");

      const res = await axios.get(`${API}/odd-debt/overdue-trips`, {
        params: {
          soNgay: days,
          nam: year,
        },
      });

      if (res.data.success) {
        setData(res.data.data || []);
      } else {
        setData([]);
        setError(res.data.message || "Không lấy được danh sách quá hạn");
      }
    } catch (err) {
      console.error(err);

      setData([]);

      setError(
        err.response?.data?.message ||
          "Không lấy được danh sách chuyến quá hạn",
      );
    } finally {
      setLoading(false);
    }
  };

  // =====================================================
  // TẢI LẦN ĐẦU
  // =====================================================

  useEffect(() => {
    fetchOverdueTrips();
  }, []);

  const filteredData = data.filter((item) => {
    const matchMaChuyen = String(item.maChuyen || "")
      .toLowerCase()
      .includes(searchMaChuyen.trim().toLowerCase());

    const matchKhachHang = String(item.nameCustomer || "")
      .toLowerCase()
      .includes(searchKhachHang.trim().toLowerCase());

    return matchMaChuyen && matchKhachHang;
  });

  // =====================================================
  // TỔNG
  // =====================================================

  const totalConLai = filteredData.reduce(
    (sum, item) => sum + Number(item.conLai || 0),
    0,
  );

  // =====================================================
  // KHÔNG CÓ QUYỀN
  // =====================================================

  if (!hasCongNo26Permission) {
    return (
      <div className="p-6 bg-gray-50 min-h-screen">
        <div className="flex gap-2 items-center mb-4 text-xs">
          <button
            onClick={() => navigate("/ke-toan")}
            className="px-3 py-1 rounded text-white bg-blue-500"
          >
            Trang chính
          </button>
        </div>
        <div className="bg-white border border-red-200 rounded-lg shadow-sm p-8 text-center">
          <div className="text-red-500 text-5xl mb-3">🔒</div>

          <h2 className="text-xl font-bold text-gray-800">
            Không có quyền truy cập
          </h2>

          <p className="text-gray-500 mt-2">
            Bạn không có quyền xem công nợ khách lẻ quá hạn.
          </p>
        </div>
      </div>
    );
  }

  // =====================================================
  // RENDER
  // =====================================================

  return (
    <div className="p-4 bg-gray-50 min-h-screen">
      <div className="flex gap-2 items-center mb-4 text-xs">
        <button
          onClick={() => navigate("/ke-toan")}
          className="px-3 py-1 rounded text-white bg-blue-500"
        >
          Trang chính
        </button>

        <button
          onClick={handleGoToDrivers}
          className={`px-3 py-1 rounded text-white 
      ${isActive("/manage-driver") ? "bg-green-600" : "bg-blue-500"}
    `}
        >
          Danh sách lái xe
        </button>

        <button
          onClick={handleGoToCustomers}
          className={`px-3 py-1 rounded text-white 
      ${isActive("/manage-customer") ? "bg-green-600" : "bg-blue-500"}
    `}
        >
          Danh sách khách hàng
        </button>

        <button
          onClick={handleGoToVehicles}
          className={`px-3 py-1 rounded text-white 
      ${isActive("/manage-vehicle") ? "bg-green-600" : "bg-blue-500"}
    `}
        >
          Danh sách xe
        </button>

        <button
          onClick={handleGoToTrips}
          className={`px-3 py-1 rounded text-white 
      ${isActive("/manage-trip") ? "bg-green-600" : "bg-blue-500"}
    `}
        >
          Danh sách chuyến phụ trách
        </button>

        <button
          onClick={() => {
            if (!user?.permissions?.includes("edit_trip")) {
              alert("Bạn không có quyền truy cập!");
              return;
            }
            handleGoToAllTrips();
          }}
          className={`px-3 py-1 rounded text-white 
      ${isActive("/manage-all-trip") ? "bg-green-600" : "bg-blue-500"}
    `}
        >
          Tất cả các chuyến
        </button>

        <button
          onClick={handleGoToAllCustomers}
          className={`px-3 py-1 rounded text-white 
      ${isActive("/customer-debt") ? "bg-green-600" : "bg-blue-500"}
    `}
        >
          Công nợ KH
        </button>

        <button
          onClick={handleGoToCustomer26}
          className={`px-3 py-1 rounded text-white 
      ${isActive("/customer-debt-26") ? "bg-green-600" : "bg-blue-500"}
    `}
        >
          Công nợ khách lẻ
        </button>
        <button
          onClick={handleGoToVouchers}
          className={`px-3 py-1 rounded text-white ${
            isActive("/voucher-list") ? "bg-green-600" : "bg-blue-500"
          }`}
        >
          Sổ phiếu chi
        </button>
        <button
          onClick={handleGoToContract}
          className={`px-3 py-1 rounded text-white ${
            isActive("/contract") ? "bg-green-600" : "bg-blue-500"
          }`}
        >
          Hợp đồng vận chuyển
        </button>
        <button
          onClick={handleGoToTCB}
          className={`px-3 py-1 rounded text-white ${
            isActive("/tcb-person") ? "bg-green-600" : "bg-blue-500"
          }`}
        >
          TCB cá nhân
        </button>

        <button
          onClick={handleGoToOnlKT}
          className={`px-3 py-1 rounded text-white ${
            isActive("/onl-schedules") ? "bg-green-600" : "bg-blue-500"
          }`}
        >
          KT - Lịch trình
        </button>

        <button
          onClick={handleGoToScheErr}
          className={`px-3 py-1 rounded text-white ${
            isActive("/schedule-errors") ? "bg-green-600" : "bg-blue-500"
          }`}
        >
          DS chuyến sai sót
        </button>

        <button
          onClick={handleGoToCNKLQH}
          className={`px-3 py-1 rounded text-white ${
            isActive("/overdue-customer-debt") ? "bg-green-600" : "bg-blue-500"
          }`}
        >
          CN khách lẻ quá hạn
        </button>
      </div>
      {/* =====================================================
          HEADER
      ===================================================== */}

      <div className="bg-white border rounded-lg shadow-sm p-4 mb-4">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
          <div>
            <h1 className="text-xl font-bold text-gray-800">
              THEO DÕI CÔNG NỢ KHÁCH LẺ QUÁ HẠN
            </h1>

            <p className="text-sm text-gray-500 mt-1">
              Theo dõi các chuyến đã giao nhưng chưa thanh toán
            </p>
          </div>

          {/* =====================================================
              FILTER
          ===================================================== */}

          <div className="flex items-center gap-2 flex-wrap">
            {/* LỌC NĂM */}
            <label className="text-sm font-medium text-gray-700">Từ năm:</label>

            <input
              type="number"
              min="2000"
              max="2100"
              value={nam}
              onChange={(e) => {
                const value = e.target.value;
                setNam(value);

                if (value) {
                  localStorage.setItem(YEAR_STORAGE_KEY, value);
                }
              }}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  fetchOverdueTrips();
                }
              }}
              className="
      w-24
      border
      border-gray-300
      rounded-md
      px-3
      py-2
      outline-none
      focus:ring-2
      focus:ring-blue-400
    "
            />

            {/* QUÁ HẠN */}
            <label className="text-sm font-medium text-gray-700">
              Quá hạn:
            </label>

            <div className="flex items-center">
              <input
                type="number"
                min="0"
                value={soNgay}
                onChange={(e) => setSoNgay(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    fetchOverdueTrips();
                  }
                }}
                className="
        w-24
        border
        border-gray-300
        rounded-l-md
        px-3
        py-2
        outline-none
        focus:ring-2
        focus:ring-blue-400
      "
              />

              <span className="border border-l-0 border-gray-300 px-3 py-2 bg-gray-50 text-gray-600">
                ngày
              </span>
            </div>

            {/* MÃ CHUYẾN */}
            <div className="relative">
              <input
                type="text"
                placeholder="Tìm mã chuyến..."
                value={searchMaChuyen}
                onChange={(e) => setSearchMaChuyen(e.target.value)}
                className="
      w-40
      border
      border-gray-300
      rounded-md
      px-3
      py-2
      pr-8
      outline-none
      focus:ring-2
      focus:ring-blue-400
    "
              />

              {searchMaChuyen && (
                <button
                  type="button"
                  onClick={() => setSearchMaChuyen("")}
                  className="
        absolute
        right-2
        top-1/2
        -translate-y-1/2
        text-gray-400
        hover:text-red-500
      "
                  title="Xóa"
                >
                  <FiX size={16} />
                </button>
              )}
            </div>

            {/* KHÁCH HÀNG */}
            <div className="relative">
              <input
                type="text"
                placeholder="Tìm khách hàng..."
                value={searchKhachHang}
                onChange={(e) => setSearchKhachHang(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    fetchOverdueTrips();
                  }
                }}
                className="
      w-48
      border
      border-gray-300
      rounded-md
      px-3
      py-2
      pr-8
      outline-none
      focus:ring-2
      focus:ring-blue-400
    "
              />

              {searchKhachHang && (
                <button
                  type="button"
                  onClick={() => setSearchKhachHang("")}
                  className="
        absolute
        right-2
        top-1/2
        -translate-y-1/2
        text-gray-400
        hover:text-red-500
      "
                  title="Xóa"
                >
                  <FiX size={16} />
                </button>
              )}
            </div>

            {/* LỌC */}
            <button
              onClick={fetchOverdueTrips}
              disabled={loading}
              className="
      flex
      items-center
      gap-2
      bg-blue-600
      text-white
      px-4
      py-2
      rounded-md
      hover:bg-blue-700
      disabled:opacity-50
    "
            >
              <FiSearch />
              {loading ? "Đang lọc..." : "Lọc"}
            </button>

            {/* REFRESH */}
            <button
              onClick={fetchOverdueTrips}
              disabled={loading}
              className="
      flex
      items-center
      gap-2
      bg-gray-200
      text-gray-700
      px-3
      py-2
      rounded-md
      hover:bg-gray-300
      disabled:opacity-50
    "
              title="Làm mới"
            >
              <FiRefreshCw className={loading ? "animate-spin" : ""} />
            </button>
          </div>
        </div>
      </div>

      {/* =====================================================
          ERROR
      ===================================================== */}

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-600 rounded-lg px-4 py-3 mb-4">
          {error}
        </div>
      )}

      {/* =====================================================
          SUMMARY
      ===================================================== */}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
        {/* SỐ CHUYẾN */}

        <div className="bg-white border rounded-lg shadow-sm p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500">Số chuyến quá hạn</p>

              <p className="text-2xl font-bold text-red-600 mt-1">
                {filteredData.length}
              </p>
            </div>

            <div className="p-3 bg-red-50 rounded-full">
              <FiAlertCircle size={22} className="text-red-600" />
            </div>
          </div>
        </div>

        {/* TỔNG CÒN LẠI */}

        <div className="bg-white border rounded-lg shadow-sm p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500">Tổng công nợ quá hạn</p>

              <p className="text-2xl font-bold text-orange-600 mt-1">
                {formatMoney(totalConLai)} VNĐ
              </p>
            </div>

            <div className="p-3 bg-orange-50 rounded-full">
              <FiDollarSign size={22} className="text-orange-600" />
            </div>
          </div>
        </div>
      </div>

      {/* =====================================================
          BẢNG
      ===================================================== */}

      <div className="bg-white border rounded-lg shadow-sm overflow-hidden">
        <div className="max-h-[600px] overflow-auto">
          <table className="w-full border-separate border-spacing-0 text-xs">
            <thead className="bg-gray-100 sticky top-0 z-10">
              <tr>
                <th className="border px-3 py-3 text-center w-16">STT</th>

                <th className="border px-3 py-3 text-center">MÃ CHUYẾN</th>

                <th className="border px-3 py-3 text-center">MÃ KH</th>

                <th className="border px-3 py-3 text-center">KHÁCH HÀNG</th>

                <th className="border px-3 py-3 text-center">DIỄN GIẢI</th>

                <th className="border px-3 py-3 text-center">NGÀY ĐÓNG HÀNG</th>

                <th className="border px-3 py-3 text-center">NGÀY GIAO HÀNG</th>

                <th className="border px-3 py-3 text-center">BIỂN SỐ XE</th>

                <th className="border px-3 py-3 text-center">TỔNG TIỀN</th>

                <th className="border px-3 py-3 text-center">ĐÃ THANH TOÁN</th>

                <th className="border px-3 py-3 text-center">CÒN LẠI</th>

                <th className="border px-3 py-3 text-center">TRẠNG THÁI</th>
              </tr>
            </thead>

            <tbody>
              {loading ? (
                <tr>
                  <td
                    colSpan={10}
                    className="border px-4 py-12 text-center text-gray-500"
                  >
                    Đang tải dữ liệu...
                  </td>
                </tr>
              ) : filteredData.length === 0 ? (
                <tr>
                  <td
                    colSpan={10}
                    className="border px-4 py-12 text-center text-gray-500"
                  >
                    Không có chuyến quá hạn chưa thanh toán
                  </td>
                </tr>
              ) : (
                filteredData.map((item, index) => (
                  <tr key={item._id} className="hover:bg-gray-50">
                    {/* STT */}

                    <td className="border px-3 py-2 text-center">
                      {index + 1}
                    </td>

                    {/* MÃ CHUYẾN */}

                    <td className="border px-3 py-2 font-medium">
                      {item.maChuyen || ""}
                    </td>

                    {/* MÃ KH */}

                    <td className="border px-3 py-2">{item.maKH || ""}</td>

                    {/* KHÁCH HÀNG */}

                    <td className="border px-3 py-2">
                      {item.nameCustomer || ""}
                    </td>

                    {/* DIỄN GIẢI */}

                    <td className="border px-3 py-2">{item.dienGiai || ""}</td>

                    {/* NGÀY ĐÓNG */}

                    <td className="border px-3 py-2 text-center">
                      {formatDate(item.ngayBocHang)}
                    </td>

                    {/* NGÀY GIAO */}

                    <td className="border px-3 py-2 text-center">
                      {formatDate(item.ngayGiaoHang)}
                    </td>

                    {/* BIỂN SỐ */}

                    <td className="border px-3 py-2">{item.bienSoXe || ""}</td>

                    {/* TỔNG TIỀN */}

                    <td className="border px-3 py-2 text-right">
                      {formatMoney(item.tongTien)} VNĐ
                    </td>

                    {/* ĐÃ THANH TOÁN */}

                    <td className="border px-3 py-2 text-right">
                      {formatMoney(item.daThanhToan)} VNĐ
                    </td>

                    {/* CÒN LẠI */}

                    <td className="border px-3 py-2 text-right font-bold text-red-600">
                      {formatMoney(item.conLai)} VNĐ
                    </td>

                    {/* TRẠNG THÁI */}

                    <td className="border px-3 py-2 text-center">
                      <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold bg-red-100 text-red-700">
                        Quá hạn
                      </span>
                    </td>
                  </tr>
                ))
              )}
            </tbody>

            {/* =====================================================
                FOOTER
            ===================================================== */}

            {data.length > 0 && (
              <tfoot className="bg-gray-50 font-bold">
                <tr>
                  <td colSpan={8} className="border px-3 py-3 text-right">
                    TỔNG CÔNG NỢ QUÁ HẠN
                  </td>

                  <td className="border px-3 py-3 text-right text-red-600">
                    {formatMoney(totalConLai)} VNĐ
                  </td>

                  <td className="border" />
                </tr>
              </tfoot>
            )}
          </table>
        </div>
      </div>
    </div>
  );
};

export default OverdueCustomerDebtPage;
