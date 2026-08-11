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

  const [showAddSchedule, setShowAddSchedule] = useState(false);

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

      {/* Hiển thị dữ liệu */}
      {filteredData.length > 0 && (
        <div className="max-h-[700px] overflow-y-auto border">
          <table className="w-full border text-xs border-separate border-spacing-0">
            <thead className="bg-gray-200">
              <tr>
                <th className="border p-1 sticky top-0 bg-gray-200 z-20">
                  STT
                </th>
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
                  TL hàng
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
              {displayedData.map((schedule, scheduleIndex) =>
                schedule.rows.map((row, rowIndex) => (
                  <tr
                    key={`${schedule._id}-${rowIndex}`}
                    onClick={() =>
                      setActiveRows((prev) => {
                        const existed = prev.some(
                          (r) =>
                            r.scheduleId === schedule._id &&
                            r.rowIndex === rowIndex,
                        );

                        if (existed) {
                          // ❌ đã tồn tại → bỏ highlight
                          return prev.filter(
                            (r) =>
                              !(
                                r.scheduleId === schedule._id &&
                                r.rowIndex === rowIndex
                              ),
                          );
                        }

                        // ✅ chưa có → thêm
                        return [
                          ...prev,
                          { scheduleId: schedule._id, rowIndex },
                        ];
                      })
                    }
                    className={`cursor-pointer ${
                      isActiveRow(schedule._id, rowIndex)
                        ? "bg-yellow-100"
                        : "hover:bg-gray-100"
                    }`}
                  >
                    {/* STT + field chung – chỉ render 1 lần */}
                    {rowIndex === 0 && (
                      <>
                        <td
                          className={`border p-1 text-center ${
                            isActiveSchedule(schedule._id)
                              ? "bg-yellow-100"
                              : ""
                          }`}
                          rowSpan={schedule.rows.length}
                        >
                          {scheduleIndex + 1}
                        </td>
                        <td
                          className={`border p-1 ${
                            isActiveSchedule(schedule._id)
                              ? "bg-yellow-100"
                              : ""
                          }`}
                          rowSpan={schedule.rows.length}
                        >
                          {schedule.tenLaiXe}
                        </td>

                        <td
                          className={`border p-1 ${
                            isActiveSchedule(schedule._id)
                              ? "bg-yellow-100"
                              : ""
                          }`}
                          rowSpan={schedule.rows.length}
                        >
                          {schedule.ngayDi
                            ?.slice(0, 10)
                            .split("-")
                            .reverse()
                            .join("/")}
                        </td>

                        <td
                          className={`border p-1 ${
                            isActiveSchedule(schedule._id)
                              ? "bg-yellow-100"
                              : ""
                          }`}
                          rowSpan={schedule.rows.length}
                        >
                          {schedule.ngayVe
                            ?.slice(0, 10)
                            .split("-")
                            .reverse()
                            .join("/")}
                        </td>
                      </>
                    )}

                    {/* FIELD THEO ROW */}
                    <td className="border p-1">{row.bienSoXe}</td>
                    <td className="border p-1">{row.tenKhachHang}</td>
                    <td className="border p-1">{row.giayTo}</td>
                    <td className="border p-1">{row.noiDi}</td>
                    <td className="border p-1">{row.noiDen}</td>
                    <td className="border p-1 text-right">
                      {row.trongLuongHang}
                    </td>
                    <td className="border p-1 text-center">{row.soDiem}</td>
                    <td className="border p-1">{row.haiChieuVaLuuCa}</td>
                    <td className="border p-1 text-right">{row.an}</td>
                    <td className="border p-1 text-right">{row.tangCa}</td>
                    <td className="border p-1 text-right">{row.bocXep}</td>
                    <td className="border p-1 text-right">{row.ve}</td>
                    <td className="border p-1 text-right">{row.tienChuyen}</td>
                    <td className="border p-1 text-right">{row.chiPhiKhac}</td>
                    <td className="border p-1">{row.laiXeThuKhach}</td>
                    <td className="border p-1">
                      {row.phuongAn === "daChuyenKhoan"
                        ? "Đã CK"
                        : row.phuongAn === "truVaoTongLichTrinh"
                          ? "Trừ tổng"
                          : ""}
                    </td>

                    {/* Tổng tiền – chỉ 1 lần */}
                    {rowIndex === 0 && (
                      <td
                        className={`border p-1 text-right text-blue-600 font-bold ${
                          isActiveSchedule(schedule._id) ? "bg-yellow-100" : ""
                        }`}
                        rowSpan={schedule.rows.length}
                      >
                        {schedule.tongTienLichTrinh} k
                      </td>
                    )}
                    <td
                      className="border p-1 cursor-help"
                      title={`Người thêm: ${schedule.nguoiTao || "Không xác định"}`}
                    >
                      {row.maLichTrinh}
                    </td>
                  </tr>
                )),
              )}
            </tbody>
          </table>
        </div>
      )}

      <AddUserScheduleModal
        open={showAddSchedule}
        onClose={() => setShowAddSchedule(false)}
        user={user}
      />
    </div>
  );
};

export default ManageOnlineSchedule;
