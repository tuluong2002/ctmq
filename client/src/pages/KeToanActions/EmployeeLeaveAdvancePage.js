import React, { useEffect, useMemo, useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import axios from "axios";
import {
  FiPlus,
  FiEdit2,
  FiRefreshCw,
  FiSearch,
  FiX,
  FiCalendar,
  FiDollarSign,
  FiClock,
  FiUsers,
  FiFilter,
} from "react-icons/fi";

import LeaveModal from "../../components/EmployeeModal/LeaveModal.js";
import AdvanceModal from "../../components/EmployeeModal/AdvanceModal.js";

import API from "../../api";

// =====================================================
// CONSTANT
// =====================================================

const LEAVE_API = `${API}/employee-leave`;
const ADVANCE_API = `${API}/employee-advance`;
const SUMMARY_API = `${API}/employee-leave-advance/summary`;

// =====================================================
// FORMAT
// =====================================================

const formatMoney = (value) => {
  const number = Number(value || 0);

  if (!Number.isFinite(number)) {
    return "0";
  }

  return new Intl.NumberFormat("vi-VN").format(number);
};

const parseMoney = (value) => {
  if (value === null || value === undefined) {
    return 0;
  }

  return Number(String(value).replace(/[^\d]/g, "")) || 0;
};

const formatDate = (date) => {
  if (!date) return "";

  const d = new Date(date);

  if (Number.isNaN(d.getTime())) {
    return "";
  }

  return `${String(d.getDate()).padStart(2, "0")}/${String(
    d.getMonth() + 1,
  ).padStart(2, "0")}/${d.getFullYear()}`;
};

const formatDateTime = (date) => {
  if (!date) return "—";

  const d = new Date(date);

  if (Number.isNaN(d.getTime())) {
    return "—";
  }

  return `${String(d.getDate()).padStart(2, "0")}/${String(
    d.getMonth() + 1,
  ).padStart(2, "0")}/${d.getFullYear()} ${String(d.getHours()).padStart(
    2,
    "0",
  )}:${String(d.getMinutes()).padStart(2, "0")}:${String(
    d.getSeconds(),
  ).padStart(2, "0")}`;
};

const formatDateInput = (date) => {
  if (!date) return "";

  const d = new Date(date);

  if (Number.isNaN(d.getTime())) {
    return "";
  }

  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(
    2,
    "0",
  )}-${String(d.getDate()).padStart(2, "0")}`;
};

const getToday = () => {
  const d = new Date();

  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(
    2,
    "0",
  )}-${String(d.getDate()).padStart(2, "0")}`;
};

const getFirstDayOfMonth = () => {
  const d = new Date();

  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-01`;
};

const getLeaveTypeText = (type) => {
  switch (type) {
    case "ALL_DAY":
      return "Cả ngày";

    case "HALF_DAY":
      return "1/2 ngày";

    case "LATE":
      return "Đi muộn";

    case "EARLY":
      return "Về sớm";

    default:
      return type || "—";
  }
};

const getAdvanceMethodText = (type, otherText = "") => {
  switch (type) {
    case "SALARY":
      return "Trừ lương";

    case "TRIP_PAYMENT":
      return "Trừ thanh toán lịch trình";

    case "OTHER":
      return otherText ? `Khác: ${otherText}` : "Khác";

    default:
      return "—";
  }
};

// =====================================================
// COMPONENT
// =====================================================

const EmployeeLeaveAdvancePage = ({ user }) => {
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
  // ===================================================
  // TAB
  // ===================================================

  const [activeTab, setActiveTab] = useState("leave");

  // ===================================================
  // COMMON
  // ===================================================

  const [people, setPeople] = useState([]);

  const [loadingPeople, setLoadingPeople] = useState(false);

  // ===================================================
  // TAB 1 - LEAVE
  // ===================================================

  const [leaves, setLeaves] = useState([]);
  const [loadingLeaves, setLoadingLeaves] = useState(false);

  const [leaveFromDate, setLeaveFromDate] = useState(getFirstDayOfMonth());

  const [leaveToDate, setLeaveToDate] = useState(getToday());

  const [leaveSearch, setLeaveSearch] = useState("");

  const [leaveTypeFilter, setLeaveTypeFilter] = useState("");

  // ===================================================
  // TAB 2 - ADVANCE
  // ===================================================

  const [advances, setAdvances] = useState([]);
  const [loadingAdvances, setLoadingAdvances] = useState(false);

  const [advanceFromDate, setAdvanceFromDate] = useState(getFirstDayOfMonth());

  const [advanceToDate, setAdvanceToDate] = useState(getToday());

  const [advanceSearch, setAdvanceSearch] = useState("");

  const [advanceMethodFilter, setAdvanceMethodFilter] = useState("");

  // ===================================================
  // TAB 3 - SUMMARY
  // ===================================================

  const [summary, setSummary] = useState([]);
  const [loadingSummary, setLoadingSummary] = useState(false);

  const [summaryFromDate, setSummaryFromDate] = useState(getFirstDayOfMonth());

  const [summaryToDate, setSummaryToDate] = useState(getToday());

  const [summarySearch, setSummarySearch] = useState("");

  // ===================================================
  // MODAL
  // ===================================================

  const [modal, setModal] = useState(null);

  // ===================================================
  // LỊCH SỬ CHỈNH SỬA
  // ===================================================

  const [historyModal, setHistoryModal] = useState(null);
  const [loadingHistory, setLoadingHistory] = useState(false);

  // ===================================================
  // FORM NGHỈ
  // ===================================================

  const [leaveForm, setLeaveForm] = useState({
    id: null,
    ngayThang: getToday(),
    nguoiId: "",
    tenNguoi: "",
    loaiNghi: "ALL_DAY",
    soGioNghi: "",
    lyDo: "",
  });

  // ===================================================
  // FORM ỨNG
  // ===================================================

  const [advanceForm, setAdvanceForm] = useState({
    id: null,
    ngayThang: getToday(),
    nguoiId: "",
    tenNguoi: "",
    soTienUng: "",
    lyDo: "",
    phuongAnXuLy: "SALARY",
    noiDungKhac: "",
  });

  const getAuthConfig = () => {
    const token = localStorage.getItem("token");

    return {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    };
  };

  // ===================================================
  // LOAD PEOPLE
  // ===================================================

  const loadPeople = async () => {
    setLoadingPeople(true);

    try {
      const response = await axios.get(`${API}/drivers`);

      const result = response.data;

      const list = Array.isArray(result)
        ? result
        : Array.isArray(result?.data)
          ? result.data
          : Array.isArray(result?.drivers)
            ? result.drivers
            : [];

      const normalized = list
        .map((item) => ({
          id: item._id || item.id || item.driverId || "",

          name: item.name || item.tenLaiXe || item.fullname || item.hoTen || "",
        }))
        .filter((item) => item.name);

      setPeople(normalized);
    } catch (error) {
      console.error("loadPeople:", error);

      setPeople([]);
    } finally {
      setLoadingPeople(false);
    }
  };

  // ===================================================
  // LOAD LEAVES
  // ===================================================

  const loadLeaves = async () => {
    setLoadingLeaves(true);

    try {
      const params = {};

      if (leaveFromDate) {
        params.fromDate = leaveFromDate;
      }

      if (leaveToDate) {
        params.toDate = leaveToDate;
      }

      if (leaveSearch.trim()) {
        params.tenNguoi = leaveSearch.trim();
      }

      if (leaveTypeFilter) {
        params.loaiNghi = leaveTypeFilter;
      }

      const response = await axios.get(LEAVE_API, {
        params,
      });

      const result = response.data;

      setLeaves(Array.isArray(result) ? result : result?.data || []);
    } catch (error) {
      console.error("loadLeaves:", error);

      alert(error?.response?.data?.message || "Không thể tải danh sách nghỉ");
    } finally {
      setLoadingLeaves(false);
    }
  };

  // ===================================================
  // LOAD ADVANCES
  // ===================================================

  const loadAdvances = async () => {
    setLoadingAdvances(true);

    try {
      const params = {};

      if (advanceFromDate) {
        params.fromDate = advanceFromDate;
      }

      if (advanceToDate) {
        params.toDate = advanceToDate;
      }

      if (advanceSearch.trim()) {
        params.tenNguoi = advanceSearch.trim();
      }

      if (advanceMethodFilter) {
        params.phuongAnXuLy = advanceMethodFilter;
      }

      const response = await axios.get(ADVANCE_API, {
        params,
      });

      const result = response.data;

      setAdvances(Array.isArray(result) ? result : result?.data || []);
    } catch (error) {
      console.error("loadAdvances:", error);

      alert(
        error?.response?.data?.message || "Không thể tải danh sách ứng tiền",
      );
    } finally {
      setLoadingAdvances(false);
    }
  };

  // ===================================================
  // LOAD SUMMARY
  // ===================================================

  const loadSummary = async () => {
    setLoadingSummary(true);

    try {
      const params = {};

      if (summaryFromDate) {
        params.fromDate = summaryFromDate;
      }

      if (summaryToDate) {
        params.toDate = summaryToDate;
      }

      if (summarySearch.trim()) {
        params.tenNguoi = summarySearch.trim();
      }

      const response = await axios.get(SUMMARY_API, {
        params,
      });

      const result = response.data;

      setSummary(Array.isArray(result) ? result : result?.data || []);
    } catch (error) {
      console.error("loadSummary:", error);

      alert(error?.response?.data?.message || "Không thể tải dữ liệu tổng hợp");
    } finally {
      setLoadingSummary(false);
    }
  };

  // ===================================================
  // INITIAL
  // ===================================================

  useEffect(() => {
    loadPeople();
    loadLeaves();
    loadAdvances();
    loadSummary();
  }, []);

  // ===================================================
  // FILTER
  // ===================================================

  const filteredLeaves = useMemo(() => {
    const search = leaveSearch.trim().toLowerCase();

    return leaves.filter((item) => {
      const name = String(item.tenNguoi || "").toLowerCase();

      const matchSearch = !search || name.includes(search);

      const matchType = !leaveTypeFilter || item.loaiNghi === leaveTypeFilter;

      return matchSearch && matchType;
    });
  }, [leaves, leaveSearch, leaveTypeFilter]);

  const filteredAdvances = useMemo(() => {
    const search = advanceSearch.trim().toLowerCase();

    return advances.filter((item) => {
      const name = String(item.tenNguoi || "").toLowerCase();

      const matchSearch = !search || name.includes(search);

      const matchMethod =
        !advanceMethodFilter || item.phuongAnXuLy === advanceMethodFilter;

      return matchSearch && matchMethod;
    });
  }, [advances, advanceSearch, advanceMethodFilter]);

  const filteredSummary = useMemo(() => {
    const search = summarySearch.trim().toLowerCase();

    return summary.filter((item) => {
      if (!search) {
        return true;
      }

      return String(item.tenNguoi || "")
        .toLowerCase()
        .includes(search);
    });
  }, [summary, summarySearch]);

  // ===================================================
  // STATS
  // ===================================================

  const leaveStats = useMemo(() => {
    return filteredLeaves.reduce(
      (acc, item) => {
        acc.days += Number(item.soNgayNghi || 0);

        acc.hours += Number(item.soGioNghi || 0);

        return acc;
      },
      {
        days: 0,
        hours: 0,
      },
    );
  }, [filteredLeaves]);

  const advanceStats = useMemo(() => {
    return filteredAdvances.reduce(
      (acc, item) => {
        acc.money += Number(item.soTienUng || 0);

        return acc;
      },
      {
        money: 0,
      },
    );
  }, [filteredAdvances]);

  const summaryStats = useMemo(() => {
    return filteredSummary.reduce(
      (acc, item) => {
        acc.days += Number(item.soNgayNghi || 0);

        acc.hours += Number(item.soGioNghi || 0);

        acc.money += Number(item.soTienUng || 0);

        return acc;
      },
      {
        days: 0,
        hours: 0,
        money: 0,
      },
    );
  }, [filteredSummary]);

  // ===================================================
  // OPEN CREATE LEAVE
  // ===================================================

  const openCreateLeave = () => {
    setLeaveForm({
      id: null,
      ngayThang: getToday(),
      nguoiId: "",
      tenNguoi: "",
      loaiNghi: "ALL_DAY",
      soGioNghi: "",
      lyDo: "",
    });

    setModal({
      type: "leave",
      mode: "create",
    });
  };

  // ===================================================
  // OPEN EDIT LEAVE
  // ===================================================

  const openEditLeave = (item) => {
    setLeaveForm({
      id: item._id,
      ngayThang: formatDateInput(item.ngayThang),
      nguoiId: item.nguoiId || "",
      tenNguoi: item.tenNguoi || "",
      loaiNghi: item.loaiNghi || "ALL_DAY",
      soGioNghi: item.soGioNghi || "",
      lyDo: item.lyDo || "",
    });

    setModal({
      type: "leave",
      mode: "edit",
    });
  };

  // ===================================================
  // SAVE LEAVE
  // ===================================================

  const saveLeave = async () => {
    if (!leaveForm.ngayThang) {
      alert("Vui lòng chọn ngày");
      return;
    }

    if (!leaveForm.tenNguoi) {
      alert("Vui lòng chọn nhân viên/lái xe");
      return;
    }

    if (
      (leaveForm.loaiNghi === "LATE" || leaveForm.loaiNghi === "EARLY") &&
      Number(leaveForm.soGioNghi) <= 0
    ) {
      alert("Vui lòng nhập số giờ nghỉ");
      return;
    }

    try {
      const payload = {
        ngayThang: leaveForm.ngayThang,

        nguoiId: leaveForm.nguoiId || null,

        tenNguoi: leaveForm.tenNguoi,

        loaiNghi: leaveForm.loaiNghi,

        soGioNghi: leaveForm.soGioNghi || 0,

        lyDo: leaveForm.lyDo,
      };

      if (modal.mode === "create") {
        await axios.post(LEAVE_API, payload, getAuthConfig());

        alert("Thêm thông tin nghỉ thành công");
      } else {
        await axios.put(
          `${LEAVE_API}/${leaveForm.id}`,
          payload,
          getAuthConfig(),
        );

        alert("Cập nhật thông tin nghỉ thành công");
      }

      setModal(null);

      await Promise.all([loadLeaves(), loadSummary()]);
    } catch (error) {
      console.error("saveLeave:", error);

      alert(error?.response?.data?.message || "Không thể lưu thông tin nghỉ");
    }
  };

  // ===================================================
  // DELETE LEAVE
  // ===================================================

  const deleteLeave = async (item) => {
    const ok = window.confirm(
      `Bạn có chắc muốn xóa thông tin nghỉ của "${item.tenNguoi}" ngày ${formatDate(
        item.ngayThang,
      )}?`,
    );

    if (!ok) return;

    try {
      await axios.delete(`${LEAVE_API}/${item._id}`);

      await Promise.all([loadLeaves(), loadSummary()]);
    } catch (error) {
      console.error("deleteLeave:", error);

      alert(error?.response?.data?.message || "Không thể xóa");
    }
  };

  // ===================================================
  // OPEN CREATE ADVANCE
  // ===================================================

  const openCreateAdvance = () => {
    setAdvanceForm({
      id: null,
      ngayThang: getToday(),
      nguoiId: "",
      tenNguoi: "",
      soTienUng: "",
      lyDo: "",
      phuongAnXuLy: "SALARY",
      noiDungKhac: "",
    });

    setModal({
      type: "advance",
      mode: "create",
    });
  };

  // ===================================================
  // OPEN EDIT ADVANCE
  // ===================================================

  const openEditAdvance = (item) => {
    setAdvanceForm({
      id: item._id,
      ngayThang: formatDateInput(item.ngayThang),
      nguoiId: item.nguoiId || "",
      tenNguoi: item.tenNguoi || "",
      soTienUng: item.soTienUng || "",
      lyDo: item.lyDo || "",
      phuongAnXuLy: item.phuongAnXuLy || "SALARY",
      noiDungKhac: item.noiDungKhac || "",
    });

    setModal({
      type: "advance",
      mode: "edit",
    });
  };

  // ===================================================
  // SAVE ADVANCE
  // ===================================================

  const saveAdvance = async () => {
    if (!advanceForm.ngayThang) {
      alert("Vui lòng chọn ngày");
      return;
    }

    if (!advanceForm.tenNguoi) {
      alert("Vui lòng chọn nhân viên/lái xe");
      return;
    }

    const amount = parseMoney(advanceForm.soTienUng);

    if (amount <= 0) {
      alert("Vui lòng nhập số tiền ứng");
      return;
    }

    if (
      advanceForm.phuongAnXuLy === "OTHER" &&
      !advanceForm.noiDungKhac.trim()
    ) {
      alert("Vui lòng nhập nội dung khi chọn Khác");
      return;
    }

    try {
      const payload = {
        ngayThang: advanceForm.ngayThang,

        nguoiId: advanceForm.nguoiId || null,

        tenNguoi: advanceForm.tenNguoi,

        soTienUng: amount,

        lyDo: advanceForm.lyDo,

        phuongAnXuLy: advanceForm.phuongAnXuLy,

        noiDungKhac: advanceForm.noiDungKhac,
      };

      if (modal.mode === "create") {
        await axios.post(ADVANCE_API, payload, getAuthConfig());

        alert("Thêm khoản ứng thành công");
      } else {
        await axios.put(
          `${ADVANCE_API}/${advanceForm.id}`,
          payload,
          getAuthConfig(),
        );

        alert("Cập nhật khoản ứng thành công");
      }

      setModal(null);

      await Promise.all([loadAdvances(), loadSummary()]);
    } catch (error) {
      console.error("saveAdvance:", error);

      alert(error?.response?.data?.message || "Không thể lưu khoản ứng");
    }
  };

  // ===================================================
  // DELETE ADVANCE
  // ===================================================

  const deleteAdvance = async (item) => {
    const ok = window.confirm(
      `Bạn có chắc muốn xóa khoản ứng ${formatMoney(
        item.soTienUng,
      )} của "${item.tenNguoi}"?`,
    );

    if (!ok) return;

    try {
      await axios.delete(`${ADVANCE_API}/${item._id}`);

      await Promise.all([loadAdvances(), loadSummary()]);
    } catch (error) {
      console.error("deleteAdvance:", error);

      alert(error?.response?.data?.message || "Không thể xóa");
    }
  };

  // ===================================================
  // SELECT PERSON - LEAVE
  // ===================================================

  const handleLeavePerson = (id) => {
    const person = people.find((item) => String(item.id) === String(id));

    setLeaveForm((prev) => ({
      ...prev,
      nguoiId: id,
      tenNguoi: person?.name || "",
    }));
  };

  // ===================================================
  // SELECT PERSON - ADVANCE
  // ===================================================

  const handleAdvancePerson = (id) => {
    const person = people.find((item) => String(item.id) === String(id));

    setAdvanceForm((prev) => ({
      ...prev,
      nguoiId: id,
      tenNguoi: person?.name || "",
    }));
  };

  // ===================================================
  // XEM LỊCH SỬ NGHỈ
  // ===================================================

  const openLeaveHistory = async (item) => {
    if (!item?._id) return;

    setLoadingHistory(true);

    try {
      const response = await axios.get(`${LEAVE_API}/${item._id}/history`);

      const result = response.data;

      const history = Array.isArray(result)
        ? result
        : result?.data || result?.history || [];

      setHistoryModal({
        type: "leave",
        title: `Lịch sử chỉnh sửa - ${item.tenNguoi}`,
        current: item,
        data: history,
      });
    } catch (error) {
      console.error("openLeaveHistory:", error);

      alert(
        error?.response?.data?.message || "Không thể tải lịch sử chỉnh sửa",
      );
    } finally {
      setLoadingHistory(false);
    }
  };

  // ===================================================
  // XEM LỊCH SỬ ỨNG TIỀN
  // ===================================================

  const openAdvanceHistory = async (item) => {
    if (!item?._id) return;

    setLoadingHistory(true);

    try {
      const response = await axios.get(`${ADVANCE_API}/${item._id}/history`);

      const result = response.data;

      const history = Array.isArray(result)
        ? result
        : result?.data || result?.history || [];

      setHistoryModal({
        type: "advance",
        title: `Lịch sử chỉnh sửa - ${item.tenNguoi}`,
        current: item,
        data: history,
      });
    } catch (error) {
      console.error("openAdvanceHistory:", error);

      alert(
        error?.response?.data?.message || "Không thể tải lịch sử chỉnh sửa",
      );
    } finally {
      setLoadingHistory(false);
    }
  };

  // ===================================================
  // REFRESH
  // ===================================================

  const refreshCurrentTab = () => {
    if (activeTab === "leave") {
      loadLeaves();
    }

    if (activeTab === "advance") {
      loadAdvances();
    }

    if (activeTab === "summary") {
      loadSummary();
    }
  };

  // ===================================================
  // RENDER
  // ===================================================

  return (
    <div className="p-4 md:p-4 bg-gray-50 min-h-screen">
      {/* =================================================
          HEADER
      ================================================= */}
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
          className={`px-3 py-1 rounded text-white ${
            isActive("/employee-leave-advance") ? "bg-green-600" : "bg-blue-500"
          }`}
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

      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-3 mb-5">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">
            QUẢN LÝ NV/LX NGHỈ & ỨNG TIỀN
          </h1>

          <p className="text-sm text-gray-500 mt-1">
            Theo dõi ngày nghỉ, giờ nghỉ và các khoản ứng tiền của nhân viên/lái
            xe
          </p>
        </div>

        <button
          onClick={refreshCurrentTab}
          className="inline-flex items-center justify-center gap-2 px-4 py-2.5 bg-white border border-gray-300 rounded-lg hover:bg-gray-100 transition"
        >
          <FiRefreshCw
            className={
              loadingLeaves || loadingAdvances || loadingSummary
                ? "animate-spin"
                : ""
            }
          />
          Làm mới
        </button>
      </div>

      {/* =================================================
          TABS
      ================================================= */}

      <div className="bg-white border border-gray-200 rounded-xl shadow-sm mb-5">
        <div className="flex overflow-x-auto border-b">
          <button
            onClick={() => setActiveTab("leave")}
            className={`px-5 py-3 font-medium whitespace-nowrap border-b-2 transition ${
              activeTab === "leave"
                ? "border-blue-600 text-blue-600"
                : "border-transparent text-gray-600 hover:text-blue-600"
            }`}
          >
            <span className="inline-flex items-center gap-2">
              <FiCalendar />1 — NV/LX nghỉ
            </span>
          </button>

          <button
            onClick={() => setActiveTab("advance")}
            className={`px-5 py-3 font-medium whitespace-nowrap border-b-2 transition ${
              activeTab === "advance"
                ? "border-blue-600 text-blue-600"
                : "border-transparent text-gray-600 hover:text-blue-600"
            }`}
          >
            <span className="inline-flex items-center gap-2">
              <FiDollarSign />2 — Quản lý ứng tiền
            </span>
          </button>

          <button
            onClick={() => setActiveTab("summary")}
            className={`px-5 py-3 font-medium whitespace-nowrap border-b-2 transition ${
              activeTab === "summary"
                ? "border-blue-600 text-blue-600"
                : "border-transparent text-gray-600 hover:text-blue-600"
            }`}
          >
            <span className="inline-flex items-center gap-2">
              <FiUsers />3 — Tổng hợp
            </span>
          </button>
        </div>
      </div>

      {/* =================================================
          TAB 1
      ================================================= */}

      {activeTab === "leave" && (
        <div className="space-y-4">
          {/* FILTER */}

          <div className="bg-white border border-gray-200 rounded-xl p-4 shadow-sm">
            <div className="flex flex-col xl:flex-row gap-3">
              <div className="flex-1">
                <label className="block text-xs font-medium text-gray-500 mb-1">
                  Từ ngày
                </label>

                <input
                  type="date"
                  value={leaveFromDate}
                  onChange={(e) => setLeaveFromDate(e.target.value)}
                  onClick={(e) => e.target.showPicker()}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 outline-none focus:border-blue-500"
                />
              </div>

              <div className="flex-1">
                <label className="block text-xs font-medium text-gray-500 mb-1">
                  Đến ngày
                </label>

                <input
                  type="date"
                  value={leaveToDate}
                  onChange={(e) => setLeaveToDate(e.target.value)}
                  onClick={(e) => e.target.showPicker()}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 outline-none focus:border-blue-500"
                />
              </div>

              <div className="flex-[1.5]">
                <label className="block text-xs font-medium text-gray-500 mb-1">
                  Tìm nhân viên / lái xe
                </label>

                <div className="relative">
                  <FiSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />

                  <input
                    type="text"
                    value={leaveSearch}
                    onChange={(e) => setLeaveSearch(e.target.value)}
                    placeholder="Nhập tên..."
                    className="w-full border border-gray-300 rounded-lg pl-9 pr-3 py-2 outline-none focus:border-blue-500"
                  />
                </div>
              </div>

              <div className="flex-1">
                <label className="block text-xs font-medium text-gray-500 mb-1">
                  Loại nghỉ
                </label>

                <select
                  value={leaveTypeFilter}
                  onChange={(e) => setLeaveTypeFilter(e.target.value)}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 outline-none focus:border-blue-500"
                >
                  <option value="">Tất cả</option>

                  <option value="ALL_DAY">Cả ngày</option>

                  <option value="HALF_DAY">1/2 ngày</option>

                  <option value="LATE">Đi muộn</option>

                  <option value="EARLY">Về sớm</option>
                </select>
              </div>

              <div className="flex items-end">
                <button
                  onClick={loadLeaves}
                  className="w-full xl:w-auto px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 inline-flex items-center justify-center gap-2"
                >
                  <FiFilter />
                  Lọc
                </button>
              </div>
            </div>
          </div>

          {/* STAT */}

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            <StatCard
              icon={<FiUsers />}
              title="Số phiếu nghỉ"
              value={filteredLeaves.length}
            />

            <StatCard
              icon={<FiCalendar />}
              title="Tổng số ngày nghỉ"
              value={leaveStats.days}
            />

            <StatCard
              icon={<FiClock />}
              title="Tổng số giờ nghỉ"
              value={leaveStats.hours}
            />
          </div>

          {/* ADD */}

          <div className="flex justify-end">
            <button
              onClick={openCreateLeave}
              className="px-3 py-2 bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-700 inline-flex items-center gap-2 shadow-sm"
            >
              <FiPlus />
              Thêm ngày nghỉ
            </button>
          </div>

          {/* TABLE */}

          <div className="bg-white border border-gray-200 rounded-xl shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="min-w-[1050px] w-full text-sm">
                <thead className="bg-gray-100">
                  <tr>
                    <th className="border-b px-3 py-3 text-center w-14">STT</th>

                    <th className="border-b px-3 py-3 text-center">
                      Ngày tháng
                    </th>

                    <th className="border-b px-3 py-3 text-center">
                      Tên lái xe / NV
                    </th>

                    <th className="border-b px-3 py-3 text-center">
                      Loại nghỉ
                    </th>

                    <th className="border-b px-3 py-3 text-center">
                      Số ngày nghỉ
                    </th>

                    <th className="border-b px-3 py-3 text-center">
                      Số giờ nghỉ
                    </th>

                    <th className="border-b px-3 py-3 text-center">
                      Lý do / Ghi chú
                    </th>

                    <th className="border-b px-3 py-3 text-center w-28">
                      Thao tác
                    </th>
                  </tr>
                </thead>

                <tbody>
                  {loadingLeaves ? (
                    <tr>
                      <td
                        colSpan={8}
                        className="py-12 text-center text-gray-500"
                      >
                        <FiRefreshCw className="animate-spin inline mr-2" />
                        Đang tải...
                      </td>
                    </tr>
                  ) : filteredLeaves.length === 0 ? (
                    <tr>
                      <td
                        colSpan={8}
                        className="py-12 text-center text-gray-500"
                      >
                        Không có dữ liệu nghỉ
                      </td>
                    </tr>
                  ) : (
                    filteredLeaves.map((item, index) => (
                      <tr key={item._id} className="hover:bg-gray-50">
                        <td className="border-b px-3 py-3 text-center">
                          {index + 1}
                        </td>

                        <td className="border-b px-3 py-3 whitespace-nowrap text-center">
                          {formatDate(item.ngayThang)}
                        </td>

                        <td className="border-b px-3 py-3 font-medium text-center">
                          {item.tenNguoi}
                        </td>

                        <td className="border-b px-3 py-3 text-center">
                          <LeaveBadge type={item.loaiNghi} />
                        </td>

                        <td className="border-b px-3 py-3 text-center">
                          {Number(item.soNgayNghi || 0)}
                        </td>

                        <td className="border-b px-3 py-3 text-center">
                          {Number(item.soGioNghi || 0)}
                        </td>

                        <td className="border-b px-3 py-3">
                          {item.lyDo || "—"}
                        </td>

                        <td className="border-b px-3 py-3">
                          <div className="flex items-center justify-center gap-2">
                            <button
                              onClick={() => openEditLeave(item)}
                              title="Sửa"
                              className="p-2 rounded-lg bg-blue-50 text-blue-600 hover:bg-blue-100"
                            >
                              <FiEdit2 />
                            </button>

                            <button
                              onClick={() => openLeaveHistory(item)}
                              title={
                                item.soLanChinhSua > 0
                                  ? `Đã chỉnh sửa ${item.soLanChinhSua} lần`
                                  : "Chưa chỉnh sửa"
                              }
                              className="relative p-2 rounded-lg bg-purple-50 text-purple-600 hover:bg-purple-100"
                            >
                              <FiClock />

                              {Number(item.soLanChinhSua || 0) > 0 && (
                                <span className="absolute -top-2 -right-2 min-w-[18px] h-[18px] px-1 flex items-center justify-center rounded-full bg-red-500 text-white text-[10px] font-bold border-2 border-white">
                                  {item.soLanChinhSua}
                                </span>
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
          </div>
        </div>
      )}

      {/* =================================================
          TAB 2
      ================================================= */}

      {activeTab === "advance" && (
        <div className="space-y-4">
          {/* FILTER */}

          <div className="bg-white border border-gray-200 rounded-xl p-4 shadow-sm">
            <div className="flex flex-col xl:flex-row gap-3">
              <div className="flex-1">
                <label className="block text-xs font-medium text-gray-500 mb-1">
                  Từ ngày
                </label>

                <input
                  type="date"
                  value={advanceFromDate}
                  onChange={(e) => setAdvanceFromDate(e.target.value)}
                  onClick={(e) => e.target.showPicker()}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 outline-none focus:border-blue-500"
                />
              </div>

              <div className="flex-1">
                <label className="block text-xs font-medium text-gray-500 mb-1">
                  Đến ngày
                </label>

                <input
                  type="date"
                  value={advanceToDate}
                  onChange={(e) => setAdvanceToDate(e.target.value)}
                  onClick={(e) => e.target.showPicker()}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 outline-none focus:border-blue-500"
                />
              </div>

              <div className="flex-[1.5]">
                <label className="block text-xs font-medium text-gray-500 mb-1">
                  Tìm nhân viên / lái xe
                </label>

                <div className="relative">
                  <FiSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />

                  <input
                    type="text"
                    value={advanceSearch}
                    onChange={(e) => setAdvanceSearch(e.target.value)}
                    placeholder="Nhập tên..."
                    className="w-full border border-gray-300 rounded-lg pl-9 pr-3 py-2 outline-none focus:border-blue-500"
                  />
                </div>
              </div>

              <div className="flex-1">
                <label className="block text-xs font-medium text-gray-500 mb-1">
                  Phương án xử lý
                </label>

                <select
                  value={advanceMethodFilter}
                  onChange={(e) => setAdvanceMethodFilter(e.target.value)}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 outline-none focus:border-blue-500"
                >
                  <option value="">Tất cả</option>

                  <option value="SALARY">Trừ lương</option>

                  <option value="TRIP_PAYMENT">
                    Trừ thanh toán lịch trình
                  </option>

                  <option value="OTHER">Khác</option>
                </select>
              </div>

              <div className="flex items-end">
                <button
                  onClick={loadAdvances}
                  className="w-full xl:w-auto px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 inline-flex items-center justify-center gap-2"
                >
                  <FiFilter />
                  Lọc
                </button>
              </div>
            </div>
          </div>

          {/* STAT */}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <StatCard
              icon={<FiUsers />}
              title="Số phiếu ứng"
              value={filteredAdvances.length}
            />

            <StatCard
              icon={<FiDollarSign />}
              title="Tổng tiền ứng"
              value={`${formatMoney(advanceStats.money)} VNĐ`}
            />
          </div>

          {/* ADD */}

          <div className="flex justify-end">
            <button
              onClick={openCreateAdvance}
              className="px-3 py-2 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 inline-flex items-center gap-2 shadow-sm"
            >
              <FiPlus />
              Thêm khoản ứng
            </button>
          </div>

          {/* TABLE */}

          <div className="bg-white border border-gray-200 rounded-xl shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="min-w-[1100px] w-full text-sm">
                <thead className="bg-gray-100">
                  <tr>
                    <th className="border-b px-3 py-3 text-center w-14">STT</th>

                    <th className="border-b px-3 py-3 text-center">
                      Ngày tháng
                    </th>

                    <th className="border-b px-3 py-3 text-center">
                      Tên lái xe / NV
                    </th>

                    <th className="border-b px-3 py-3 text-center">
                      Số tiền ứng
                    </th>

                    <th className="border-b px-3 py-3 text-center">
                      Lý do / Ghi chú
                    </th>

                    <th className="border-b px-3 py-3 text-center">
                      Phương án xử lý
                    </th>

                    <th className="border-b px-3 py-3 text-center w-28">
                      Thao tác
                    </th>
                  </tr>
                </thead>

                <tbody>
                  {loadingAdvances ? (
                    <tr>
                      <td
                        colSpan={7}
                        className="py-12 text-center text-gray-500"
                      >
                        <FiRefreshCw className="animate-spin inline mr-2" />
                        Đang tải...
                      </td>
                    </tr>
                  ) : filteredAdvances.length === 0 ? (
                    <tr>
                      <td
                        colSpan={7}
                        className="py-12 text-center text-gray-500"
                      >
                        Không có dữ liệu ứng tiền
                      </td>
                    </tr>
                  ) : (
                    filteredAdvances.map((item, index) => (
                      <tr key={item._id} className="hover:bg-gray-50">
                        <td className="border-b px-3 py-3 text-center">
                          {index + 1}
                        </td>

                        <td className="border-b px-3 py-3 whitespace-nowrap text-center">
                          {formatDate(item.ngayThang)}
                        </td>

                        <td className="border-b px-3 py-3 font-medium text-center">
                          {item.tenNguoi}
                        </td>

                        <td className="border-b px-3 py-3 text-center font-semibold whitespace-nowrap">
                          {formatMoney(item.soTienUng)} VNĐ
                        </td>

                        <td className="border-b px-3 py-3 text-left">
                          {item.lyDo || "—"}
                        </td>

                        <td className="border-b px-3 py-3 text-center">
                          <AdvanceBadge
                            type={item.phuongAnXuLy}
                            otherText={item.noiDungKhac}
                          />
                        </td>

                        <td className="border-b px-3 py-3">
                          <div className="flex items-center justify-center gap-2">
                            <button
                              onClick={() => openEditAdvance(item)}
                              title="Sửa"
                              className="p-2 rounded-lg bg-blue-50 text-blue-600 hover:bg-blue-100"
                            >
                              <FiEdit2 />
                            </button>

                            <button
                              onClick={() => openAdvanceHistory(item)}
                              title={
                                item.soLanChinhSua > 0
                                  ? `Đã chỉnh sửa ${item.soLanChinhSua} lần`
                                  : "Chưa chỉnh sửa"
                              }
                              className="relative p-2 rounded-lg bg-purple-50 text-purple-600 hover:bg-purple-100"
                            >
                              <FiClock />

                              {Number(item.soLanChinhSua || 0) > 0 && (
                                <span className="absolute -top-2 -right-2 min-w-[18px] h-[18px] px-1 flex items-center justify-center rounded-full bg-red-500 text-white text-[10px] font-bold border-2 border-white">
                                  {item.soLanChinhSua}
                                </span>
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
          </div>
        </div>
      )}

      {/* =================================================
          TAB 3
      ================================================= */}

      {activeTab === "summary" && (
        <div className="space-y-4">
          {/* FILTER */}

          <div className="bg-white border border-gray-200 rounded-xl p-4 shadow-sm">
            <div className="flex flex-col xl:flex-row gap-3">
              <div className="flex-1">
                <label className="block text-xs font-medium text-gray-500 mb-1">
                  Từ ngày
                </label>

                <input
                  type="date"
                  value={summaryFromDate}
                  onChange={(e) => setSummaryFromDate(e.target.value)}
                  onClick={(e) => e.target.showPicker()}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 outline-none focus:border-blue-500"
                />
              </div>

              <div className="flex-1">
                <label className="block text-xs font-medium text-gray-500 mb-1">
                  Đến ngày
                </label>

                <input
                  type="date"
                  value={summaryToDate}
                  onChange={(e) => setSummaryToDate(e.target.value)}
                  onClick={(e) => e.target.showPicker()}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 outline-none focus:border-blue-500"
                />
              </div>

              <div className="flex-[2]">
                <label className="block text-xs font-medium text-gray-500 mb-1">
                  Tìm nhân viên / lái xe
                </label>

                <div className="relative">
                  <FiSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />

                  <input
                    type="text"
                    value={summarySearch}
                    onChange={(e) => setSummarySearch(e.target.value)}
                    placeholder="Nhập tên..."
                    className="w-full border border-gray-300 rounded-lg pl-9 pr-3 py-2 outline-none focus:border-blue-500"
                  />
                </div>
              </div>

              <div className="flex items-end">
                <button
                  onClick={loadSummary}
                  className="w-full xl:w-auto px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 inline-flex items-center justify-center gap-2"
                >
                  <FiFilter />
                  Lọc
                </button>
              </div>
            </div>
          </div>

          {/* STAT */}

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <StatCard
              icon={<FiCalendar />}
              title="Tổng ngày nghỉ"
              value={summaryStats.days}
            />

            <StatCard
              icon={<FiClock />}
              title="Tổng giờ nghỉ"
              value={summaryStats.hours}
            />

            <StatCard
              icon={<FiDollarSign />}
              title="Tổng tiền ứng"
              value={`${formatMoney(summaryStats.money)} VNĐ`}
            />
          </div>

          {/* TABLE */}

          <div className="bg-white border border-gray-200 rounded-xl shadow-sm overflow-hidden">
            <div className="px-4 py-3 border-b bg-gray-50">
              <div className="flex items-center gap-2 font-semibold text-gray-800">
                <FiUsers />
                TỔNG HỢP NGHỈ / ỨNG TIỀN
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="min-w-[1200px] w-full text-sm">
                <thead className="bg-gray-100">
                  <tr>
                    <th className="border-b px-3 py-3 text-center w-14">STT</th>

                    <th className="border-b px-3 py-3 text-center">
                      Ngày tháng
                    </th>

                    <th className="border-b px-3 py-3 text-center">
                      Tên lái xe
                    </th>

                    <th className="border-b px-3 py-3 text-center">
                      Số ngày nghỉ
                    </th>

                    <th className="border-b px-3 py-3 text-center">
                      Số giờ nghỉ
                    </th>

                    <th className="border-b px-3 py-3 text-center">
                      Số tiền ứng
                    </th>

                    <th className="border-b px-3 py-3 text-center">
                      Phương án xử lý
                    </th>

                    <th className="border-b px-3 py-3 text-center">Ghi chú</th>
                  </tr>
                </thead>

                <tbody>
                  {loadingSummary ? (
                    <tr>
                      <td
                        colSpan={8}
                        className="py-12 text-center text-gray-500"
                      >
                        <FiRefreshCw className="animate-spin inline mr-2" />
                        Đang tải...
                      </td>
                    </tr>
                  ) : filteredSummary.length === 0 ? (
                    <tr>
                      <td
                        colSpan={8}
                        className="py-12 text-center text-gray-500"
                      >
                        Không có dữ liệu
                      </td>
                    </tr>
                  ) : (
                    filteredSummary.map((item, index) => (
                      <tr
                        key={`${item.ngayThang}-${item.tenNguoi}-${index}`}
                        className="hover:bg-gray-50"
                      >
                        <td className="border-b px-3 py-3 text-center">
                          {index + 1}
                        </td>

                        <td className="border-b px-3 py-3 whitespace-nowrap text-center">
                          {formatDate(item.ngayThang)}
                        </td>

                        <td className="border-b px-3 py-3 font-medium text-center">
                          {item.tenNguoi}
                        </td>

                        <td className="border-b px-3 py-3 text-center">
                          {Number(item.soNgayNghi || 0)}
                        </td>

                        <td className="border-b px-3 py-3 text-center">
                          {Number(item.soGioNghi || 0)}
                        </td>

                        <td className="border-b px-3 py-3 text-center font-semibold whitespace-nowrap">
                          {formatMoney(item.soTienUng)} VNĐ
                        </td>

                        <td className="border-b px-3 py-3 text-center">
                          {item.phuongAnXuLy || "—"}
                        </td>

                        <td className="border-b px-3 py-3 text-left">
                          {item.ghiChu || "—"}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* =================================================
          MODAL NGHỈ
          ================================================= */}

      {modal?.type === "leave" && (
        <LeaveModal
          mode={modal.mode}
          form={leaveForm}
          setForm={setLeaveForm}
          people={people}
          loadingPeople={loadingPeople}
          onClose={() => setModal(null)}
          onSave={saveLeave}
        />
      )}

      {/* =================================================
          MODAL ỨNG TIỀN
          ================================================= */}

      {modal?.type === "advance" && (
        <AdvanceModal
          mode={modal.mode}
          form={advanceForm}
          setForm={setAdvanceForm}
          people={people}
          loadingPeople={loadingPeople}
          onClose={() => setModal(null)}
          onSave={saveAdvance}
        />
      )}

      {/* =================================================
          MODAL LỊCH SỬ CHỈNH SỬA
          ================================================= */}

      {historyModal && (
        <HistoryModal
          type={historyModal.type}
          title={historyModal.title}
          data={historyModal.data}
          loading={loadingHistory}
          onClose={() => setHistoryModal(null)}
        />
      )}
    </div>
  );
};

// =====================================================
// STAT CARD
// =====================================================

const StatCard = ({ icon, title, value }) => {
  return (
    <div className="bg-white border border-gray-200 rounded-xl p-4 shadow-sm">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center">
          {icon}
        </div>

        <div className="min-w-0">
          <div className="text-xs text-gray-500">{title}</div>

          <div className="text-xl font-bold text-gray-800 mt-1">{value}</div>
        </div>
      </div>
    </div>
  );
};

// =====================================================
// FORM FIELD
// =====================================================

const FormField = ({ label, children }) => {
  return (
    <div>
      <label className="block text-sm font-medium text-gray-700 mb-1.5">
        {label}
      </label>

      {children}
    </div>
  );
};

// =====================================================
// HISTORY MODAL
// =====================================================

const HistoryModal = ({ type, title, data = [], loading, onClose }) => {
  return (
    <div className="fixed inset-0 z-[200] bg-black/40 flex items-center justify-center p-4">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-6xl max-h-[90vh] flex flex-col">
        {/* HEADER */}
        <div className="flex items-center justify-between px-5 py-4 border-b">
          <div>
            <h2 className="text-lg font-bold text-gray-800">{title}</h2>

            <p className="text-xs text-gray-500 mt-1">
              Theo dõi các lần thay đổi dữ liệu
            </p>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-2 rounded-lg hover:bg-gray-100 transition"
          >
            <FiX size={20} />
          </button>
        </div>

        {/* BODY */}
        <div className="p-5 overflow-auto">
          {loading ? (
            <div className="py-12 text-center text-gray-500">
              <FiRefreshCw className="animate-spin inline mr-2" />
              Đang tải lịch sử...
            </div>
          ) : data.length === 0 ? (
            <div className="py-12 text-center text-gray-500">
              Chưa có lịch sử chỉnh sửa
            </div>
          ) : type === "leave" ? (
            <LeaveHistoryTable data={data} />
          ) : (
            <AdvanceHistoryTable data={data} />
          )}
        </div>

        {/* FOOTER */}
        <div className="flex justify-end px-5 py-4 border-t bg-gray-50">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-lg border border-gray-300 bg-white hover:bg-gray-100 transition"
          >
            Đóng
          </button>
        </div>
      </div>
    </div>
  );
};

// =====================================================
// LEAVE HISTORY TABLE
// =====================================================

const LeaveHistoryTable = ({ data }) => {
  return (
    <div className="overflow-x-auto">
      <table className="min-w-[1000px] w-full text-sm">
        <thead className="bg-gray-100">
          <tr>
            <th className="border px-3 py-3 text-center">STT</th>

            <th className="border px-3 py-3 text-center">Thời gian sửa</th>

            <th className="border px-3 py-3 text-center">Người sửa</th>

            <th className="border px-3 py-3 text-center">Ngày nghỉ</th>

            <th className="border px-3 py-3 text-center">Nhân viên / LX</th>

            <th className="border px-3 py-3 text-center">Loại nghỉ</th>

            <th className="border px-3 py-3 text-center">Số ngày</th>

            <th className="border px-3 py-3 text-center">Số giờ</th>

            <th className="border px-3 py-3 text-center">Lý do</th>
          </tr>
        </thead>

        <tbody>
          {data.map((item, index) => (
            <tr key={item._id || index} className="hover:bg-gray-50">
              <td className="border px-3 py-3 text-center">{index + 1}</td>

              <td className="border px-3 py-3 text-center whitespace-nowrap">
                {formatDateTime(
                  item.createdAt || item.updatedAt || item.thoiGianSua,
                )}
              </td>

              <td className="border px-3 py-3 text-center">
                {item.updatedBy || item.createdBy || item.nguoiSua || "—"}
              </td>

              <td className="border px-3 py-3 text-center">
                {formatDate(item.ngayThang)}
              </td>

              <td className="border px-3 py-3 text-center font-medium">
                {item.tenNguoi || "—"}
              </td>

              <td className="border px-3 py-3 text-center">
                <LeaveBadge type={item.loaiNghi} />
              </td>

              <td className="border px-3 py-3 text-center">
                {Number(item.soNgayNghi || 0)}
              </td>

              <td className="border px-3 py-3 text-center">
                {Number(item.soGioNghi || 0)}
              </td>

              <td className="border px-3 py-3">{item.lyDo || "—"}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

// =====================================================
// ADVANCE HISTORY TABLE
// =====================================================

const AdvanceHistoryTable = ({ data }) => {
  return (
    <div className="overflow-x-auto">
      <table className="min-w-[1100px] w-full text-sm">
        <thead className="bg-gray-100">
          <tr>
            <th className="border px-3 py-3 text-center">STT</th>

            <th className="border px-3 py-3 text-center">Thời gian sửa</th>

            <th className="border px-3 py-3 text-center">Người sửa</th>

            <th className="border px-3 py-3 text-center">Ngày ứng</th>

            <th className="border px-3 py-3 text-center">Nhân viên / LX</th>

            <th className="border px-3 py-3 text-center">Số tiền</th>

            <th className="border px-3 py-3 text-center">Phương án</th>

            <th className="border px-3 py-3 text-center">Lý do</th>
          </tr>
        </thead>

        <tbody>
          {data.map((item, index) => (
            <tr key={item._id || index} className="hover:bg-gray-50">
              <td className="border px-3 py-3 text-center">{index + 1}</td>

              <td className="border px-3 py-3 text-center whitespace-nowrap">
                {formatDateTime(
                  item.createdAt || item.updatedAt || item.thoiGianSua,
                )}
              </td>

              <td className="border px-3 py-3 text-center">
                {item.updatedBy || item.createdBy || item.nguoiSua || "—"}
              </td>

              <td className="border px-3 py-3 text-center">
                {formatDate(item.ngayThang)}
              </td>

              <td className="border px-3 py-3 text-center font-medium">
                {item.tenNguoi || "—"}
              </td>

              <td className="border px-3 py-3 text-center font-semibold whitespace-nowrap">
                {formatMoney(item.soTienUng)} VNĐ
              </td>

              <td className="border px-3 py-3 text-center">
                <AdvanceBadge
                  type={item.phuongAnXuLy}
                  otherText={item.noiDungKhac}
                />
              </td>

              <td className="border px-3 py-3">{item.lyDo || "—"}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

// =====================================================
// LEAVE BADGE
// =====================================================

const LeaveBadge = ({ type }) => {
  const config = {
    ALL_DAY: {
      text: "Cả ngày",
      className: "bg-red-50 text-red-700",
    },

    HALF_DAY: {
      text: "1/2 ngày",
      className: "bg-orange-50 text-orange-700",
    },

    LATE: {
      text: "Đi muộn",
      className: "bg-yellow-50 text-yellow-700",
    },

    EARLY: {
      text: "Về sớm",
      className: "bg-blue-50 text-blue-700",
    },
  };

  const item = config[type] || {
    text: getLeaveTypeText(type),
    className: "bg-gray-100 text-gray-700",
  };

  return (
    <span
      className={`inline-flex px-2.5 py-1 rounded-full text-xs font-medium ${item.className}`}
    >
      {item.text}
    </span>
  );
};

// =====================================================
// ADVANCE BADGE
// =====================================================

const AdvanceBadge = ({ type, otherText }) => {
  const config = {
    SALARY: {
      text: "Trừ lương",
      className: "bg-blue-50 text-blue-700",
    },

    TRIP_PAYMENT: {
      text: "Trừ thanh toán lịch trình",
      className: "bg-purple-50 text-purple-700",
    },

    OTHER: {
      text: otherText ? `Khác: ${otherText}` : "Khác",
      className: "bg-gray-100 text-gray-700",
    },
  };

  const item = config[type] || {
    text: getAdvanceMethodText(type, otherText),
    className: "bg-gray-100 text-gray-700",
  };

  return (
    <span
      className={`inline-flex px-2.5 py-1 rounded-full text-xs font-medium ${item.className}`}
    >
      {item.text}
    </span>
  );
};

export default EmployeeLeaveAdvancePage;
