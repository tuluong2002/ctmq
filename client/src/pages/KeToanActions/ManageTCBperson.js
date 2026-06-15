import { useState, useEffect, useRef } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import axios from "axios";
import TCBModal from "../../components/TCBModal";
import API from "../../api";

const apiTCB = `${API}/tcb-person`;

const formatDate = (val) => {
  if (!val) return "";
  const d = new Date(val);
  if (isNaN(d)) return "";
  const day = String(d.getDate()).padStart(2, "0");
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const year = d.getFullYear();
  return `${day}/${month}/${year}`;
};

const formatPrice = (val) => {
  if (val == null) return "";
  return new Intl.NumberFormat("vi-VN").format(val);
};

export const allColumns = [
  { key: "timePay", label: "THỜI GIAN", stickyIndex: 0 },
  { key: "maGD", label: "MÃ GD", stickyIndex: 1 },
  { key: "noiDungCK", label: "NỘI DUNG CK" },
  { key: "soTien", label: "SỐ TIỀN" },
  { key: "soDu", label: "SỐ DƯ" },
  { key: "khachHang", label: "TÊN KHÁCH HÀNG CK" },
  { key: "keToan", label: "KẾ TOÁN PHỤ TRÁCH" },
  { key: "ghiChu", label: "GHI CHÚ" },
  { key: "maChuyen", label: "MÃ CHUYẾN" },
];

const prefKey = (userId) => `tcb_table_prefs_${userId || "guest"}`;

export default function ManageTCBperson() {
  const navigate = useNavigate();
  const location = useLocation();
  const fileInputRef = useRef(null);

  const [data, setData] = useState([]);
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [showModal, setShowModal] = useState(false);
  const [editItem, setEditItem] = useState(null);
  const [file, setFile] = useState(null);
  const [importing, setImporting] = useState(false);

  const token = localStorage.getItem("token");
  const user =
    JSON.parse(localStorage.getItem("user") || "null") || location.state?.user;
  const userId = user?._id || "guest";
  const permissions = user?.permissions || [];
  const canEditTCB = permissions.includes("edit_tcb");
  const canLockTCB = permissions.includes("lock_tcb");

  const [visibleColumns, setVisibleColumns] = useState(
    allColumns.map((c) => c.key),
  );
  const [columnWidths, setColumnWidths] = useState({});
  const [prefsLoaded, setPrefsLoaded] = useState(false);

  const dragColRef = useRef(null);
  const resizingRef = useRef({ columnKey: null, startX: 0, startWidth: 0 });
  const isResizingRef = useRef(false);

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

  const handleGoToSumAllCustomers = () => {
    navigate("/customer-debt", { state: { user } });
  };

  const handleGoToSumKH26 = () => {
    navigate("/customer-debt-26", { state: { user } });
  };

  const handleGoToVouchers = () => {
    navigate("/voucher-list", { state: { user } });
  };

  const handleGoToContract = () => {
    navigate("/contract", { state: { user } });
  };

  const handleGoToTCB = () => {
    navigate("/tcb-person", { state: { user } });
  };

  const handleGoToOnlKT = () => {
    navigate("/onl-schedules", { state: { user } });
  };

  const [customerList, setCustomerList] = useState([]);
  const [accountantList, setAccountantList] = useState([]);
  const [maChuyenList, setMaChuyenList] = useState([]);

  const [selectedCustomers, setSelectedCustomers] = useState([]);
  const [selectedAccountants, setSelectedAccountants] = useState([]);
  const [selectedMaChuyen, setSelectedMaChuyen] = useState([]);

  useEffect(() => {
    axios.get(`${apiTCB}/customers`).then((res) => {
      setCustomerList(res.data.data || []);
    });

    axios.get(`${apiTCB}/accountants`).then((res) => {
      setAccountantList(res.data.data || []);
    });

    axios.get(`${apiTCB}/ma-chuyen`).then((res) => {
      setMaChuyenList(res.data.data || []);
    });
  }, []);

  const [customerNames, setCustomerNames] = useState([]);
  const [keToanNames, setKeToanNames] = useState([]);
  useEffect(() => {
    axios.get(`${apiTCB}/select-lists`).then((res) => {
      setCustomerNames(res.data.data.customerNames || []);
      setKeToanNames(res.data.data.keToanNames || []);
    });
  }, []);

  // ===== column filters =====
  const [colFilters, setColFilters] = useState({
    noiDungCK: "",
    ghiChu: "",
    maGD: "",
  });
  const [moneyFilter, setMoneyFilter] = useState({
    soTien: "",
    soDu: "",
  });
  const [searchKH, setSearchKH] = useState("");
  const [searchKT, setSearchKT] = useState("");
  const [searchMC, setSearchMC] = useState("");

  // ----------------- fetch data -----------------
  const [page, setPage] = useState(1); // trang hiện tại
  const [totalPages, setTotalPages] = useState(1);
  const [totalRows, setTotalRows] = useState(0);

  // mặc định giống backend
  const [sortDate, setSortDate] = useState("desc");
  // chỉ có: "asc" | "desc"

  const fetchData = async (p = 1) => {
    try {
      const body = {
        khachHang: selectedCustomers,
        keToan: selectedAccountants,
        from: from || undefined,
        to: to || undefined,
        noiDungCK: colFilters.noiDungCK || undefined,
        ghiChu: colFilters.ghiChu || undefined,
        maChuyen: selectedMaChuyen,
        soTien: moneyFilter.soTien || undefined,
        soDu: moneyFilter.soDu || undefined,
        maGD: colFilters.maGD || undefined,
        sortOrder: sortDate,
        page: p, // gửi page lên server
      };
      const res = await axios.post(`${apiTCB}/all`, body, {
        headers: { Authorization: token ? `Bearer ${token}` : undefined },
      });
      setData(res.data.data || []);
      setPage(res.data.page || p);
      setTotalPages(res.data.totalPages || 1);
      setTotalRows(res.data.total || 0);
    } catch (err) {
      console.error("Lỗi lấy dữ liệu:", err.response?.data || err.message);
      setData([]);
      setPage(1);
      setTotalPages(1);
      setTotalRows(0);
    }
  };

  useEffect(() => {
    fetchData();
  }, [
    from,
    to,
    colFilters,
    moneyFilter,
    selectedAccountants,
    selectedCustomers,
    selectedMaChuyen,
    sortDate,
  ]);

  const goToPage = (p) => {
    if (p < 1 || p > totalPages) return;
    fetchData(p);
  };

  // ----------------- prefs -----------------
  useEffect(() => {
    if (!userId) return;
    const raw = localStorage.getItem(prefKey(userId));
    if (!raw) {
      setPrefsLoaded(true);
      return;
    }
    try {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed.order)) {
        const valid = parsed.order.filter((k) =>
          allColumns.some((ac) => ac.key === k),
        );
        const missing = allColumns
          .map((c) => c.key)
          .filter((k) => !valid.includes(k));
        setVisibleColumns([...valid, ...missing]);
      }
      if (parsed.widths && typeof parsed.widths === "object") {
        setColumnWidths(parsed.widths);
      }
    } catch (e) {
      console.warn("Invalid prefs JSON:", e);
    } finally {
      setPrefsLoaded(true);
    }
  }, [userId]);

  useEffect(() => {
    if (!prefsLoaded || !userId) return;
    const payload = { order: visibleColumns, widths: columnWidths || {} };
    try {
      localStorage.setItem(prefKey(userId), JSON.stringify(payload));
    } catch (e) {}
  }, [visibleColumns, columnWidths, userId, prefsLoaded]);

  // ---------- Drag & drop ----------
  const onDragStart = (e, colKey) => {
    dragColRef.current = colKey;
    e.dataTransfer.effectAllowed = "move";
  };
  const onDragOver = (e) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
  };
  const onDrop = (e, targetKey) => {
    e.preventDefault();
    const src = dragColRef.current;
    if (!src || src === targetKey) return;
    const idxSrc = visibleColumns.indexOf(src);
    const idxTarget = visibleColumns.indexOf(targetKey);
    if (idxSrc === -1 || idxTarget === -1) return;

    const locked = allColumns
      .filter((c) => c.stickyIndex === 0 || c.stickyIndex === 1)
      .map((c) => c.key);
    if (locked.includes(src) || locked.includes(targetKey)) return;

    const newOrder = [...visibleColumns];
    newOrder.splice(idxSrc, 1);
    newOrder.splice(idxTarget, 0, src);
    setVisibleColumns(newOrder);
  };

  // ---------- Resizable columns ----------
  const onMouseDownResize = (e, colKey) => {
    e.preventDefault();
    const th = e.target.closest("th");
    const startWidth = th ? th.offsetWidth : 120;
    resizingRef.current = { columnKey: colKey, startX: e.clientX, startWidth };
    window.addEventListener("mousemove", onMouseMoveResize);
    window.addEventListener("mouseup", onMouseUpResize);
  };
  const onMouseMoveResize = (e) => {
    const r = resizingRef.current;
    if (!r.columnKey) return;
    const delta = e.clientX - r.startX;
    let newWidth = r.startWidth + delta;
    if (newWidth < 60) newWidth = 60;
    setColumnWidths((prev) => ({ ...prev, [r.columnKey]: `${newWidth}px` }));
  };
  const onMouseUpResize = () => {
    const colKey = resizingRef.current.columnKey;
    if (!colKey) return;
    resizingRef.current = { columnKey: null, startX: 0, startWidth: 0 };
    window.removeEventListener("mousemove", onMouseMoveResize);
    window.removeEventListener("mouseup", onMouseUpResize);
  };

  // ----------------- add/edit -----------------
  const handleAdd = () => {
    setEditItem(null);
    setShowModal(true);
  };
  const handleEdit = (v) => {
    setEditItem(v);
    setShowModal(true);
  };

  // ----------------- delete -----------------
  const handleDelete = async (id) => {
    if (!canLockTCB) return alert("Bạn chưa có quyền!");
    if (!window.confirm("Xác nhận xóa?")) return;
    try {
      await axios.delete(`${apiTCB}/${id}`, {
        headers: { Authorization: token ? `Bearer ${token}` : undefined },
      });
      setData((prev) => prev.filter((m) => m._id !== id));
      fetchData(); // reload để cập nhật số dư
    } catch (err) {
      alert("Không xóa được: " + (err.response?.data?.error || err.message));
    }
  };
  const handleDeleteAll = async () => {
    if (!canLockTCB) return alert("Bạn chưa có quyền!");
    if (!window.confirm("Xác nhận xóa tất cả?")) return;
    try {
      await axios.delete(apiTCB, {
        headers: { Authorization: token ? `Bearer ${token}` : undefined },
      });
      setData([]);
      alert("Đã xóa tất cả!");
    } catch (err) {
      console.error(err);
      alert("Xóa tất cả thất bại");
    }
  };

  // ----------------- import/export -----------------
  const handleImportConfirm = async () => {
    if (!file) return alert("Chọn file Excel!");
    setImporting(true);
    const formData = new FormData();
    formData.append("file", file);
    try {
      const res = await axios.post(`${apiTCB}/import`, formData, {
        headers: { Authorization: token ? `Bearer ${token}` : undefined },
      });
      alert(`Import xong — Thêm: ${res.data.inserted}`);
      setFile(null);
      fetchData();
    } catch (err) {
      console.error(err);
      alert("Không thể import Excel!");
    } finally {
      setImporting(false);
    }
  };

  const [exporting, setExporting] = useState(false);

  const exportExcel = async () => {
    if (exporting) return;

    try {
      setExporting(true);

      const res = await axios.get(`${apiTCB}/export-excel`, {
        params: {
          from: from || undefined,
          to: to || undefined,
        },
        responseType: "blob",
        headers: {
          Authorization: token ? `Bearer ${token}` : undefined,
        },
      });

      const blob = new Blob([res.data], {
        type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      });

      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `SAO_KE_TCB_${from || "ALL"}_${to || "NOW"}.xlsx`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);
    } catch (err) {
      console.error("Export error:", err);
      alert(
        err.response?.data?.message || "Không thể xuất file Excel sao kê TCB",
      );
    } finally {
      setExporting(false); // 🔓 mở lại nút
    }
  };

  const [insertAnchor, setInsertAnchor] = useState(null);
  const handleInsert = (row) => {
    setInsertAnchor(row); // dòng mốc
    setEditItem(null); // modal rỗng
    setShowModal(true);
  };

  const [showColFilter, setShowColFilter] = useState(null);
  const [filterPos, setFilterPos] = useState({ top: 0, left: 0 });
  const filterRef = useRef(null);
  useEffect(() => {
    const handler = (e) => {
      if (filterRef.current && !filterRef.current.contains(e.target)) {
        setShowColFilter(null);
      }
    };
    window.addEventListener("mousedown", handler);
    return () => window.removeEventListener("mousedown", handler);
  }, []);

  const handleToggleLock = async (row) => {
    try {
      await axios.patch(
        `${apiTCB}/${row._id}/toggle-lock`,
        {},
        { headers: { Authorization: token ? `Bearer ${token}` : undefined } },
      );
      fetchData(page);
    } catch (err) {
      alert(err.response?.data?.error || "Không thể đổi trạng thái khoá");
    }
  };

  const handleLockByDateRange = async () => {
    if (!from || !to) {
      return alert("Vui lòng chọn từ ngày – đến ngày");
    }

    if (!window.confirm(`Khoá tất cả giao dịch từ ${from} đến ${to}?`)) return;

    try {
      const res = await axios.post(
        `${apiTCB}/lock-by-date`,
        { fromDate: from, toDate: to },
        { headers: { Authorization: token ? `Bearer ${token}` : undefined } },
      );

      alert(res.data.message || "Đã khoá giao dịch");
      fetchData(page);
    } catch (err) {
      alert(err.response?.data?.message || "Khoá theo khoảng ngày thất bại");
    }
  };

  return (
    <div className="p-4 bg-gray-50 min-h-screen text-xs">
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
          onClick={handleGoToSumAllCustomers}
          className={`px-3 py-1 rounded text-white 
      ${isActive("/customer-debt") ? "bg-green-600" : "bg-blue-500"}
    `}
        >
          Công nợ KH
        </button>

        <button
          onClick={handleGoToSumKH26}
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
      </div>
      <div className="flex gap-2 items-center mb-4">
        <h1 className="text-xl font-bold">QUẢN LÝ CHUYỂN KHOẢN KHÁCH HÀNG</h1>
      </div>

      {/* Filter */}
      <div className="flex gap-2 mb-4 flex-wrap items-center justify-end">
        <button
          onClick={handleLockByDateRange}
          disabled={!canLockTCB}
          className={`px-3 py-1 rounded text-white
    ${
      canLockTCB
        ? "bg-red-500 hover:bg-red-700"
        : "bg-gray-400 cursor-not-allowed"
    }
  `}
          title={
            !canLockTCB
              ? "Bạn không có quyền khoá giao dịch"
              : "Khoá giao dịch theo ngày"
          }
        >
          Khoá GD
        </button>

        <input
          type="date"
          value={from}
          onChange={(e) => setFrom(e.target.value)}
          onClick={(e) => e.target.showPicker()}
          className="border px-2 py-1 rounded cursor-pointer"
        />
        <input
          type="date"
          value={to}
          onChange={(e) => setTo(e.target.value)}
          onClick={(e) => e.target.showPicker()}
          className="border px-2 py-1 rounded cursor-pointer"
        />
        <button
          onClick={() => {
            setFrom("");
            setTo("");
            setMoneyFilter({ soTien: "", soDu: "" });
            setColFilters({ noiDungCK: "", ghiChu: "", maGD: "" });
            setSelectedAccountants([]);
            setSelectedCustomers([]);
            setSelectedMaChuyen([]);
            fetchData();
          }}
          className="bg-gray-200 px-3 py-1 rounded"
        >
          Reset
        </button>
        <button
          onClick={handleAdd}
          className="bg-green-500 px-3 py-1 text-white rounded"
        >
          + Thêm
        </button>
        <button
          onClick={exportExcel}
          disabled={exporting}
          className={`px-3 py-1 text-white rounded transition
    ${
      exporting
        ? "bg-gray-400 cursor-not-allowed"
        : "bg-blue-600 hover:bg-blue-700"
    }
  `}
        >
          {exporting ? "Đang xuất..." : "Xuất Excel"}
        </button>

        <input
          ref={fileInputRef}
          type="file"
          accept=".xlsx"
          onChange={(e) => setFile(e.target.files[0])}
          className="border p-1 rounded"
        />
        <button
          onClick={handleImportConfirm}
          className="bg-purple-600 text-white px-3 py-1 rounded"
        >
          {importing ? "Đang import..." : "Import Excel"}
        </button>
      </div>

      {/* Thanh sắp xếp */}
      <div className="flex items-center gap-6 mb-1 p-1 border rounded bg-gray-50 text-xs">
        <span className="font-semibold ml-1">Sắp xếp theo mã GD:</span>

        <label className="flex items-center gap-1 cursor-pointer">
          <input
            type="radio"
            name="sortTimePay"
            checked={sortDate === "desc"}
            onChange={() => setSortDate("desc")}
          />
          <span>Giảm dần</span>
        </label>

        <label className="flex items-center gap-1 cursor-pointer">
          <input
            type="radio"
            name="sortTimePay"
            checked={sortDate === "asc"}
            onChange={() => setSortDate("asc")}
          />
          <span>Tăng dần</span>
        </label>
      </div>

      {/* Table */}
      <div className="overflow-auto border" style={{ maxHeight: "70vh" }}>
        <table
          style={{
            tableLayout: "fixed",
            width: "max-content",
            borderCollapse: "separate",
            borderSpacing: 0,
          }}
        >
          <thead className="bg-gray-200 sticky top-0 z-40">
            {/* ================= HEADER ================= */}
            <tr>
              <th
                className="border p-1 left-0 bg-gray-200 z-50"
                style={{ width: 40 }}
              >
                STT
              </th>

              {visibleColumns.map((cKey) => {
                const colMeta = allColumns.find((c) => c.key === cKey) || {
                  label: cKey,
                };
                const widthStyle = columnWidths[cKey]
                  ? {
                      width: columnWidths[cKey],
                      minWidth: columnWidths[cKey],
                      maxWidth: columnWidths[cKey],
                    }
                  : {};

                return (
                  <th
                    key={cKey}
                    className="border p-1 relative text-center select-none"
                    style={{
                      position: "sticky",
                      top: 0,
                      background: "#f3f4f6",
                      ...widthStyle,
                    }}
                  >
                    <div
                      draggable
                      onDragStart={(e) => onDragStart(e, cKey)}
                      onDragOver={onDragOver}
                      onDrop={(e) => onDrop(e, cKey)}
                      className="truncate p-1 cursor-move"
                    >
                      <span
                        className="cursor-pointer select-none"
                        onClick={(e) => {
                          e.stopPropagation();
                          const rect = e.target.getBoundingClientRect();
                          setFilterPos({
                            top: rect.bottom + window.scrollY,
                            left: rect.left + window.scrollX,
                          });
                          setShowColFilter((p) => (p === cKey ? null : cKey));
                        }}
                      >
                        {colMeta.label}
                      </span>
                    </div>

                    {/* Resize handle */}
                    <div
                      onMouseDown={(e) => {
                        isResizingRef.current = true;
                        e.preventDefault();
                        e.stopPropagation();
                        onMouseDownResize(e, cKey);
                      }}
                      style={{
                        position: "absolute",
                        right: 0,
                        top: 0,
                        bottom: 0,
                        width: 6,
                        cursor: "col-resize",
                        zIndex: 100,
                      }}
                    />
                  </th>
                );
              })}

              <th className="border p-1 sticky top-0 bg-gray-200">HÀNH ĐỘNG</th>
              <th className="border p-1 sticky top-0 bg-gray-200">KHOÁ</th>
            </tr>
          </thead>

          <tbody>
            {data.length === 0 && (
              <tr>
                <td
                  colSpan={visibleColumns.length + 2}
                  className="p-4 text-center text-gray-500"
                >
                  Không có dữ liệu
                </td>
              </tr>
            )}
            {data.map((v, idx) => (
              <tr
                key={v._id}
                className={idx % 2 === 0 ? "bg-white" : "bg-gray-50"}
              >
                <td className="border p-1 text-center left-0 bg-gray-50">
                  {idx + 1}
                </td>
                {visibleColumns.map((cKey) => (
                  <td
                    key={cKey}
                    className={`border p-1 ${
                      ["soTien", "soDu"].includes(cKey) ? "text-right" : ""
                    }`}
                    style={{
                      width: columnWidths[cKey],
                      maxWidth: columnWidths[cKey],
                      overflow: "hidden",
                      textOverflow: "ellipsis",
                      whiteSpace: "nowrap",
                    }}
                  >
                    {["timePay"].includes(cKey)
                      ? formatDate(v[cKey])
                      : ["soTien", "soDu"].includes(cKey)
                        ? formatPrice(v[cKey])
                        : v[cKey]}
                  </td>
                ))}

                <td className="border p-1 flex gap-2 justify-center">
                  {/* ===== SỬA ===== */}
                  <button
                    onClick={() => handleEdit(v)}
                    disabled={v.isLocked}
                    className={`${
                      v.isLocked
                        ? "text-gray-400 cursor-not-allowed"
                        : "text-blue-600"
                    }`}
                    title={v.isLocked ? "Giao dịch đã bị khoá" : ""}
                  >
                    Sửa
                  </button>

                  {/* ===== CHÈN (LUÔN CHO PHÉP) ===== */}
                  <button
                    onClick={() => handleInsert(v)}
                    className="text-green-600 font-semibold"
                  >
                    Chèn
                  </button>

                  {/* ===== XOÁ ===== */}
                  <button
                    onClick={() => handleDelete(v._id)}
                    disabled={!canLockTCB || v.isLocked}
                    className={`${
                      !canLockTCB || v.isLocked
                        ? "text-gray-400 cursor-not-allowed"
                        : "text-red-600 hover:underline"
                    }`}
                    title={
                      !canLockTCB
                        ? "Bạn không có quyền xoá"
                        : v.isLocked
                          ? "Giao dịch đã bị khoá"
                          : "Xoá giao dịch"
                    }
                  >
                    Xóa
                  </button>
                </td>

                <td className="border p-1 text-center">
                  <input
                    type="checkbox"
                    checked={v.isLocked === true}
                    // Nếu đang khoá và không có quyền → disable, còn lại ai cũng tick được
                    disabled={v.isLocked === true && !canLockTCB}
                    onChange={() => handleToggleLock(v)}
                    title={
                      v.isLocked
                        ? !canLockTCB
                          ? "Bạn không có quyền mở khoá giao dịch"
                          : "Mở khoá giao dịch"
                        : "Khoá giao dịch"
                    }
                  />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {showModal && (
        <TCBModal
          initialData={editItem}
          insertAnchor={insertAnchor}
          canEditTCB={canEditTCB}
          customerList={customerNames}
          keToanList={keToanNames}
          onClose={() => {
            setShowModal(false);
            setEditItem(null);
            setInsertAnchor(null);
          }}
          onSave={() => fetchData()} // ⚠️ reload full vì số dư thay đổi
          apiBase={apiTCB}
        />
      )}

      {/* Phân trang */}
      <div className="flex justify-center items-center gap-3 mt-3">
        <button
          onClick={() => goToPage(page - 1)}
          disabled={page === 1}
          className="px-3 py-1 bg-gray-200 rounded disabled:opacity-50"
        >
          Trước
        </button>

        {/* CHỌN TRANG */}
        <div className="flex items-center gap-1">
          <span>Trang</span>
          <select
            value={page}
            onChange={(e) => goToPage(Number(e.target.value))}
            className="border px-2 py-1 rounded"
          >
            {Array.from({ length: totalPages }, (_, i) => i + 1).map((p) => (
              <option key={p} value={p}>
                {p}
              </option>
            ))}
          </select>
          <span>/ {totalPages}</span>
        </div>

        <button
          onClick={() => goToPage(page + 1)}
          disabled={page === totalPages}
          className="px-3 py-1 bg-gray-200 rounded disabled:opacity-50"
        >
          Sau
        </button>
      </div>

      {/* Xoá tất cả */}
      <div className="flex justify-end mt-3">
        <button
          onClick={handleDeleteAll}
          className={`px-4 py-2 bg-red-600 text-white rounded shadow hover:bg-red-700 
      ${!canLockTCB ? "opacity-50 cursor-not-allowed" : ""}`}
        >
          Xóa tất cả
        </button>
      </div>

      {/* Bộ lọc cột */}
      {showColFilter && (
        <div
          ref={filterRef}
          className="fixed z-[9999] w-64 bg-white border rounded shadow p-2 text-xs"
          style={{
            top: filterPos.top,
            left: filterPos.left,
          }}
          onClick={(e) => e.stopPropagation()}
        >
          {/* ===== KHÁCH HÀNG ===== */}
          {showColFilter === "khachHang" && (
            <>
              {/* 🔍 input tìm */}
              <input
                className="w-full border px-1 py-0.5 mb-1"
                placeholder="Tìm khách hàng..."
                value={searchKH}
                onChange={(e) => setSearchKH(e.target.value)}
              />

              {/* ✅ chọn tất cả */}
              <button
                className="mb-1 w-full bg-gray-200 hover:bg-gray-300 rounded py-0.5"
                onClick={() => {
                  const filtered = customerList.filter((c) =>
                    c.toLowerCase().includes(searchKH.toLowerCase()),
                  );
                  const allChecked = filtered.every((c) =>
                    selectedCustomers.includes(c),
                  );

                  setSelectedCustomers(
                    (prev) =>
                      allChecked
                        ? prev.filter((x) => !filtered.includes(x)) // bỏ chọn
                        : Array.from(new Set([...prev, ...filtered])), // chọn
                  );
                }}
              >
                {customerList
                  .filter((c) =>
                    c.toLowerCase().includes(searchKH.toLowerCase()),
                  )
                  .every((c) => selectedCustomers.includes(c))
                  ? "Bỏ chọn tất cả"
                  : "Chọn tất cả"}
              </button>

              <div className="max-h-40 overflow-auto">
                {customerList
                  .filter((c) =>
                    c.toLowerCase().includes(searchKH.toLowerCase()),
                  )
                  .map((c) => (
                    <label key={c} className="flex items-center gap-1 mb-1">
                      <input
                        type="checkbox"
                        checked={selectedCustomers.includes(c)}
                        onChange={(e) =>
                          setSelectedCustomers((p) =>
                            e.target.checked
                              ? [...p, c]
                              : p.filter((x) => x !== c),
                          )
                        }
                      />
                      <span>{c}</span>
                    </label>
                  ))}
              </div>
            </>
          )}

          {/* ===== KẾ TOÁN ===== */}
          {showColFilter === "keToan" && (
            <>
              {/* 🔍 input tìm */}
              <input
                className="w-full border px-1 py-0.5 mb-1"
                placeholder="Tìm kế toán..."
                value={searchKT}
                onChange={(e) => setSearchKT(e.target.value)}
              />

              {/* ✅ chọn tất cả */}
              <button
                className="mb-1 w-full bg-gray-200 hover:bg-gray-300 rounded py-0.5"
                onClick={() => {
                  const filtered = accountantList.filter((a) =>
                    a.toLowerCase().includes(searchKT.toLowerCase()),
                  );
                  const allChecked = filtered.every((a) =>
                    selectedAccountants.includes(a),
                  );

                  setSelectedAccountants((prev) =>
                    allChecked
                      ? prev.filter((x) => !filtered.includes(x))
                      : Array.from(new Set([...prev, ...filtered])),
                  );
                }}
              >
                {accountantList
                  .filter((a) =>
                    a.toLowerCase().includes(searchKT.toLowerCase()),
                  )
                  .every((a) => selectedAccountants.includes(a))
                  ? "Bỏ chọn tất cả"
                  : "Chọn tất cả"}
              </button>

              <div className="max-h-40 overflow-auto">
                {accountantList
                  .filter((a) =>
                    a.toLowerCase().includes(searchKT.toLowerCase()),
                  )
                  .map((a) => (
                    <label key={a} className="flex items-center gap-1 mb-1">
                      <input
                        type="checkbox"
                        checked={selectedAccountants.includes(a)}
                        onChange={(e) =>
                          setSelectedAccountants((p) =>
                            e.target.checked
                              ? [...p, a]
                              : p.filter((x) => x !== a),
                          )
                        }
                      />
                      <span>{a}</span>
                    </label>
                  ))}
              </div>
            </>
          )}

          {/* ===== KẾ TOÁN ===== */}
          {showColFilter === "maChuyen" && (
            <>
              {/* 🔍 input tìm */}
              <input
                className="w-full border px-1 py-0.5 mb-1"
                placeholder="Tìm mã chuyến..."
                value={searchMC}
                onChange={(e) => setSearchMC(e.target.value)}
              />

              {/* ✅ chọn tất cả */}
              <button
                className="mb-1 w-full bg-gray-200 hover:bg-gray-300 rounded py-0.5"
                onClick={() => {
                  const filtered = maChuyenList.filter((a) =>
                    a.toLowerCase().includes(searchMC.toLowerCase()),
                  );
                  const allChecked = filtered.every((a) =>
                    selectedMaChuyen.includes(a),
                  );

                  setSelectedMaChuyen((prev) =>
                    allChecked
                      ? prev.filter((x) => !filtered.includes(x))
                      : Array.from(new Set([...prev, ...filtered])),
                  );
                }}
              >
                {maChuyenList
                  .filter((a) =>
                    a.toLowerCase().includes(searchMC.toLowerCase()),
                  )
                  .every((a) => selectedMaChuyen.includes(a))
                  ? "Bỏ chọn tất cả"
                  : "Chọn tất cả"}
              </button>

              <div className="max-h-40 overflow-auto">
                {maChuyenList
                  .filter((a) =>
                    a.toLowerCase().includes(searchMC.toLowerCase()),
                  )
                  .map((a) => (
                    <label key={a} className="flex items-center gap-1 mb-1">
                      <input
                        type="checkbox"
                        checked={selectedMaChuyen.includes(a)}
                        onChange={(e) =>
                          setSelectedMaChuyen((p) =>
                            e.target.checked
                              ? [...p, a]
                              : p.filter((x) => x !== a),
                          )
                        }
                      />
                      <span>{a}</span>
                    </label>
                  ))}
              </div>
            </>
          )}

          {/* ===== TEXT FILTER ===== */}
          {["noiDungCK", "ghiChu", "maGD"].includes(showColFilter) && (
            <>
              <input
                autoFocus
                className="w-full border px-1 py-0.5"
                placeholder="Nhập để lọc..."
                value={colFilters[showColFilter] || ""}
                onChange={(e) =>
                  setColFilters((p) => ({
                    ...p,
                    [showColFilter]: e.target.value,
                  }))
                }
              />
            </>
          )}
          {["soTien", "soDu"].includes(showColFilter) && (
            <>
              <input
                type="number"
                className="w-full border px-1 py-0.5"
                placeholder="Nhập số tiền"
                value={moneyFilter[showColFilter] || ""}
                onChange={(e) =>
                  setMoneyFilter((p) => ({
                    ...p,
                    [showColFilter]: e.target.value,
                  }))
                }
              />
            </>
          )}

          <button
            onClick={() => {
              fetchData(1);
              setShowColFilter(null);
            }}
            className="mt-2 w-full bg-blue-600 text-white py-1 rounded"
          >
            Áp dụng
          </button>
        </div>
      )}
    </div>
  );
}
