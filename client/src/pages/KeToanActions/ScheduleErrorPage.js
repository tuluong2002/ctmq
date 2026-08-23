import React, { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import {
  FiEdit2,
  FiPlus,
  FiRefreshCw,
  FiSearch,
  FiTrash2,
} from "react-icons/fi";
import axios from "axios";

import API from "../../api";
import ScheduleErrorModal from "../../components/ScheduleError/ScheduleErrorModal";

const ScheduleErrorPage = ({ user }) => {
  // =========================================================
  // STATE
  // =========================================================
  const [scheduleErrors, setScheduleErrors] = useState([]);

  // =========================================================
  // PHÂN TRANG
  // =========================================================
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalRecords, setTotalRecords] = useState(0);

  // Trang muốn chuyển đến
  const [pageInput, setPageInput] = useState("1");

  // =========================================================
  // THỐNG KÊ - TÍNH TRÊN TOÀN BỘ KẾT QUẢ THEO BỘ LỌC
  // KHÔNG PHỤ THUỘC TRANG
  // =========================================================
  const [summary, setSummary] = useState({
    totalErrors: 0,
    totalUnprocessed: 0,
    totalAdjustmentUnprocessed: 0,
  });

  const [loading, setLoading] = useState(false);
  const [deletingId, setDeletingId] = useState(null);

  const [showModal, setShowModal] = useState(false);
  const [editingItem, setEditingItem] = useState(null);

  const canEditScheduleError = user?.permissions?.includes("edit_sche_err");

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
  }


  // Bộ lọc
  const [filters, setFilters] = useState({
    maChuyen: "",
    maKH: "",
    khachHang: "",
    keToanPhuTrach: "",
    trangThai: "",
    fromDate: "",
    toDate: "",
  });

  const [appliedFilters, setAppliedFilters] = useState({
    maChuyen: "",
    maKH: "",
    khachHang: "",
    keToanPhuTrach: "",
    trangThai: "",
    fromDate: "",
    toDate: "",
  });

  // =========================================================
  // FORMAT DATE
  // =========================================================
  const formatDate = useCallback((value) => {
    if (!value) return "";

    const date = new Date(value);

    if (Number.isNaN(date.getTime())) {
      return "";
    }

    return date.toLocaleDateString("vi-VN");
  }, []);

  // =========================================================
  // FORMAT MONEY
  // =========================================================
  const formatMoney = useCallback((value) => {
    if (value === null || value === undefined || value === "") {
      return "0";
    }

    const number = Number(value);

    if (Number.isNaN(number)) {
      return "0";
    }

    return number.toLocaleString("vi-VN");
  }, []);

  // =========================================================
  // LẤY DANH SÁCH
  // =========================================================
  const fetchScheduleErrors = useCallback(async (customFilters, page) => {
    try {
      setLoading(true);

      const params = {
        page: Number(page) || 1,
        limit: 50,
      };

      // -----------------------------------------
      // MÃ CHUYẾN
      // -----------------------------------------
      if (customFilters.maChuyen?.trim()) {
        params.maChuyen = customFilters.maChuyen.trim();
      }

      // -----------------------------------------
      // MÃ KH
      // -----------------------------------------
      if (customFilters.maKH?.trim()) {
        params.maKH = customFilters.maKH.trim();
      }

      // -----------------------------------------
      // KHÁCH HÀNG
      // -----------------------------------------
      if (customFilters.khachHang?.trim()) {
        params.khachHang = customFilters.khachHang.trim();
      }

      // -----------------------------------------
      // KẾ TOÁN PHỤ TRÁCH
      // -----------------------------------------
      if (customFilters.keToanPhuTrach?.trim()) {
        params.keToanPhuTrach = customFilters.keToanPhuTrach.trim();
      }

      // -----------------------------------------
      // TRẠNG THÁI
      // -----------------------------------------
      if (customFilters.trangThai) {
        params.trangThai = customFilters.trangThai;
      }

      // -----------------------------------------
      // TỪ NGÀY
      // -----------------------------------------
      if (customFilters.fromDate) {
        params.fromDate = customFilters.fromDate;
      }

      // -----------------------------------------
      // ĐẾN NGÀY
      // -----------------------------------------
      if (customFilters.toDate) {
        params.toDate = customFilters.toDate;
      }

      console.log("FILTER GỬI BE:", params);

      const response = await axios.get(`${API}/schedule-errors`, {
        params,
      });

      // =====================================================
      // DATA
      // =====================================================
      setScheduleErrors(response.data?.data || []);

      // =====================================================
      // PAGINATION
      // =====================================================
      const pagination = response.data?.pagination || {};

      const loadedPage = Number(pagination.page) || 1;

      setCurrentPage(loadedPage);
      setPageInput(String(loadedPage));

      setTotalPages(Math.max(Number(pagination.totalPages) || 1, 1));

      setTotalRecords(Number(pagination.total) || 0);

      // =====================================================
      // SUMMARY
      // TOÀN BỘ KẾT QUẢ SAU FILTER
      // =====================================================
      const serverSummary = response.data?.summary || {};

      setSummary({
        totalErrors: Number(serverSummary.totalErrors) || 0,

        totalUnprocessed: Number(serverSummary.totalUnprocessed) || 0,

        totalAdjustmentUnprocessed:
          Number(serverSummary.totalAdjustmentUnprocessed) || 0,
      });
    } catch (error) {
      console.error("fetchScheduleErrors error:", error);

      alert(
        error.response?.data?.message ||
          "Không thể lấy danh sách chuyến sai sót",
      );
    } finally {
      setLoading(false);
    }
  }, []);

  // =========================================================
  // TỰ ĐỘNG LOAD KHI ĐỔI FILTER HOẶC ĐỔI TRANG
  // =========================================================
  useEffect(() => {
    fetchScheduleErrors(appliedFilters, currentPage);
  }, [appliedFilters, currentPage, fetchScheduleErrors]);

  // =========================================================
  // THAY ĐỔI FILTER
  // =========================================================
  const handleFilterChange = (e) => {
    const { name, value } = e.target;

    setFilters((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  // =========================================================
  // TÌM KIẾM
  // =========================================================
  const handleSearch = () => {
    setCurrentPage(1);
    setPageInput("1");

    setAppliedFilters({
      maChuyen: filters.maChuyen.trim(),
      maKH: filters.maKH.trim(),
      khachHang: filters.khachHang.trim(),
      keToanPhuTrach: filters.keToanPhuTrach.trim(),
      trangThai: filters.trangThai,
      fromDate: filters.fromDate,
      toDate: filters.toDate,
    });
  };

  // =========================================================
  // ENTER ĐỂ TÌM
  // =========================================================
  const handleFilterKeyDown = (e) => {
    if (e.key === "Enter") {
      handleSearch();
    }
  };

  // =========================================================
  // RESET FILTER
  // =========================================================
  const handleResetFilter = () => {
    const emptyFilters = {
      maChuyen: "",
      maKH: "",
      khachHang: "",
      keToanPhuTrach: "",
      trangThai: "",
      fromDate: "",
      toDate: "",
    };

    setCurrentPage(1);

    setFilters(emptyFilters);
    setAppliedFilters(emptyFilters);
  };

  // =========================================================
  // REFRESH
  // =========================================================
  const handleRefresh = () => {
    fetchScheduleErrors(appliedFilters, currentPage);
  };

  // =========================================================
  // THÊM
  // =========================================================
  const handleAdd = () => {
    setEditingItem(null);
    setShowModal(true);
  };

  // =========================================================
  // SỬA
  // =========================================================
  const handleEdit = (item) => {
    setEditingItem(item);
    setShowModal(true);
  };

  // =========================================================
  // SAU KHI LƯU
  // =========================================================
  const handleModalSaved = async () => {
    setShowModal(false);
    setEditingItem(null);

    await fetchScheduleErrors(appliedFilters, currentPage);
  };

  // =========================================================
  // ĐÓNG MODAL
  // =========================================================
  const handleCloseModal = () => {
    setShowModal(false);
    setEditingItem(null);
  };

  // =========================================================
  // XÓA
  // =========================================================
  const handleDelete = async (item) => {
    if (!item?._id) {
      return;
    }

    const confirmed = window.confirm(
      `Bạn có chắc chắn muốn xóa sai sót của mã chuyến "${item.maChuyen}" không?`,
    );

    if (!confirmed) {
      return;
    }

    try {
      setDeletingId(item._id);

      await axios.delete(`${API}/schedule-errors/${item._id}`);

      alert("Xóa chuyến sai sót thành công");

      await fetchScheduleErrors(appliedFilters, currentPage);
    } catch (error) {
      console.error("deleteScheduleError error:", error);

      alert(error.response?.data?.message || "Không thể xóa chuyến sai sót");
    } finally {
      setDeletingId(null);
    }
  };

  // =========================================================
  // DATA
  // =========================================================
  const displayData = useMemo(() => {
    return Array.isArray(scheduleErrors) ? scheduleErrors : [];
  }, [scheduleErrors]);

  // =========================================================
  // THỐNG KÊ TOÀN BỘ THEO BỘ LỌC
  // =========================================================
  const totalErrors = summary.totalErrors;

  const totalUnprocessed = summary.totalUnprocessed;

  const totalProcessed = Math.max(totalErrors - totalUnprocessed, 0);

  const totalAdjustmentUnprocessed = summary.totalAdjustmentUnprocessed;

  // =========================================================
  // CHUYỂN TRANG
  // =========================================================
  const goToPage = (page) => {
    const targetPage = Math.min(
      Math.max(Number(page) || 1, 1),
      Math.max(totalPages, 1),
    );

    setCurrentPage(targetPage);
    setPageInput(String(targetPage));

    fetchScheduleErrors(appliedFilters, targetPage);
  };

  // =========================================================
  // NHẬP TRANG
  // =========================================================
  const handlePageInputChange = (e) => {
    const value = e.target.value;

    // Cho phép xóa ô để nhập lại
    if (value === "") {
      setPageInput("");
      return;
    }

    // Chỉ cho nhập số
    if (/^\d+$/.test(value)) {
      setPageInput(value);
    }
  };

  // =========================================================
  // ENTER ĐỂ ĐẾN TRANG
  // =========================================================
  const handlePageInputKeyDown = (e) => {
    if (e.key === "Enter") {
      goToPage(pageInput);
    }
  };

  // =========================================================
  // RENDER
  // =========================================================
  return (
    <div className="w-full h-full bg-gray-100 p-4">
      <div className="flex gap-2 items-center mb-4 text-xs">
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
          className="bg-blue-500 text-white px-3 py-1 rounded"
        >
          LX nghỉ & UT
        </button>

        <button
          onClick={handleGoToTripActualCost}
          className="bg-blue-500 text-white px-3 py-1 rounded"
        >
          Sửa chi phí LX
        </button>
      </div>
      {/* =================================================== */}
      {/* HEADER */}
      {/* =================================================== */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 mb-4">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-3 p-4">
          <div>
            <h1 className="text-xl font-bold text-gray-800">
              DANH SÁCH CHUYẾN SAI SÓT
            </h1>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleRefresh}
              disabled={loading}
              className="inline-flex items-center gap-2 px-4 py-1 border border-gray-300 rounded-lg text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50"
            >
              <FiRefreshCw className={loading ? "animate-spin" : ""} />
              Làm mới
            </button>

            <button
              type="button"
              onClick={handleAdd}
              disabled={!canEditScheduleError}
              className="inline-flex items-center gap-2 px-4 py-1 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-40 disabled:cursor-not-allowed"
            >
              <FiPlus />
              Thêm chuyến
            </button>
          </div>
        </div>
      </div>

      {/* =================================================== */}
      {/* THỐNG KÊ */}
      {/* =================================================== */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 mb-4">
        {/* TỔNG SAI SÓT */}
        <div className="bg-white rounded-lg border border-gray-200 shadow-sm p-4">
          <div className="text-sm text-gray-500">Tổng số sai sót</div>

          <div className="text-2xl font-bold text-gray-800 mt-1">
            {totalErrors.toLocaleString("vi-VN")}
          </div>
        </div>

        {/* CHƯA XỬ LÝ */}
        <div className="bg-white rounded-lg border border-gray-200 shadow-sm p-4">
          <div className="text-sm text-gray-500">Chưa xử lý</div>

          <div className="text-2xl font-bold text-yellow-600 mt-1">
            {totalUnprocessed.toLocaleString("vi-VN")}
          </div>
        </div>

        {/* ĐÃ XỬ LÝ */}
        <div className="bg-white rounded-lg border border-gray-200 shadow-sm p-4">
          <div className="text-sm text-gray-500">Đã xử lý</div>

          <div className="text-2xl font-bold text-green-600 mt-1">
            {totalProcessed.toLocaleString("vi-VN")}
          </div>
        </div>

        {/* TỔNG TIỀN CHƯA XỬ LÝ */}
        <div className="bg-white rounded-lg border border-gray-200 shadow-sm p-4">
          <div className="text-sm text-gray-500">Tổng tiền cần điều chỉnh</div>

          <div
            className={`text-xl font-bold mt-1 ${
              totalAdjustmentUnprocessed < 0
                ? "text-red-600"
                : totalAdjustmentUnprocessed > 0
                  ? "text-green-600"
                  : "text-gray-800"
            }`}
          >
            {formatMoney(totalAdjustmentUnprocessed)}
          </div>
        </div>
      </div>

      {/* =================================================== */}
      {/* FILTER */}
      {/* =================================================== */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 mb-4 p-4">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 xl:grid-cols-7 gap-3 items-end">
          {/* MÃ CHUYẾN */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Mã chuyến
            </label>

            <input
              type="text"
              name="maChuyen"
              value={filters.maChuyen}
              onChange={handleFilterChange}
              onKeyDown={handleFilterKeyDown}
              placeholder="Mã chuyến"
              className="w-full h-10 px-3 border border-gray-300 rounded-lg outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          {/* KHÁCH HÀNG */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Mã KH / Khách hàng
            </label>

            <input
              type="text"
              name="khachHang"
              value={filters.khachHang}
              onChange={handleFilterChange}
              onKeyDown={handleFilterKeyDown}
              placeholder="Mã KH hoặc tên KH"
              className="w-full h-10 px-3 border border-gray-300 rounded-lg outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          {/* NGƯỜI PHỤ TRÁCH */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Người phụ trách
            </label>

            <input
              type="text"
              name="keToanPhuTrach"
              value={filters.keToanPhuTrach}
              onChange={handleFilterChange}
              onKeyDown={handleFilterKeyDown}
              placeholder="Người phụ trách"
              className="w-full h-10 px-3 border border-gray-300 rounded-lg outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          {/* TRẠNG THÁI */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Trạng thái
            </label>

            <select
              name="trangThai"
              value={filters.trangThai}
              onChange={handleFilterChange}
              className="w-full h-10 px-3 border border-gray-300 rounded-lg outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">Tất cả</option>
              <option value="chuaXuLy">Chưa xử lý</option>
              <option value="daXuLy">Đã xử lý</option>
            </select>
          </div>

          {/* TỪ NGÀY */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Từ ngày giao
            </label>

            <input
              type="date"
              name="fromDate"
              value={filters.fromDate}
              onChange={handleFilterChange}
              onClick={(e) => e.target.showPicker()}
              className="w-full h-10 px-3 border border-gray-300 rounded-lg outline-none focus:ring-2 focus:ring-blue-500 cursor-pointer"
            />
          </div>

          {/* ĐẾN NGÀY */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Đến ngày giao
            </label>

            <input
              type="date"
              name="toDate"
              value={filters.toDate}
              onChange={handleFilterChange}
              onClick={(e) => e.target.showPicker()}
              className="w-full h-10 px-3 border border-gray-300 rounded-lg outline-none focus:ring-2 focus:ring-blue-500 cursor-pointer"
            />
          </div>

          {/* BUTTON */}
          <div className="flex items-center gap-2 h-10">
            <button
              type="button"
              onClick={handleResetFilter}
              className="h-10 px-4 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 whitespace-nowrap"
            >
              Xóa bộ lọc
            </button>

            <button
              type="button"
              onClick={handleSearch}
              disabled={loading}
              className="h-10 inline-flex items-center gap-2 px-4 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 whitespace-nowrap"
            >
              <FiSearch />
              Tìm kiếm
            </button>
          </div>
        </div>
      </div>

      {/* =================================================== */}
      {/* TABLE */}
      {/* =================================================== */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
        <div className="overflow-auto max-h-[calc(100vh-330px)]">
          <table className="min-w-[2200px] w-full border-separate border-spacing-0 text-xs">
            <thead className="sticky top-0 z-20 bg-gray-100">
              <tr>
                <th
                  className="sticky left-0 z-40 bg-gray-100 border border-gray-300 border-r border-solid px-3 py-2 text-center whitespace-nowrap"
                  style={{
                    width: "40px",
                    minWidth: "40px",
                  }}
                >
                  STT
                </th>

                <th
                  className="sticky left-[47px] z-40 bg-gray-100 border border-gray-300 border-l-0 border-r border-solid px-3 py-2 text-center whitespace-nowrap"
                  style={{
                    width: "100px",
                    minWidth: "100px",
                  }}
                >
                  MÃ CHUYẾN
                </th>

                <th className="border border-gray-300 px-3 py-2 text-center whitespace-nowrap">
                  NGƯỜI PHỤ TRÁCH
                </th>

                <th className="border border-gray-300 px-3 py-2 text-center whitespace-nowrap">
                  TRẠNG THÁI
                </th>

                <th className="border border-gray-300 px-3 py-2 text-right whitespace-nowrap">
                  SỐ TIỀN CẦN ĐIỀU CHỈNH
                </th>

                <th className="border border-gray-300 px-3 py-2 text-center whitespace-nowrap">
                  LOẠI LỖI
                </th>

                <th className="border border-gray-300 px-3 py-2 text-center whitespace-nowrap">
                  MÔ TẢ/GHI CHÚ THÊM
                </th>

                <th className="border border-gray-300 px-3 py-2 text-center whitespace-nowrap">
                  PHƯƠNG ÁN XỬ LÝ
                </th>

                <th className="border border-gray-300 px-3 py-2 text-center whitespace-nowrap">
                  NGÀY XỬ LÝ
                </th>

                <th className="border border-gray-300 px-3 py-2 text-center whitespace-nowrap">
                  MÃ KH
                </th>

                <th className="border border-gray-300 px-3 py-2 text-center whitespace-nowrap">
                  KHÁCH HÀNG
                </th>

                <th className="border border-gray-300 px-3 py-2 text-center whitespace-nowrap">
                  DIỄN GIẢI
                </th>

                <th className="border border-gray-300 px-2 py-2 text-center whitespace-nowrap">
                  NGÀY ĐÓNG HÀNG
                </th>

                <th className="border border-gray-300 px-2 py-2 text-center whitespace-nowrap">
                  NGÀY GIAO HÀNG
                </th>

                <th className="border border-gray-300 px-3 py-2 text-center whitespace-nowrap">
                  ĐIỂM ĐÓNG HÀNG
                </th>

                <th className="border border-gray-300 px-3 py-2 text-center whitespace-nowrap">
                  ĐIỂM GIAO HÀNG
                </th>

                <th className="border border-gray-300 px-3 py-2 text-center whitespace-nowrap">
                  SỐ ĐIỂM
                </th>

                <th className="border border-gray-300 px-3 py-2 text-center whitespace-nowrap">
                  TRỌNG LƯỢNG
                </th>

                <th className="border border-gray-300 px-3 py-2 text-center whitespace-nowrap">
                  BSX
                </th>

                <th className="border border-gray-300 px-3 py-2 text-center whitespace-nowrap">
                  NGÀY TẠO
                </th>

                <th className="border border-gray-300 px-3 py-2 text-center whitespace-nowrap sticky right-0 z-30 bg-gray-100">
                  THAO TÁC
                </th>
              </tr>
            </thead>

            <tbody>
              {loading ? (
                <tr>
                  <td
                    colSpan={21}
                    className="border border-gray-300 px-4 py-12 text-center text-gray-500"
                  >
                    <div className="flex items-center justify-center gap-2">
                      <FiRefreshCw className="animate-spin" />
                      Đang tải dữ liệu...
                    </div>
                  </td>
                </tr>
              ) : displayData.length === 0 ? (
                <tr>
                  <td
                    colSpan={21}
                    className="border border-gray-300 px-4 py-12 text-center text-gray-500"
                  >
                    <div className="flex flex-col items-center justify-center gap-2">
                      <span className="text-6xl mb-2">😺</span>
                      <span>~ Không có chuyến sai sót nào cả ^^ ~</span>
                    </div>
                  </td>
                </tr>
              ) : (
                displayData.map((item, index) => (
                  <tr key={item._id} className="hover:bg-blue-50">
                    {/* STT */}
                    <td
                      className="sticky left-0 z-30 bg-white group-hover:bg-blue-50 border border-gray-300 border-r border-solid px-3 py-2 text-center"
                      style={{
                        width: "40px",
                        minWidth: "40px",
                      }}
                    >
                      {index + 1}
                    </td>

                    {/* MÃ CHUYẾN */}
                    <td
                      className="sticky left-[47px] z-30 bg-white group-hover:bg-blue-50 border border-gray-300 border-l-0 border-r border-solid px-3 py-2 font-semibold whitespace-nowrap"
                      style={{
                        width: "100px",
                        minWidth: "100px",
                      }}
                    >
                      {item.maChuyen || ""}
                    </td>

                    {/* KẾ TOÁN */}
                    <td className="border border-gray-300 px-3 py-2 whitespace-nowrap">
                      {item.keToanPhuTrach || ""}
                    </td>

                    {/* TRẠNG THÁI */}
                    <td className="border border-gray-300 px-3 py-2 text-center whitespace-nowrap">
                      {item.trangThai === "daXuLy" ? (
                        <span className="inline-flex items-center px-2.5 py-1 rounded-full bg-green-100 text-green-700 text-xs font-semibold">
                          Đã xử lý
                        </span>
                      ) : (
                        <span className="inline-flex items-center px-2.5 py-1 rounded-full bg-yellow-100 text-yellow-700 text-xs font-semibold">
                          Chưa xử lý
                        </span>
                      )}
                    </td>

                    {/* TIỀN ĐIỀU CHỈNH */}
                    <td
                      className={`border border-gray-300 px-3 py-2 text-right font-semibold whitespace-nowrap ${
                        Number(item.soTienDieuChinh) < 0
                          ? "text-red-600"
                          : Number(item.soTienDieuChinh) > 0
                            ? "text-green-600"
                            : "text-gray-700"
                      }`}
                    >
                      {formatMoney(item.soTienDieuChinh)}
                    </td>

                    {/* LOẠI LỖI */}
                    <td className="border border-gray-300 px-3 py-2 whitespace-nowrap text-red-600 font-semibold">
                      {item.loaiLoi || ""}
                    </td>

                    {/* GHI CHÚ */}
                    <td className="border border-gray-300 px-3 py-2 min-w-[250px]">
                      <div className="whitespace-pre-wrap">
                        {item.ghiChu || ""}
                      </div>
                    </td>

                    {/* PHƯƠNG ÁN */}
                    <td className="border border-gray-300 px-3 py-2 min-w-[250px]">
                      <div className="whitespace-pre-wrap">
                        {item.phuongAnXuLy || ""}
                      </div>
                    </td>

                    {/* NGÀY XỬ LÝ */}
                    <td className="border border-gray-300 px-3 py-2 text-center whitespace-nowrap">
                      {item.ngayXuLy ? formatDate(item.ngayXuLy) : "-"}
                    </td>

                    {/* MÃ KH */}
                    <td className="border border-gray-300 px-3 py-2 whitespace-nowrap">
                      {item.maKH || ""}
                    </td>

                    {/* KH */}
                    <td className="border border-gray-300 px-3 py-2 whitespace-nowrap">
                      {item.khachHang || ""}
                    </td>

                    {/* DIỄN GIẢI */}
                    <td className="border border-gray-300 px-3 py-2 min-w-[220px]">
                      {item.dienGiai || ""}
                    </td>

                    {/* NGÀY BỐC */}
                    <td className="border border-gray-300 px-3 py-2 text-center whitespace-nowrap">
                      {formatDate(item.ngayBocHang)}
                    </td>

                    {/* NGÀY GIAO */}
                    <td className="border border-gray-300 px-3 py-2 text-center whitespace-nowrap">
                      {formatDate(item.ngayGiaoHang)}
                    </td>

                    {/* ĐIỂM XẾP */}
                    <td className="border border-gray-300 px-3 py-2 min-w-[180px]">
                      {item.diemXepHang || ""}
                    </td>

                    {/* ĐIỂM DỠ */}
                    <td className="border border-gray-300 px-3 py-2 min-w-[180px]">
                      {item.diemDoHang || ""}
                    </td>

                    {/* SỐ ĐIỂM */}
                    <td className="border border-gray-300 px-3 py-2 text-center whitespace-nowrap">
                      {item.soDiem || ""}
                    </td>

                    {/* TRỌNG LƯỢNG */}
                    <td className="border border-gray-300 px-3 py-2 text-center whitespace-nowrap">
                      {item.trongLuong || ""}
                    </td>

                    {/* BSX */}
                    <td className="border border-gray-300 px-3 py-2 whitespace-nowrap">
                      {item.bienSoXe || ""}
                    </td>

                    {/* NGÀY TẠO */}
                    <td className="border border-gray-300 px-3 py-2 text-center whitespace-nowrap">
                      {formatDate(item.ngayTao)}
                    </td>

                    {/* THAO TÁC */}
                    <td className="border border-gray-300 px-3 py-2 text-center sticky right-0 z-10 bg-white">
                      <div className="flex items-center justify-center gap-1">
                        <button
                          type="button"
                          title="Sửa"
                          onClick={() => handleEdit(item)}
                          disabled={
                            !canEditScheduleError || item.trangThai === "daXuLy"
                          }
                          className="p-2 rounded-lg text-blue-600 hover:bg-blue-100 disabled:opacity-40 disabled:cursor-not-allowed"
                        >
                          <FiEdit2 />
                        </button>

                        <button
                          type="button"
                          title="Xóa"
                          disabled={
                            !canEditScheduleError ||
                            item.trangThai === "daXuLy" ||
                            deletingId === item._id
                          }
                          onClick={() => handleDelete(item)}
                          className="p-2 rounded-lg text-red-600 hover:bg-red-100 disabled:opacity-50 disabled:opacity-40 disabled:cursor-not-allowed"
                        >
                          {deletingId === item._id ? (
                            <FiRefreshCw className="animate-spin" />
                          ) : (
                            <FiTrash2 />
                          )}
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* =================================================== */}
        {/* FOOTER + PHÂN TRANG */}
        {/* =================================================== */}
        <div className="border-t border-gray-200 px-4 py-2">
          {/* THÔNG TIN */}
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-3 text-sm text-gray-600">
            {/* BÊN TRÁI */}
            <span>
              Hiển thị <strong>{displayData.length}</strong> /{" "}
              <strong>{totalRecords.toLocaleString("vi-VN")}</strong> chuyến sai
              sót
            </span>

            {/* PHÂN TRANG CHÍNH GIỮA */}
            <div className="px-4 py-2 flex items-center justify-center">
              <div className="flex items-center gap-2">
                {/* TRANG TRƯỚC */}
                <button
                  type="button"
                  disabled={currentPage <= 1 || loading}
                  onClick={() => {
                    setCurrentPage((prev) => Math.max(Number(prev) - 1, 1));
                  }}
                  className="px-4 py-1.5 border border-gray-300 rounded-lg text-sm text-gray-700 hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  Trước
                </button>

                {/* A / TỔNG SỐ TRANG */}
                <div className="flex items-center gap-1 text-sm text-gray-700">
                  <input
                    type="number"
                    min={1}
                    max={totalPages}
                    value={pageInput}
                    disabled={loading}
                    onChange={(e) => {
                      setPageInput(e.target.value);
                    }}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        let page = Number(pageInput);

                        if (!page || page < 1) {
                          page = 1;
                        }

                        if (page > totalPages) {
                          page = totalPages;
                        }

                        setPageInput(String(page));
                        setCurrentPage(page);
                      }
                    }}
                    onBlur={() => {
                      let page = Number(pageInput);

                      if (!page || page < 1) {
                        page = 1;
                      }

                      if (page > totalPages) {
                        page = totalPages;
                      }

                      setPageInput(String(page));
                      setCurrentPage(page);
                    }}
                    className="w-16 h-9 px-2 text-center border border-gray-300 rounded-lg outline-none focus:ring-2 focus:ring-blue-500"
                  />

                  <span>/</span>

                  <span className="min-w-[30px] text-center font-medium">
                    {totalPages}
                  </span>
                </div>

                {/* TRANG SAU */}
                <button
                  type="button"
                  disabled={currentPage >= totalPages || loading}
                  onClick={() => {
                    setCurrentPage((prev) =>
                      Math.min(Number(prev) + 1, totalPages),
                    );
                  }}
                  className="px-4 py-1.5 border border-gray-300 rounded-lg text-sm text-gray-700 hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  Sau
                </button>
              </div>
            </div>

            {/* BÊN PHẢI */}
            <span className="text-center lg:text-right">
              Tổng tiền chưa xử lý:{" "}
              <strong
                className={
                  totalAdjustmentUnprocessed < 0
                    ? "text-red-600"
                    : totalAdjustmentUnprocessed > 0
                      ? "text-green-600"
                      : ""
                }
              >
                {formatMoney(totalAdjustmentUnprocessed)}
              </strong>
            </span>
          </div>
        </div>
      </div>

      {/* =================================================== */}
      {/* MODAL THÊM / SỬA */}
      {/* =================================================== */}
      {showModal && (
        <ScheduleErrorModal
          data={editingItem}
          onClose={handleCloseModal}
          onSaved={handleModalSaved}
        />
      )}
    </div>
  );
};

export default ScheduleErrorPage;
