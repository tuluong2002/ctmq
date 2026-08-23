import React, { useEffect, useMemo, useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import axios from "axios";
import {
  FiRefreshCw,
  FiPlus,
  FiSearch,
  FiCheck,
  FiSave,
  FiX,
} from "react-icons/fi";

import API from "../../api";

const TripActualCostPage = ({ user }) => {
  const navigate = useNavigate();
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

  const handleGoToEmployee = () => {
    navigate("/employee-leave-advance", { state: { user } });
  };

  const handleGoToTripActualCost = () => {
    navigate("/trip-actual-cost", { state: { user } });
  };
  // =====================================================
  // STATE
  // =====================================================

  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(false);
  const [creating, setCreating] = useState(false);
  const [savingId, setSavingId] = useState(null);
  const [updatingId, setUpdatingId] = useState(null);

  const [searchMaChuyen, setSearchMaChuyen] = useState("");
  const [statusFilter, setStatusFilter] = useState("ALL");

  const [fromDate, setFromDate] = useState(
    () => localStorage.getItem("tripActualCost_fromDate") || "",
  );

  const [toDate, setToDate] = useState(
    () => localStorage.getItem("tripActualCost_toDate") || "",
  );

  const [maChuyenInput, setMaChuyenInput] = useState("");

  const canManageTrip = (item) => {
    const hasManagePermission =
      Array.isArray(user?.permissions) &&
      user.permissions.includes("manage_CP_thucte");

    if (hasManagePermission) {
      return true;
    }

    return (
      String(user?.username || "")
        .trim()
        .toLowerCase() ===
      String(item?.accountUsername || "")
        .trim()
        .toLowerCase()
    );
  };

  useEffect(() => {
    if (fromDate) {
      localStorage.setItem("tripActualCost_fromDate", fromDate);
    } else {
      localStorage.removeItem("tripActualCost_fromDate");
    }
  }, [fromDate]);

  useEffect(() => {
    if (toDate) {
      localStorage.setItem("tripActualCost_toDate", toDate);
    } else {
      localStorage.removeItem("tripActualCost_toDate");
    }
  }, [toDate]);

  // =====================================================
  // API
  // =====================================================

  const BASE_URL = `${API}/trip-actual-cost`;

  // =====================================================
  // FORMAT MONEY
  // =====================================================

  const formatMoney = (value) => {
    if (value === null || value === undefined || value === "") {
      return "0";
    }

    const number = Number(String(value).replace(/[^\d-]/g, ""));

    if (!Number.isFinite(number)) {
      return "0";
    }

    return new Intl.NumberFormat("vi-VN").format(number);
  };

  // =====================================================
  // FORMAT INPUT MONEY
  // =====================================================

  const formatInputMoney = (value) => {
    if (value === null || value === undefined || value === "") {
      return "";
    }

    const number = Number(String(value).replace(/[^\d-]/g, ""));

    if (!Number.isFinite(number)) {
      return "";
    }

    return new Intl.NumberFormat("vi-VN").format(number);
  };

  // =====================================================
  // PARSE MONEY
  // =====================================================

  const parseMoney = (value) => {
    if (value === null || value === undefined || value === "") {
      return 0;
    }

    const number = Number(String(value).replace(/[^\d-]/g, ""));

    return Number.isFinite(number) ? number : 0;
  };

  // =====================================================
  // LOAD USERS
  // =====================================================

  const [userList, setUserList] = useState([]);
  const [userFilter, setUserFilter] = useState("");

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

  const getUserFullname = (username) => {
    if (!username) {
      return "-";
    }

    const user = userList.find(
      (item) => String(item.username).trim() === String(username).trim(),
    );

    return user?.fullname?.trim() || username;
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  // =====================================================
  // LOAD DATA
  // =====================================================

  const fetchData = async () => {
    try {
      setLoading(true);

      const params = {};

      if (searchMaChuyen.trim()) {
        params.maChuyen = searchMaChuyen.trim();
      }

      if (fromDate) {
        params.fromDate = fromDate;
      }

      if (toDate) {
        params.toDate = toDate;
      }

      if (statusFilter === "TRUE") {
        params.isTrue = "true";
      }

      if (statusFilter === "FALSE") {
        params.isTrue = "false";
      }

      const response = await axios.get(BASE_URL, {
        params,
      });

      setData(response.data?.data || []);
    } catch (error) {
      console.error("fetchData error:", error);

      alert(error.response?.data?.message || "Không thể tải dữ liệu");
    } finally {
      setLoading(false);
    }
  };

  // =====================================================
  // LOAD INIT
  // =====================================================

  useEffect(() => {
    fetchData();
  }, [statusFilter, fromDate, toDate]);

  // =====================================================
  // LOCAL FILTER
  // =====================================================

  const filteredData = useMemo(() => {
    const keyword = searchMaChuyen.trim().toLowerCase();

    return data.filter((item) => {
      // =========================
      // LỌC MÃ CHUYẾN
      // =========================

      if (
        keyword &&
        !String(item.maChuyen || "")
          .toLowerCase()
          .includes(keyword)
      ) {
        return false;
      }

      // =========================
      // LỌC NGƯỜI DÙNG
      // =========================

      if (
        userFilter &&
        String(item.accountUsername || "") !== String(userFilter)
      ) {
        return false;
      }

      return true;
    });
  }, [data, searchMaChuyen, userFilter]);

  // =====================================================
  // THÊM MÃ CHUYẾN
  // =====================================================

  const handleCreate = async () => {
    const maChuyen = maChuyenInput.trim();

    if (!maChuyen) {
      alert("Vui lòng nhập mã chuyến");
      return;
    }

    try {
      setCreating(true);

      const response = await axios.post(BASE_URL, {
        maChuyen,
      });

      alert(response.data?.message || "Tạo dữ liệu thành công");

      setMaChuyenInput("");

      await fetchData();
    } catch (error) {
      console.error("handleCreate error:", error);

      alert(error.response?.data?.message || "Không thể tạo dữ liệu");
    } finally {
      setCreating(false);
    }
  };

  // =====================================================
  // ENTER INPUT
  // =====================================================

  const handleMaChuyenKeyDown = (e) => {
    if (e.key === "Enter") {
      handleCreate();
    }
  };

  // =====================================================
  // UPDATE LOCAL VALUE
  // =====================================================

  const handleActualChange = (id, field, value) => {
    setData((prev) =>
      prev.map((item) => {
        if (item._id !== id) {
          return item;
        }

        return {
          ...item,
          [field]: value,
        };
      }),
    );
  };

  // =====================================================
  // SAVE THỰC TẾ
  // =====================================================

  const handleSaveActual = async (item) => {
    if (item.isTrue) {
      return;
    }

    try {
      setSavingId(item._id);

      const payload = {
        bocXepThucTe: parseMoney(item.bocXepThucTe),
        veThucTe: parseMoney(item.veThucTe),
        hangVeThucTe: parseMoney(item.hangVeThucTe),
        luuCaThucTe: parseMoney(item.luuCaThucTe),
        luatChiPhiKhacThucTe: parseMoney(item.luatChiPhiKhacThucTe),
      };

      const response = await axios.put(`${BASE_URL}/${item._id}`, payload);

      const updated = response.data?.data;

      setData((prev) =>
        prev.map((row) => (row._id === item._id ? updated : row)),
      );
    } catch (error) {
      console.error("handleSaveActual error:", error);

      alert(error.response?.data?.message || "Không thể lưu dữ liệu");
    } finally {
      setSavingId(null);
    }
  };

  // =====================================================
  // CẬP NHẬT VỀ CHUYẾN GỐC
  // =====================================================

  const handleUpdateOriginal = async (item) => {
    if (item.isTrue) {
      return;
    }

    const confirmed = window.confirm(
      `Bạn có chắc muốn cập nhật dữ liệu thực tế về chuyến ${item.maChuyen}?\n\nSau khi cập nhật, dữ liệu này sẽ bị khóa và không thể sửa lại.`,
    );

    if (!confirmed) {
      return;
    }

    try {
      setUpdatingId(item._id);

      const saveResponse = await axios.put(`${BASE_URL}/${item._id}`, {
        bocXepThucTe: parseMoney(item.bocXepThucTe),
        veThucTe: parseMoney(item.veThucTe),
        hangVeThucTe: parseMoney(item.hangVeThucTe),
        luuCaThucTe: parseMoney(item.luuCaThucTe),
        luatChiPhiKhacThucTe: parseMoney(item.luatChiPhiKhacThucTe),
      });

      const savedItem = saveResponse.data?.data;

      const response = await axios.put(
        `${BASE_URL}/${item._id}/update-original`,
      );

      const updated = response.data?.data?.record || savedItem;

      setData((prev) =>
        prev.map((row) => (row._id === item._id ? updated : row)),
      );

      alert(response.data?.message || "Đã cập nhật về chuyến gốc");
    } catch (error) {
      console.error("handleUpdateOriginal error:", error);

      alert(
        error.response?.data?.message || "Không thể cập nhật về chuyến gốc",
      );
    } finally {
      setUpdatingId(null);
    }
  };

  // =====================================================
  // INPUT THỰC TẾ
  // =====================================================

  const renderActualInput = (item, field) => {
    const canEdit = canManageTrip(item);

    const disabled =
      !canEdit ||
      item.isTrue ||
      savingId === item._id ||
      updatingId === item._id;

    const value =
      item[field] === null || item[field] === undefined || item[field] === ""
        ? ""
        : formatInputMoney(item[field]);

    return (
      <input
        type="text"
        value={value}
        disabled={disabled}
        placeholder={canEdit ? "Nhập thực tế" : "Không có quyền"}
        onChange={(e) => {
          const raw = e.target.value.replace(/[^\d]/g, "");

          handleActualChange(item._id, field, raw);
        }}
        className={`w-full min-w-[120px] border rounded-md px-2 py-1.5 text-right outline-none transition ${
          disabled
            ? "bg-gray-100 text-gray-500 cursor-not-allowed border-gray-200"
            : "bg-white border-blue-300 focus:ring-2 focus:ring-blue-200"
        }`}
      />
    );
  };

  // =====================================================
  // TỔNG CHÊNH LỆCH
  // =====================================================

  const renderDifference = (value) => {
    const number = Number(value) || 0;

    return (
      <span
        className={`${number > 0 ? "text-green-600" : number < 0 ? "text-red-600" : "text-gray-500"} font-semibold`}
      >
        {number > 0 ? "+" : ""}
        {formatMoney(number)}
      </span>
    );
  };

  // =====================================================
  // JSX
  // =====================================================

  return (
    <div className="p-2 md:p-4 bg-gray-50 min-h-screen">
      <div className="flex gap-2 items-center mb-3 text-xs">
        <button
          onClick={() => navigate("/ke-toan")}
          className="px-3 py-1 rounded text-white bg-blue-500"
        >
          Trang chủ
        </button>

        <button
          onClick={handleGoToDrivers}
          className={`px-3 py-1 rounded text-white 
      ${isActive("/manage-driver") ? "bg-green-600" : "bg-blue-500"}
    `}
        >
          Danh sách LX
        </button>

        <button
          onClick={handleGoToCustomers}
          className={`px-3 py-1 rounded text-white 
      ${isActive("/manage-customer") ? "bg-green-600" : "bg-blue-500"}
    `}
        >
          Danh sách KH
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
          Danh sách chuyến PT
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
          Khách lẻ
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
          HĐ vận chuyển
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
          Khách lẻ quá hạn
        </button>
        <button
          onClick={handleGoToEmployee}
          className={`px-3 py-1 rounded text-white ${
            isActive("/employee-leave-advance") ? "bg-green-600" : "bg-blue-500"
          }`}
        >
          LX nghỉ & UT
        </button>

        <button
          onClick={handleGoToTripActualCost}
          className={`px-3 py-1 rounded text-white ${
            isActive("/trip-actual-cost") ? "bg-green-600" : "bg-blue-500"
          }`}
        >
          Sửa chi phí LX
        </button>
      </div>
      {/* HEADER */}

      <div className="mb-5">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-800">
              SỬA CHI PHÍ CHUYẾN TRÊN THỰC TẾ
            </h1>

            <p className="text-sm text-gray-500 mt-1">
              So sánh chi phí gốc với chi phí thực tế của từng chuyến
            </p>
          </div>

          <button
            onClick={fetchData}
            disabled={loading}
            className="inline-flex items-center justify-center gap-2 px-4 py-2 bg-white border border-gray-300 rounded-lg hover:bg-gray-100 disabled:opacity-50"
          >
            <FiRefreshCw className={loading ? "animate-spin" : ""} />
            Làm mới
          </button>
        </div>
      </div>

      {/* NHẬP MÃ CHUYẾN */}

      <div className="bg-white border border-gray-200 rounded-xl p-4 mb-4 shadow-sm">
        <div className="flex flex-col md:flex-row gap-3">
          <div className="flex-1">
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Nhập mã chuyến
            </label>

            <div className="relative">
              <FiSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />

              <input
                type="text"
                value={maChuyenInput}
                onChange={(e) => setMaChuyenInput(e.target.value)}
                onKeyDown={handleMaChuyenKeyDown}
                placeholder="Nhập mã chuyến rồi Enter..."
                className="w-full border border-gray-300 rounded-lg pl-10 pr-10 py-2.5 outline-none focus:ring-2 focus:ring-blue-200 focus:border-blue-400"
              />

              {maChuyenInput && (
                <button
                  type="button"
                  onClick={() => setMaChuyenInput("")}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-700"
                >
                  <FiX />
                </button>
              )}
            </div>
          </div>

          <div className="flex items-end">
            <button
              onClick={handleCreate}
              disabled={creating || !maChuyenInput.trim()}
              className="w-full md:w-auto inline-flex items-center justify-center gap-2 px-5 py-2.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <FiPlus />
              {creating ? "Đang tạo..." : "Thêm chuyến"}
            </button>
          </div>
        </div>
      </div>

      {/* FILTER */}

      <div className="bg-white border border-gray-200 rounded-xl p-4 mb-4 shadow-sm">
        <div className="flex flex-col lg:flex-row gap-3 lg:items-end">
          <div className="flex-1">
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Tìm mã chuyến
            </label>

            <div className="relative">
              <FiSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />

              <input
                type="text"
                value={searchMaChuyen}
                onChange={(e) => setSearchMaChuyen(e.target.value)}
                placeholder="Tìm mã chuyến..."
                className="w-full border border-gray-300 rounded-lg pl-10 pr-10 py-2 outline-none focus:ring-2 focus:ring-blue-200"
              />

              {searchMaChuyen && (
                <button
                  onClick={() => setSearchMaChuyen("")}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-700"
                >
                  <FiX />
                </button>
              )}
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Từ ngày
            </label>

            <input
              type="date"
              value={fromDate}
              onChange={(e) => setFromDate(e.target.value)}
              className="border border-gray-300 rounded-lg px-3 py-2 outline-none bg-white focus:ring-2 focus:ring-blue-200 cursor-pointer"
              onClick={(e) => e.target.showPicker()}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Đến ngày
            </label>

            <input
              type="date"
              value={toDate}
              onChange={(e) => setToDate(e.target.value)}
              className="border border-gray-300 rounded-lg px-3 py-2 outline-none bg-white focus:ring-2 focus:ring-blue-200 cursor-pointer"
              onClick={(e) => e.target.showPicker()}
            />
          </div>

          <div className="min-w-[220px]">
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Người phụ trách
            </label>

            <select
              value={userFilter}
              onChange={(e) => setUserFilter(e.target.value)}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 outline-none bg-white focus:ring-2 focus:ring-blue-200"
            >
              <option value="">Tất cả người dùng</option>

              {userList.map((user) => (
                <option key={user._id} value={user.username}>
                  {user.fullname?.trim() || user.username}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Trạng thái
            </label>

            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="border border-gray-300 rounded-lg px-3 py-2 outline-none bg-white"
            >
              <option value="ALL">Tất cả</option>
              <option value="FALSE">Chưa cập nhật</option>
              <option value="TRUE">Đã cập nhật</option>
            </select>
          </div>

          <div className="text-sm text-gray-500 pb-2">
            Có <b className="text-gray-800">{filteredData.length}</b> chuyến
          </div>
        </div>
      </div>

      {/* TABLE */}

      <div className="bg-white border border-gray-200 rounded-xl shadow-sm overflow-hidden">
        <div className="overflow-auto max-h-[calc(100vh-300px)]">
          <table className="min-w-[1700px] w-full border-separate border-spacing-0 text-xs">
            <thead className="sticky top-0 z-20 bg-gray-100">
              <tr>
                <th
                  rowSpan={2}
                  className="sticky left-0 z-30 bg-gray-100 border border-gray-300 px-3 py-3 text-center w-[50px]"
                >
                  STT
                </th>

                <th
                  rowSpan={2}
                  className="sticky left-[47px] z-30 bg-gray-100 border border-gray-300 px-3 py-3 text-center min-w-[100px]"
                >
                  MÃ CHUYẾN
                </th>

                <th
                  rowSpan={2}
                  className="border border-gray-300 px-3 py-3 text-center min-w-[140px]"
                >
                  NGƯỜI PHỤ TRÁCH
                </th>

                <th
                  rowSpan={2}
                  className="border border-gray-300 px-3 py-3 text-center min-w-[140px]"
                >
                  TÊN LÁI XE
                </th>

                <th
                  rowSpan={2}
                  className="border border-gray-300 px-3 py-3 text-center min-w-[180px]"
                >
                  KHÁCH HÀNG
                </th>

                <th
                  rowSpan={2}
                  className="border border-gray-300 px-3 py-3 text-center min-w-[60px]"
                >
                  MÃ KH
                </th>

                <th
                  rowSpan={2}
                  className="border border-gray-300 px-3 py-3 text-center min-w-[90px]"
                >
                  NGÀY GIAO HÀNG
                </th>

                <th
                  colSpan={2}
                  className="border border-gray-300 px-3 py-2 text-center bg-gray-200"
                >
                  BỐC XẾP
                </th>

                <th
                  colSpan={2}
                  className="border border-gray-300 px-3 py-2 text-center bg-gray-200"
                >
                  VÉ
                </th>

                <th
                  colSpan={2}
                  className="border border-gray-300 px-3 py-2 text-center bg-gray-200"
                >
                  HÀNG VỀ
                </th>

                <th
                  colSpan={2}
                  className="border border-gray-300 px-3 py-2 text-center bg-gray-200"
                >
                  LƯU CA
                </th>

                <th
                  colSpan={2}
                  className="border border-gray-300 px-3 py-2 text-center bg-gray-200"
                >
                  LUẬT CHI PHÍ KHÁC
                </th>

                <th
                  rowSpan={2}
                  className="border border-gray-300 px-3 py-3 text-center min-w-[120px]"
                >
                  TỔNG CHÊNH LỆCH
                </th>

                <th
                  rowSpan={2}
                  className="border border-gray-300 px-3 py-3 text-center min-w-[130px]"
                >
                  TRẠNG THÁI
                </th>

                <th
                  rowSpan={2}
                  className="border border-gray-300 px-3 py-3 text-center min-w-[190px]"
                >
                  THAO TÁC
                </th>
              </tr>

              <tr>
                <th className="border border-gray-300 px-3 py-2 text-center bg-gray-50">
                  Gốc
                </th>

                <th className="border border-gray-300 px-3 py-2 text-center bg-blue-50 text-blue-700">
                  Thực tế
                </th>

                <th className="border border-gray-300 px-3 py-2 text-center bg-gray-50">
                  Gốc
                </th>

                <th className="border border-gray-300 px-3 py-2 text-center bg-blue-50 text-blue-700">
                  Thực tế
                </th>

                <th className="border border-gray-300 px-3 py-2 text-center bg-gray-50">
                  Gốc
                </th>

                <th className="border border-gray-300 px-3 py-2 text-center bg-blue-50 text-blue-700">
                  Thực tế
                </th>

                <th className="border border-gray-300 px-3 py-2 text-center bg-gray-50">
                  Gốc
                </th>

                <th className="border border-gray-300 px-3 py-2 text-center bg-blue-50 text-blue-700">
                  Thực tế
                </th>

                <th className="border border-gray-300 px-3 py-2 text-center bg-gray-50">
                  Gốc
                </th>

                <th className="border border-gray-300 px-3 py-2 text-center bg-blue-50 text-blue-700">
                  Thực tế
                </th>
              </tr>
            </thead>

            <tbody>
              {loading && (
                <tr>
                  <td
                    colSpan={21}
                    className="border border-gray-300 px-4 py-10 text-center text-gray-500"
                  >
                    <div className="flex items-center justify-center gap-2">
                      <FiRefreshCw className="animate-spin" />
                      Đang tải dữ liệu...
                    </div>
                  </td>
                </tr>
              )}

              {!loading && filteredData.length === 0 && (
                <tr>
                  <td
                    colSpan={21}
                    className="border border-gray-300 px-4 py-12 text-center text-gray-500"
                  >
                    Không có dữ liệu
                  </td>
                </tr>
              )}

              {!loading &&
                filteredData.map((item, index) => {
                  const isSaving = savingId === item._id;
                  const isUpdating = updatingId === item._id;

                  return (
                    <tr key={item._id} className="hover:bg-gray-50">
                      <td className="sticky left-0 z-10 bg-white border border-gray-300 px-3 py-2 text-center">
                        {index + 1}
                      </td>

                      <td className="sticky left-[47px] z-10 bg-white border border-gray-300 px-3 py-2 font-semibold text-blue-700">
                        {item.maChuyen}
                      </td>

                      <td className="border border-gray-300 px-3 py-2">
                        {getUserFullname(item.accountUsername)}
                      </td>

                      <td className="border border-gray-300 px-3 py-2">
                        {item.tenLaiXe || "-"}
                      </td>

                      <td className="border border-gray-300 px-3 py-2">
                        {item.khachHang || "-"}
                      </td>

                      <td className="border border-gray-300 px-3 py-2 text-center">
                        {item.maKH || "-"}
                      </td>

                      <td className="border border-gray-300 px-3 py-2 text-center">
                        {item.ngayGiaoHang
                          ? new Date(item.ngayGiaoHang).toLocaleDateString(
                              "vi-VN",
                            )
                          : "-"}
                      </td>

                      {/* BỐC XẾP */}

                      <td className="border border-gray-300 px-3 py-2 text-right">
                        {formatMoney(item.bocXep)}
                      </td>

                      <td className="border border-gray-300 px-2 py-1 bg-blue-50">
                        {renderActualInput(item, "bocXepThucTe")}
                      </td>

                      {/* VÉ */}

                      <td className="border border-gray-300 px-3 py-2 text-right">
                        {formatMoney(item.ve)}
                      </td>

                      <td className="border border-gray-300 px-2 py-1 bg-blue-50">
                        {renderActualInput(item, "veThucTe")}
                      </td>

                      {/* HÀNG VỀ */}

                      <td className="border border-gray-300 px-3 py-2 text-right">
                        {formatMoney(item.hangVe)}
                      </td>

                      <td className="border border-gray-300 px-2 py-1 bg-blue-50">
                        {renderActualInput(item, "hangVeThucTe")}
                      </td>

                      {/* LƯU CA */}

                      <td className="border border-gray-300 px-3 py-2 text-right">
                        {formatMoney(item.luuCa)}
                      </td>

                      <td className="border border-gray-300 px-2 py-1 bg-blue-50">
                        {renderActualInput(item, "luuCaThucTe")}
                      </td>

                      {/* LUẬT CP KHÁC */}

                      <td className="border border-gray-300 px-3 py-2 text-right">
                        {formatMoney(item.luatChiPhiKhac)}
                      </td>

                      <td className="border border-gray-300 px-2 py-1 bg-blue-50">
                        {renderActualInput(item, "luatChiPhiKhacThucTe")}
                      </td>

                      {/* TỔNG CHÊNH LỆCH */}

                      <td className="border border-gray-300 px-3 py-2 text-right font-bold">
                        {renderDifference(item.tongChenhLech)}
                      </td>

                      {/* TRẠNG THÁI */}

                      <td className="border border-gray-300 px-3 py-2 text-center">
                        {item.isTrue ? (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium bg-green-100 text-green-700">
                            <FiCheck />
                            Đã cập nhật
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium bg-yellow-100 text-yellow-700">
                            Chưa cập nhật
                          </span>
                        )}
                      </td>

                      {/* THAO TÁC */}

                      <td className="border border-gray-300 px-2 py-2">
                        <div className="flex items-center justify-center gap-2">
                          {!item.isTrue && canManageTrip(item) && (
                            <>
                              <button
                                onClick={() => handleSaveActual(item)}
                                disabled={isSaving || isUpdating}
                                title="Lưu giá trị thực tế"
                                className="inline-flex items-center gap-1 px-3 py-1.5 rounded-md bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-50"
                              >
                                {isSaving ? (
                                  <FiRefreshCw className="animate-spin" />
                                ) : (
                                  <FiSave />
                                )}
                                Lưu
                              </button>

                              <button
                                onClick={() => handleUpdateOriginal(item)}
                                disabled={isSaving || isUpdating}
                                title="Cập nhật về chuyến gốc"
                                className="inline-flex items-center gap-1 px-3 py-1.5 rounded-md bg-green-600 text-white hover:bg-green-700 disabled:opacity-50"
                              >
                                {isUpdating ? (
                                  <FiRefreshCw className="animate-spin" />
                                ) : (
                                  <FiCheck />
                                )}
                                Cập nhật
                              </button>
                            </>
                          )}

                          {item.isTrue && (
                            <span className="inline-flex items-center gap-1 px-3 py-1.5 rounded-md bg-gray-100 text-gray-500 text-xs">
                              <FiCheck />
                              Đã khóa
                            </span>
                          )}

                          {!item.isTrue && !canManageTrip(item) && (
                            <span className="text-xs text-gray-400">
                              Không có quyền
                            </span>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default TripActualCostPage;
