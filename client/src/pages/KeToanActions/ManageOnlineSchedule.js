import React, { useState, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import axios from "axios";
import API from "../../api";
import AddUserScheduleModal from "../../components/ScheduleModal/AddUserScheduleModal";

const normalizeText = (str = "") =>
  str
    .toString()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/đ/g, "d")
    .replace(/Đ/g, "D")
    .toLowerCase()
    .trim();

const AutoCompleteInline = ({
  value,
  onChange,
  options = [],
  placeholder = "",
}) => {
  const [show, setShow] = useState(false);

  const keyword = normalizeText(value);

  const filtered = options
    .filter((item) => {
      if (!keyword) return true;

      return normalizeText(item).includes(keyword);
    })
    .slice(0, 8);

  return (
    <div className="relative w-full">
      <input
        type="text"
        value={value || ""}
        placeholder={placeholder}
        onFocus={() => setShow(true)}
        onChange={(e) => {
          onChange(e.target.value);
          setShow(true);
        }}
        onBlur={() => setTimeout(() => setShow(false), 150)}
        className="border border-gray-300 rounded px-1 py-1 w-full bg-white outline-none focus:border-blue-500"
      />

      {show && filtered.length > 0 && (
        <div className="absolute left-0 top-full z-[9999] bg-white border border-gray-300 rounded shadow-lg w-full max-h-48 overflow-y-auto">
          {filtered.map((item, index) => (
            <div
              key={`${item}-${index}`}
              onMouseDown={() => {
                onChange(item);
                setShow(false);
              }}
              className="px-2 py-1 hover:bg-blue-100 cursor-pointer whitespace-nowrap"
            >
              {item}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

const ManageOnlineSchedule = () => {
  const [filterType, setFilterType] = useState("");
  const [selectedDate, setSelectedDate] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [filteredData, setFilteredData] = useState([]);
  const [activeRows, setActiveRows] = useState([]);
  const [searchDriver, setSearchDriver] = useState("");
  const [dateMode, setDateMode] = useState("ngayDi");
  const [user, setUser] = useState(null);
  const currentUser = JSON.parse(localStorage.getItem("user") || "{}");

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

  const [showAddSchedule, setShowAddSchedule] = useState(false);

  // =====================================================
  // NHẬP LỊCH TRÌNH TRỰC TIẾP TRÊN BẢNG
  // =====================================================

  const [inlineDriver, setInlineDriver] = useState("");
  const [inlineNgayDi, setInlineNgayDi] = useState("");
  const [inlineNgayVe, setInlineNgayVe] = useState("");
  const [inlineTongTien, setInlineTongTien] = useState("");

  const [inlineRows, setInlineRows] = useState([
    {
      id: Date.now(),
      values: Array(14).fill(""),
      laiXeThuKhach: "",
      phuongAn: "",
    },
  ]);

  const [inlineDrivers, setInlineDrivers] = useState([]);
  const [inlineCustomers, setInlineCustomers] = useState([]);
  const [inlineVehicles, setInlineVehicles] = useState([]);
  const [inlineAddresses, setInlineAddresses] = useState([]);
  const [inlineSaving, setInlineSaving] = useState(false);

  useEffect(() => {
    const loadInlineData = async () => {
      try {
        const [driverRes, customerRes, vehicleRes, addressRes] =
          await Promise.all([
            axios.get(`${API}/drivers/names/list`),
            axios.get(`${API}/customers`),
            axios.get(`${API}/vehicles/names/list`),
            axios.get(`${API}/address/all`),
          ]);

        setInlineDrivers(driverRes.data || []);
        setInlineCustomers(customerRes.data || []);
        setInlineVehicles(vehicleRes.data || []);
        setInlineAddresses(addressRes.data?.data || []);
      } catch (error) {
        console.error("Lỗi lấy dữ liệu gợi ý:", error);
      }
    };

    loadInlineData();
  }, []);

  const inlineDriverNames = inlineDrivers.map((item) => item.name);
  const inlineCustomerNames = inlineCustomers.map((item) => item.name);
  const inlineVehiclePlates = inlineVehicles.map((item) => item.plateNumber);
  const inlineAddressList = inlineAddresses.map((item) => item.diaChi);

  const updateInlineRowValue = (rowId, index, value) => {
    setInlineRows((prev) =>
      prev.map((row) =>
        row.id === rowId
          ? {
              ...row,
              values: row.values.map((item, i) => (i === index ? value : item)),
            }
          : row,
      ),
    );
  };

  const updateInlineRowField = (rowId, field, value) => {
    setInlineRows((prev) =>
      prev.map((row) =>
        row.id === rowId
          ? {
              ...row,
              [field]: value,
            }
          : row,
      ),
    );
  };

  const addInlineRow = () => {
    setInlineRows((prev) => [
      ...prev,
      {
        id: Date.now() + Math.random(),
        values: Array(14).fill(""),
        laiXeThuKhach: "",
        phuongAn: "",
      },
    ]);
  };

  const deleteInlineLastRow = () => {
    setInlineRows((prev) => {
      if (prev.length <= 1) return prev;
      return prev.slice(0, -1);
    });
  };

  const resetInlineSchedule = () => {
    setInlineDriver("");
    setInlineNgayDi("");
    setInlineNgayVe("");
    setInlineTongTien("");

    setInlineRows([
      {
        id: Date.now(),
        values: Array(14).fill(""),
        laiXeThuKhach: "",
        phuongAn: "",
      },
    ]);
  };

  const saveInlineSchedule = async () => {
    if (!inlineDriver.trim()) {
      alert("Vui lòng nhập tên lái xe.");
      return;
    }

    if (!inlineNgayDi) {
      alert("Vui lòng nhập ngày đi.");
      return;
    }

    if (!inlineNgayVe) {
      alert("Vui lòng nhập ngày về.");
      return;
    }

    if (!inlineTongTien) {
      alert("Vui lòng nhập tổng tiền lịch trình.");
      return;
    }

    const requiredIndexes = [0, 1, 2, 3, 4, 5, 6, 7];

    const hasEmptyRequired = inlineRows.some((row) =>
      requiredIndexes.some((index) => !String(row.values[index] || "").trim()),
    );

    if (hasEmptyRequired) {
      alert("Vui lòng nhập đầy đủ các trường bắt buộc của chuyến.");
      return;
    }

    try {
      setInlineSaving(true);

      const payload = {
        userId: user?._id || currentUser?._id,

        tenLaiXe: String(inlineDriver || ""),

        ngayDi: inlineNgayDi,

        ngayVe: inlineNgayVe,

        tongTienLichTrinh: String(inlineTongTien || ""),

        rows: inlineRows.map((row) => ({
          values: row.values.map((value) => String(value || "")),

          laiXeThuKhach: String(row.laiXeThuKhach || ""),

          phuongAn: String(row.phuongAn || ""),
        })),
      };

      console.log("Dữ liệu lịch trình nhập trực tiếp:", payload);

      await axios.post(`${API}/user-schedules`, payload);

      alert("Thêm lịch trình thành công!");

      resetInlineSchedule();

      // Nếu đang lọc theo ngày thì tải lại đúng bộ lọc hiện tại
      if (filterType === "single" && selectedDate) {
        await handleFilterByDate();
      }

      // Nếu đang lọc theo khoảng thì tải lại đúng bộ lọc hiện tại
      else if (filterType === "range" && startDate && endDate) {
        await handleFilterByRange();
      }

      // Nếu chưa lọc thì không đụng vào dữ liệu cũ
    } catch (error) {
      console.error("Lỗi thêm lịch trình trực tiếp:", error);

      alert(
        error?.response?.data?.message || "Có lỗi xảy ra khi thêm lịch trình.",
      );
    } finally {
      setInlineSaving(false);
    }
  };

  useEffect(() => {
    const storedUser = localStorage.getItem("user");
    if (storedUser) {
      setUser(JSON.parse(storedUser));
    }
  }, []);

  const handleExport = async () => {
    if (!selectedDate) return alert("Vui lòng chọn ngày.");

    try {
      const formattedDate = new Date(selectedDate).toISOString().split("T")[0];

      const url =
        dateMode === "createdAt"
          ? `${API}/user-schedules/export-by-created-date`
          : `${API}/user-schedules/export`;

      const response = await axios.get(url, {
        params: { ngay: formattedDate },
        responseType: "blob",
      });

      const urlBlob = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement("a");
      link.href = urlBlob;

      const [year, month, day] = formattedDate.split("-");
      const fileName =
        dateMode === "createdAt"
          ? `lichtrinh_ngaytao_${day}_${month}_${year}_KT.xlsx`
          : `lichtrinh_${day}_${month}_${year}_KT.xlsx`;

      link.setAttribute("download", fileName);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch (error) {
      console.error("Lỗi khi tải Excel:", error);
      alert("Không thể tải file Excel.");
    }
  };

  const handleFilterByDate = async () => {
    if (!selectedDate) return alert("Vui lòng chọn ngày.");

    try {
      const formattedDate = new Date(selectedDate).toISOString().split("T")[0];

      const url =
        dateMode === "createdAt"
          ? `${API}/user-schedules/by-created-date`
          : `${API}/user-schedules`;

      const response = await axios.get(url, {
        params: { ngay: formattedDate },
      });

      setFilteredData(response.data);
    } catch (err) {
      console.error("Lỗi khi lọc dữ liệu:", err);
      alert("Không thể lấy dữ liệu.");
    }
  };

  const handleDeleteByDate = async () => {
    if (dateMode === "createdAt") {
      alert("Chỉ xoá được khi lọc theo Ngày đi.");
      return;
    }
    if (!selectedDate) return alert("Vui lòng chọn ngày.");
    if (
      !window.confirm("Bạn có chắc chắn muốn xóa toàn bộ lịch trình ngày này?")
    )
      return;

    try {
      const formattedDate = new Date(selectedDate).toISOString().split("T")[0];
      await axios.delete(`${API}/user-schedules?ngay=${formattedDate}`);
      alert("Đã xóa thành công!");
      setFilteredData([]);
    } catch (err) {
      console.error("Lỗi khi xóa dữ liệu:", err);
      alert("Không thể xóa dữ liệu theo ngày.");
    }
  };

  const handleFilterByRange = async () => {
    if (!startDate || !endDate) return alert("Vui lòng chọn đủ ngày.");

    try {
      let from, to;

      if (dateMode === "createdAt") {
        from = startDate; // có cả giờ
        to = endDate;
      } else {
        from = new Date(startDate).toISOString().split("T")[0];
        to = new Date(endDate).toISOString().split("T")[0];
      }

      const url =
        dateMode === "createdAt"
          ? `${API}/user-schedules/by-created-range`
          : `${API}/user-schedules/range`;

      const response = await axios.get(url, {
        params: { from, to },
      });

      setFilteredData(response.data);
    } catch (err) {
      console.error("Lỗi khi lọc theo khoảng ngày:", err);
      alert("Không thể lấy dữ liệu.");
    }
  };

  const handleDeleteByRange = async () => {
    if (dateMode === "createdAt") {
      alert("Chỉ xoá được khi lọc theo Ngày đi.");
      return;
    }
    if (!startDate || !endDate) return alert("Vui lòng chọn đủ ngày.");
    if (
      !window.confirm(
        "Bạn có chắc chắn muốn xóa toàn bộ lịch trình trong khoảng ngày này?",
      )
    )
      return;

    try {
      const from = new Date(startDate).toISOString().split("T")[0];
      const to = new Date(endDate).toISOString().split("T")[0];
      await axios.delete(`${API}/user-schedules/range?from=${from}&to=${to}`);
      alert("Đã xóa thành công!");
      setFilteredData([]);
    } catch (err) {
      console.error("Lỗi khi xóa dữ liệu theo khoảng ngày:", err);
      alert("Không thể xóa dữ liệu.");
    }
  };

  const handleExportByRange = async () => {
    if (!startDate || !endDate) return alert("Vui lòng chọn đủ ngày.");

    try {
      let from, to;

      if (dateMode === "createdAt") {
        from = startDate; // có cả giờ
        to = endDate;
      } else {
        from = new Date(startDate).toISOString().split("T")[0];
        to = new Date(endDate).toISOString().split("T")[0];
      }

      const url =
        dateMode === "createdAt"
          ? `${API}/user-schedules/export-by-created-range`
          : `${API}/user-schedules/export-range`;

      const response = await axios.get(url, {
        params: { from, to },
        responseType: "blob",
      });

      const urlBlob = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement("a");
      link.href = urlBlob;

      const fileName =
        dateMode === "createdAt"
          ? `lichtrinh_ngaytao_tu_${from}_den_${to}_KT.xlsx`
          : `lichtrinh_tu_${from}_den_${to}_KT.xlsx`;

      link.setAttribute("download", fileName);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch (error) {
      console.error("Lỗi khi tải Excel theo khoảng ngày:", error);
      alert("Không thể tải file Excel.");
    }
  };

  const isActiveRow = (scheduleId, rowIndex) =>
    activeRows.some(
      (r) => r.scheduleId === scheduleId && r.rowIndex === rowIndex,
    );

  const isActiveSchedule = (scheduleId) =>
    activeRows.some((r) => r.scheduleId === scheduleId);

  const keyword = normalizeText(searchDriver);

  const displayedData = filteredData.filter((schedule) => {
    if (!keyword) return true;

    // 1️⃣ tên lái xe
    const matchDriver = normalizeText(schedule.tenLaiXe).includes(keyword);

    // 2️⃣ mã lịch trình
    const matchMaLT = schedule.rows?.some((row) =>
      normalizeText(row.maLichTrinh).includes(keyword),
    );

    // 3️⃣ biển số xe
    const matchBSX = schedule.rows?.some((row) =>
      normalizeText(row.bienSoXe).includes(keyword),
    );

    return matchDriver || matchMaLT || matchBSX;
  });

  return (
    <div className="p-4 text-xs">
      <div className="flex gap-2 items-center mb-4">
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
            if (!currentUser?.permissions?.includes("edit_trip")) {
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
      <div className="flex justify-between items-center mb-4">
        <h1 className="text-xl font-bold">LỊCH TRÌNH LX KẾ TOÁN NHẬP</h1>
      </div>

      {/* Bộ lọc ngày */}
      <div className="flex flex-wrap items-center gap-6 mb-4 mt-2">
        {/* Chọn kiểu lọc ngày */}
        <div className="flex items-center gap-2">
          <span className="font-semibold">Lọc theo:</span>
          <select
            value={dateMode}
            onChange={(e) => setDateMode(e.target.value)}
            className="border border-gray-300 rounded px-2 py-1"
          >
            <option value="ngayDi">Ngày đi</option>
            <option value="createdAt">Ngày tạo</option>
          </select>
        </div>

        {/* Kiểu lọc */}
        <div className="flex items-center gap-4">
          <span className="font-semibold">Kiểu:</span>

          <label className="flex items-center gap-1">
            <input
              type="radio"
              name="filter"
              value="single"
              checked={filterType === "single"}
              onChange={() => setFilterType("single")}
            />
            Theo ngày
          </label>

          <label className="flex items-center gap-1">
            <input
              type="radio"
              name="filter"
              value="range"
              checked={filterType === "range"}
              onChange={() => setFilterType("range")}
            />
            Theo khoảng
          </label>

          <button
            onClick={() => setShowAddSchedule(true)}
            className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded shadow"
          >
            + Thêm lịch trình
          </button>
        </div>
      </div>

      {/* Hiển thị form lọc */}
      {filterType === "single" && (
        <div className="flex items-center gap-4 mb-4 flex-wrap">
          <input
            type="date"
            className="border px-2 py-1 rounded"
            value={selectedDate}
            onChange={(e) => setSelectedDate(e.target.value)}
            onClick={(e) => e.target.showPicker()}
          />
          <button
            onClick={handleFilterByDate}
            className="bg-blue-600 text-white px-4 py-2 rounded"
          >
            Lọc theo ngày
          </button>
          <button
            onClick={handleDeleteByDate}
            className="bg-red-600 text-white px-4 py-2 rounded"
          >
            Xóa theo ngày
          </button>
          <button
            onClick={handleExport}
            className="bg-green-600 text-white px-4 py-2 rounded"
          >
            Tải Excel
          </button>
        </div>
      )}

      {filterType === "range" && (
        <div className="flex items-center gap-4 mb-4 flex-wrap">
          <div>
            <label className="mr-2">Từ:</label>
            <input
              type={dateMode === "createdAt" ? "datetime-local" : "date"}
              className="border px-2 py-1 rounded"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              onClick={(e) => e.target.showPicker()}
            />
          </div>
          <div>
            <label className="mr-2">Đến:</label>
            <input
              type={dateMode === "createdAt" ? "datetime-local" : "date"}
              className="border px-2 py-1 rounded"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              onClick={(e) => e.target.showPicker()}
            />
          </div>
          <button
            onClick={handleFilterByRange}
            className="bg-blue-600 text-white px-4 py-2 rounded"
          >
            Lọc khoảng ngày
          </button>
          <button
            onClick={handleDeleteByRange}
            className="bg-red-600 text-white px-4 py-2 rounded"
          >
            Xóa khoảng ngày
          </button>
          <button
            onClick={handleExportByRange}
            className="bg-green-600 text-white px-4 py-2 rounded"
          >
            Tải Excel khoảng ngày
          </button>
        </div>
      )}

      <div className="mb-3 flex items-center gap-2">
        <span className="font-semibold">Lọc:</span>
        <input
          type="text"
          value={searchDriver}
          onChange={(e) => setSearchDriver(e.target.value)}
          placeholder="Nhập tên lái xe, biển số hoặc mã lịch trình..."
          className="border px-2 py-1 rounded w-64"
        />
      </div>

      {/* ===================================================== */}
      {/* BẢNG - LUÔN HIỂN THỊ, KỂ CẢ KHI CHƯA CÓ DATA */}
      {/* ===================================================== */}

      <div className="max-h-[700px] min-h-[500px] overflow-auto border">
        <table className="w-full border-collapse text-xs">
          <thead className="bg-gray-200">
            <tr>
              <th className="border p-1 sticky top-0 bg-gray-200 z-20">STT</th>
              <th className="border p-1 sticky top-0 bg-gray-200 z-20">
                Tên lái xe
              </th>
              <th className="border p-1 sticky top-0 bg-gray-200 z-20">
                Ngày đi
              </th>
              <th className="border p-1 sticky top-0 bg-gray-200 z-20">
                Ngày về
              </th>
              <th className="border p-1 sticky top-0 bg-gray-200 z-20">
                Biển số
              </th>
              <th className="border p-1 sticky top-0 bg-gray-200 z-20">
                Khách hàng
              </th>
              <th className="border p-1 sticky top-0 bg-gray-200 z-20">
                Giấy tờ
              </th>
              <th className="border p-1 sticky top-0 bg-gray-200 z-20">
                Nơi đi
              </th>
              <th className="border p-1 sticky top-0 bg-gray-200 z-20">
                Nơi đến
              </th>
              <th className="border p-1 sticky top-0 bg-gray-200 z-20">
                Trọng lượng
              </th>
              <th className="border p-1 sticky top-0 bg-gray-200 z-20">
                Số điểm
              </th>
              <th className="border p-1 sticky top-0 bg-gray-200 z-20">
                2 chiều + lưu ca
              </th>
              <th className="border p-1 sticky top-0 bg-gray-200 z-20">Ăn</th>
              <th className="border p-1 sticky top-0 bg-gray-200 z-20">
                Tăng ca
              </th>
              <th className="border p-1 sticky top-0 bg-gray-200 z-20">
                Bốc xếp
              </th>
              <th className="border p-1 sticky top-0 bg-gray-200 z-20">Vé</th>
              <th className="border p-1 sticky top-0 bg-gray-200 z-20">
                Tiền chuyến
              </th>
              <th className="border p-1 sticky top-0 bg-gray-200 z-20">
                Chi phí khác
              </th>
              <th className="border p-1 sticky top-0 bg-gray-200 z-20">
                LX thu KH
              </th>
              <th className="border p-1 sticky top-0 bg-gray-200 z-20">
                Phương án
              </th>
              <th className="border p-1 sticky top-0 bg-gray-200 z-20">
                Tổng tiền LT
              </th>
              <th className="border p-1 sticky top-0 bg-gray-200 z-20">
                Mã LT
              </th>
            </tr>
          </thead>

          <tbody>
            {/* ================================================= */}
            {/* DÒNG NHẬP TRỰC TIẾP - LUÔN CÓ */}
            {/* ================================================= */}

            {inlineRows.map((row, rowIndex) => (
              <tr key={`inline-${row.id}`} className="bg-blue-50">
                {rowIndex === 0 && (
                  <>
                    <td
                      rowSpan={inlineRows.length}
                      className="border p-1 text-center font-bold text-blue-600"
                    >
                      +
                    </td>

                    <td
                      rowSpan={inlineRows.length}
                      className="border p-1 min-w-[160px]"
                    >
                      <AutoCompleteInline
                        value={inlineDriver}
                        onChange={setInlineDriver}
                        options={inlineDriverNames}
                        placeholder="Tên lái xe"
                      />
                    </td>

                    <td
                      rowSpan={inlineRows.length}
                      className="border p-1 min-w-[155px]"
                    >
                      <input
                        type="datetime-local"
                        value={inlineNgayDi}
                        onChange={(e) => setInlineNgayDi(e.target.value)}
                        onClick={(e) => e.target.showPicker()}
                        className="border border-gray-300 rounded px-1 py-1 w-full bg-white"
                      />
                    </td>

                    <td
                      rowSpan={inlineRows.length}
                      className="border p-1 min-w-[155px]"
                    >
                      <input
                        type="datetime-local"
                        value={inlineNgayVe}
                        onChange={(e) => setInlineNgayVe(e.target.value)}
                        onClick={(e) => e.target.showPicker()}
                        className="border border-gray-300 rounded px-1 py-1 w-full bg-white"
                      />
                    </td>
                  </>
                )}

                <td className="border p-1 min-w-[110px]">
                  <AutoCompleteInline
                    value={row.values[0]}
                    onChange={(value) => updateInlineRowValue(row.id, 0, value)}
                    options={inlineVehiclePlates}
                    placeholder="Biển số"
                  />
                </td>

                <td className="border p-1 min-w-[130px]">
                  <AutoCompleteInline
                    value={row.values[1]}
                    onChange={(value) => updateInlineRowValue(row.id, 1, value)}
                    options={inlineCustomerNames}
                    placeholder="Khách hàng"
                  />
                </td>

                <td className="border p-1">
                  <input
                    type="text"
                    value={row.values[2]}
                    onChange={(e) =>
                      updateInlineRowValue(row.id, 2, e.target.value)
                    }
                    className="border border-gray-300 rounded px-1 py-1 w-[80px] bg-white"
                  />
                </td>

                <td className="border p-1 min-w-[130px]">
                  <AutoCompleteInline
                    value={row.values[3]}
                    onChange={(value) => updateInlineRowValue(row.id, 3, value)}
                    options={inlineAddressList}
                    placeholder="Nơi đi"
                  />
                </td>

                <td className="border p-1 min-w-[130px]">
                  <AutoCompleteInline
                    value={row.values[4]}
                    onChange={(value) => updateInlineRowValue(row.id, 4, value)}
                    options={inlineAddressList}
                    placeholder="Nơi đến"
                  />
                </td>

                <td className="border p-1">
                  <input
                    type="text"
                    value={row.values[5]}
                    onChange={(e) =>
                      updateInlineRowValue(row.id, 5, e.target.value)
                    }
                    className="border border-gray-300 rounded px-1 py-1 w-[70px] bg-white"
                  />
                </td>

                <td className="border p-1">
                  <input
                    type="text"
                    value={row.values[6]}
                    onChange={(e) =>
                      updateInlineRowValue(row.id, 6, e.target.value)
                    }
                    className="border border-gray-300 rounded px-1 py-1 w-[60px] bg-white"
                  />
                </td>

                <td className="border p-1">
                  <input
                    type="text"
                    value={row.values[7]}
                    onChange={(e) =>
                      updateInlineRowValue(row.id, 7, e.target.value)
                    }
                    className="border border-gray-300 rounded px-1 py-1 w-[120px] bg-white"
                  />
                </td>

                <td className="border p-1">
                  <input
                    type="text"
                    value={row.values[8]}
                    onChange={(e) =>
                      updateInlineRowValue(row.id, 8, e.target.value)
                    }
                    className="border border-gray-300 rounded px-1 py-1 w-[60px] bg-white"
                  />
                </td>

                <td className="border p-1">
                  <input
                    type="text"
                    value={row.values[9]}
                    onChange={(e) =>
                      updateInlineRowValue(row.id, 9, e.target.value)
                    }
                    className="border border-gray-300 rounded px-1 py-1 w-[70px] bg-white"
                  />
                </td>

                <td className="border p-1">
                  <input
                    type="text"
                    value={row.values[10]}
                    onChange={(e) =>
                      updateInlineRowValue(row.id, 10, e.target.value)
                    }
                    className="border border-gray-300 rounded px-1 py-1 w-[70px] bg-white"
                  />
                </td>

                <td className="border p-1">
                  <input
                    type="text"
                    value={row.values[11]}
                    onChange={(e) =>
                      updateInlineRowValue(row.id, 11, e.target.value)
                    }
                    className="border border-gray-300 rounded px-1 py-1 w-[60px] bg-white"
                  />
                </td>

                <td className="border p-1">
                  <input
                    type="text"
                    value={row.values[12]}
                    onChange={(e) =>
                      updateInlineRowValue(row.id, 12, e.target.value)
                    }
                    className="border border-gray-300 rounded px-1 py-1 w-[90px] bg-white"
                  />
                </td>

                <td className="border p-1">
                  <input
                    type="text"
                    value={row.values[13]}
                    onChange={(e) =>
                      updateInlineRowValue(row.id, 13, e.target.value)
                    }
                    className="border border-gray-300 rounded px-1 py-1 w-[90px] bg-white"
                  />
                </td>

                <td className="border p-1">
                  <input
                    type="text"
                    value={row.laiXeThuKhach}
                    onChange={(e) =>
                      updateInlineRowField(
                        row.id,
                        "laiXeThuKhach",
                        e.target.value,
                      )
                    }
                    className="border border-gray-300 rounded px-1 py-1 w-[90px] bg-white"
                  />
                </td>

                <td className="border p-1 min-w-[130px]">
                  {row.laiXeThuKhach && Number(row.laiXeThuKhach) !== 0 ? (
                    <div className="flex flex-col gap-1">
                      <label className="flex items-center gap-1">
                        <input
                          type="radio"
                          name={`phuong-an-${row.id}`}
                          checked={row.phuongAn === "daChuyenKhoan"}
                          onChange={() =>
                            updateInlineRowField(
                              row.id,
                              "phuongAn",
                              "daChuyenKhoan",
                            )
                          }
                        />
                        Đã CK
                      </label>

                      <label className="flex items-center gap-1">
                        <input
                          type="radio"
                          name={`phuong-an-${row.id}`}
                          checked={row.phuongAn === "truVaoTongLichTrinh"}
                          onChange={() =>
                            updateInlineRowField(
                              row.id,
                              "phuongAn",
                              "truVaoTongLichTrinh",
                            )
                          }
                        />
                        Trừ tổng
                      </label>
                    </div>
                  ) : null}
                </td>

                {rowIndex === 0 && (
                  <td rowSpan={inlineRows.length} className="border p-1">
                    <input
                      type="text"
                      inputMode="numeric"
                      value={inlineTongTien}
                      onChange={(e) =>
                        setInlineTongTien(e.target.value.replace(/\D/g, ""))
                      }
                      placeholder="Tổng tiền"
                      className="border border-gray-300 rounded px-1 py-1 w-[90px] bg-white"
                    />
                  </td>
                )}

                <td className="border p-1 text-center font-semibold text-blue-600">
                  MỚI
                </td>
              </tr>
            ))}

            {/* ================================================= */}
            {/* NÚT THÊM DÒNG */}
            {/* ================================================= */}

            <tr className="bg-blue-50">
              <td colSpan={22} className="border p-2">
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={addInlineRow}
                    className="bg-green-600 hover:bg-green-700 text-white px-3 py-1.5 rounded"
                  >
                    + Thêm chuyến
                  </button>

                  <button
                    type="button"
                    onClick={deleteInlineLastRow}
                    disabled={inlineRows.length <= 1}
                    className="bg-red-600 hover:bg-red-700 disabled:opacity-40 text-white px-3 py-1.5 rounded"
                  >
                    Xóa chuyến cuối
                  </button>

                  <button
                    type="button"
                    onClick={saveInlineSchedule}
                    disabled={inlineSaving}
                    className="bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white px-4 py-1.5 rounded font-semibold"
                  >
                    {inlineSaving ? "Đang lưu..." : "Lưu lịch trình"}
                  </button>
                </div>
              </td>
            </tr>

            {/* ================================================= */}
            {/* DATA CŨ - CHỈ HIỆN KHI CÓ DATA */}
            {/* ================================================= */}

            {displayedData.map((schedule, scheduleIndex) =>
              schedule.rows.map((row, rowIndex) => (
                <tr
                  key={`${schedule._id}-${rowIndex}`}
                  onClick={() =>
                    setActiveRows((prev) => {
                      const existed = prev.some(
                        (item) =>
                          item.scheduleId === schedule._id &&
                          item.rowIndex === rowIndex,
                      );

                      if (existed) {
                        return prev.filter(
                          (item) =>
                            !(
                              item.scheduleId === schedule._id &&
                              item.rowIndex === rowIndex
                            ),
                        );
                      }

                      return [
                        ...prev,
                        {
                          scheduleId: schedule._id,
                          rowIndex,
                        },
                      ];
                    })
                  }
                  className={`cursor-pointer ${
                    isActiveRow(schedule._id, rowIndex)
                      ? "bg-yellow-100"
                      : "hover:bg-gray-100"
                  }`}
                >
                  {rowIndex === 0 && (
                    <>
                      <td
                        rowSpan={schedule.rows.length}
                        className="border p-1 text-center"
                      >
                        {scheduleIndex + 1}
                      </td>

                      <td rowSpan={schedule.rows.length} className="border p-1">
                        {schedule.tenLaiXe}
                      </td>

                      <td rowSpan={schedule.rows.length} className="border p-1">
                        {schedule.ngayDi
                          ?.slice(0, 10)
                          .split("-")
                          .reverse()
                          .join("/")}
                      </td>

                      <td rowSpan={schedule.rows.length} className="border p-1">
                        {schedule.ngayVe
                          ?.slice(0, 10)
                          .split("-")
                          .reverse()
                          .join("/")}
                      </td>
                    </>
                  )}

                  <td className="border p-1">{row.bienSoXe}</td>

                  <td className="border p-1">{row.tenKhachHang}</td>

                  <td className="border p-1">{row.giayTo}</td>

                  <td className="border p-1">{row.noiDi}</td>

                  <td className="border p-1">{row.noiDen}</td>

                  <td className="border p-1">{row.trongLuongHang}</td>

                  <td className="border p-1 text-center">{row.soDiem}</td>

                  <td className="border p-1">{row.haiChieuVaLuuCa}</td>

                  <td className="border p-1">{row.an}</td>

                  <td className="border p-1">{row.tangCa}</td>

                  <td className="border p-1">{row.bocXep}</td>

                  <td className="border p-1">{row.ve}</td>

                  <td className="border p-1">{row.tienChuyen}</td>

                  <td className="border p-1">{row.chiPhiKhac}</td>

                  <td className="border p-1">{row.laiXeThuKhach}</td>

                  <td className="border p-1">
                    {row.phuongAn === "daChuyenKhoan"
                      ? "Đã CK"
                      : row.phuongAn === "truVaoTongLichTrinh"
                        ? "Trừ tổng"
                        : ""}
                  </td>

                  {rowIndex === 0 && (
                    <td
                      rowSpan={schedule.rows.length}
                      className="border p-1 text-right font-bold"
                    >
                      {schedule.tongTienLichTrinh} k
                    </td>
                  )}

                  <td
                    className="border p-1 cursor-help"
                    title={`Người thêm: ${
                      schedule.nguoiTao || "Không xác định"
                    }`}
                  >
                    {row.maLichTrinh}
                  </td>
                </tr>
              )),
            )}
          </tbody>
        </table>
      </div>

      <AddUserScheduleModal
        open={showAddSchedule}
        onClose={() => setShowAddSchedule(false)}
        user={user}
      />
    </div>
  );
};

export default ManageOnlineSchedule;
