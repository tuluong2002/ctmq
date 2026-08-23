// src/pages/ManageDriver.js
import { useState, useEffect, useRef } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import axios from "axios";
import DriverModal from "../../components/DriverModal";
import { format as formatDateFns } from "date-fns";
import { saveAs } from "file-saver";
import API from "../../api";

const apiDrivers = `${API}/drivers`;

// ---- allColumns ở ngoài component (bạn đã làm rồi) ----
export const allColumns = [
  { key: "stt", label: "STT" },
  { key: "name", label: "HỌ TÊN LÁI XE" },
  { key: "nameZalo", label: "TÊN ZALO" },
  { key: "birthYear", label: "Ngày sinh" },
  { key: "company", label: "ĐƠN VỊ" },
  { key: "bsx", label: "BSX" },
  { key: "phone", label: "SĐT" },
  { key: "hometown", label: "QUÊ QUÁN" },
  { key: "resHometown", label: "NƠI ĐĂNG KÝ HKTT" },
  { key: "address", label: "NƠI Ở HIỆN TẠI" },
  { key: "cccd", label: "CCCD" },
  { key: "cccdIssuedAt", label: "Ngày cấp CCCD" },
  { key: "cccdExpiryAt", label: "Ngày hết hạn CCCD" },
  { key: "licenseImageCCCD", label: "Ảnh CCCD" },
  { key: "numberClass", label: "Số GPLX" },
  { key: "licenseClass", label: "HẠNG BL" },
  { key: "licenseIssuedAt", label: "Ngày cấp GPLX" },
  { key: "licenseExpiryAt", label: "Ngày hết hạn GPLX" },
  { key: "licenseImage", label: "Ảnh GPLX" },
  { key: "numberHDLD", label: "Số HĐLĐ" },
  { key: "dayStartWork", label: "Ngày vào làm" },
  { key: "dayEndWork", label: "Ngày nghỉ" },
];

// helper để dựng key trong localStorage
const prefKey = (userId) => `drivers_table_prefs_${userId || "guest"}`;

// ---------- Date formatting helper ----------
function formatDateSafe(value) {
  if (!value) return "";
  if (typeof value === "string" && value.includes("T")) {
    const datePart = value.split("T")[0];
    const [y, m, d] = datePart.split("-");
    if (y && m && d) return `${d}/${m}/${y}`;
  }
  if (typeof value === "string" && /^\d{4}-\d{2}-\d{2}$/.test(value)) {
    const [y, m, d] = value.split("-");
    return `${d}/${m}/${y}`;
  }
  const dObj = new Date(value);
  if (!isNaN(dObj.getTime())) {
    return formatDateFns(dObj, "dd/MM/yyyy");
  }
  return "";
}

export default function ManageDriver() {
  const navigate = useNavigate();
  const location = useLocation();
  const fileInputRef = useRef(null);

  const [drivers, setDrivers] = useState([]);
  const [q, setQ] = useState("");
  const [showModal, setShowModal] = useState(false);
  const [editDriver, setEditDriver] = useState(null);
  const [file, setFile] = useState(null);
  const [importing, setImporting] = useState(false);

  const token = localStorage.getItem("token");
  const user =
    JSON.parse(localStorage.getItem("user") || "null") || location.state?.user;
  const userId = user?._id || "guest";
  const permissions = user?.permissions || [];
  const canEditDriver = permissions.includes("edit_driver");

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

  // visibleColumns khởi tạo mặc định từ allColumns
  const [visibleColumns, setVisibleColumns] = useState(
    allColumns.map((c) => c.key),
  );
  const [columnWidths, setColumnWidths] = useState({});

  // flag: prefs đã load xong chưa
  const [prefsLoaded, setPrefsLoaded] = useState(false);

  // drag/resize refs
  const dragColRef = useRef(null);
  const resizingRef = useRef({ columnKey: null, startX: 0, startWidth: 0 });

  // sticky first col
  const firstColRef = useRef(null);
  const [firstColWidth, setFirstColWidth] = useState(60);
  useEffect(() => {
    if (firstColRef.current) {
      setFirstColWidth(firstColRef.current.offsetWidth);
    }
  }, [columnWidths, visibleColumns, drivers]);

  const [loading, setLoading] = useState(true);

  // fetch drivers
  const fetch = async (search = "") => {
    try {
      setLoading(true); // 👈 bắt đầu loading

      const url = search
        ? `${apiDrivers}?q=${encodeURIComponent(search)}`
        : apiDrivers;

      const res = await axios.get(url, {
        headers: { Authorization: token ? `Bearer ${token}` : undefined },
      });

      let data = res.data || [];

      data = data.sort((a, b) => {
        const isA = a.company?.trim().toLowerCase() === "ct minh quân";
        const isB = b.company?.trim().toLowerCase() === "ct minh quân";
        return isA === isB ? 0 : isA ? -1 : 1;
      });

      setDrivers(data);

      const w = {};
      data.forEach((d) => {
        if (d.warning === true) w[d._id] = true;
      });
      setWarnings(w);
    } catch (err) {
      console.error("Lỗi lấy drivers:", err.response?.data || err.message);
      setDrivers([]);
      setWarnings({});
    } finally {
      setLoading(false); // 👈 kết thúc loading (dù thành công hay lỗi)
    }
  };

  // ------------------ LOAD prefs (1 lần when userId changes) ------------------
  useEffect(() => {
    // don't attempt load if no userId yet
    if (!userId) return;

    console.log("LOAD PREFS KEY:", prefKey(userId));
    const raw = localStorage.getItem(prefKey(userId));
    if (!raw) {
      // nothing saved — mark loaded so we can start saving later
      setPrefsLoaded(true);
      return;
    }

    try {
      const parsed = JSON.parse(raw);

      if (Array.isArray(parsed.order)) {
        // keep only valid keys and append missing columns (preserve defaults for new columns)
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
      // important: mark loaded so save-effect won't overwrite on first mount
      setPrefsLoaded(true);
    }
  }, [userId]);

  // fetch drivers once on mount
  useEffect(() => {
    fetch();
  }, []);

  // ------------------ SAVE prefs (only after prefsLoaded) ------------------
  useEffect(() => {
    if (!prefsLoaded) return; // <-- KEY: don't save until we've loaded prefs from storage
    if (!userId) return;

    const payload = { order: visibleColumns, widths: columnWidths || {} };
    try {
      localStorage.setItem(prefKey(userId), JSON.stringify(payload));
      console.log("SAVE PREFS KEY:", prefKey(userId), payload);
    } catch (e) {
      console.warn("Failed to save prefs:", e);
    }
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
    const newOrder = [...visibleColumns];
    newOrder.splice(idxSrc, 1);
    newOrder.splice(idxTarget, 0, src);
    setVisibleColumns(newOrder);
    dragColRef.current = null;
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

  const isResizing = useRef(false);

  const onMouseUpResize = () => {
    const colKey = resizingRef.current.columnKey;
    if (!colKey) {
      window.removeEventListener("mousemove", onMouseMoveResize);
      window.removeEventListener("mouseup", onMouseUpResize);
      return;
    }

    const th = document.querySelector(`th[data-col="${colKey}"]`);
    if (!th) {
      isResizing.current = false;
      window.removeEventListener("mousemove", onMouseMoveResize);
      window.removeEventListener("mouseup", onMouseUpResize);
      resizingRef.current = { columnKey: null, startX: 0, startWidth: 0 };
      return;
    }

    const finalWidth = th.offsetWidth + "px";

    // update state AND persist widths immediately into localStorage (merge)
    setColumnWidths((prev) => {
      const updated = { ...prev, [colKey]: finalWidth };
      try {
        const prefs = JSON.parse(localStorage.getItem(prefKey(userId))) || {};
        prefs.widths = updated;
        // keep order if exists, otherwise write current visibleColumns
        prefs.order = prefs.order || visibleColumns;
        localStorage.setItem(prefKey(userId), JSON.stringify(prefs));
      } catch (e) {
        console.warn("Failed to persist width:", e);
      }
      return updated;
    });

    window.removeEventListener("mousemove", onMouseMoveResize);
    window.removeEventListener("mouseup", onMouseUpResize);
    resizingRef.current = { columnKey: null, startX: 0, startWidth: 0 };
  };

  // ---------- helpers ----------
  const formatCellValue = (cKey, value) => {
    if (!value && value !== 0) return "";
    if (
      cKey === "birthYear" ||
      cKey.endsWith("At") ||
      cKey === "dayStartWork" ||
      cKey === "dayEndWork"
    ) {
      return formatDateSafe(value);
    }
    if (cKey === "licenseImage" || cKey === "licenseImageCCCD") {
      return value;
    }
    return value;
  };

  // ---------- action handlers (add/edit/delete/import/export) ----------
  const handleAdd = () => {
    if (!canEditDriver) return alert("Bạn chưa có quyền thêm lái xe!");
    setEditDriver(null);
    setShowModal(true);
  };

  const handleEdit = (d) => {
    if (!canEditDriver) return alert("Bạn chưa có quyền sửa lái xe!");
    setEditDriver(d);
    setShowModal(true);
  };

  const handleDelete = async (id) => {
    if (!canEditDriver) return alert("Bạn chưa có quyền xóa lái xe!");
    if (!window.confirm("Xác nhận xóa?")) return;
    try {
      await axios.delete(`${apiDrivers}/${id}`, {
        headers: { Authorization: token ? `Bearer ${token}` : undefined },
      });
      setDrivers((prev) => prev.filter((p) => p._id !== id));
    } catch (err) {
      alert("Không xóa được: " + (err.response?.data?.error || err.message));
    }
  };

  const handleSave = (saved) => {
    setDrivers((prev) => {
      const found = prev.find((p) => p._id === saved._id);
      if (found) return prev.map((p) => (p._id === saved._id ? saved : p));
      return [saved, ...prev];
    });
  };

  const handleDeleteAll = async () => {
    if (!canEditDriver) return alert("Bạn chưa có quyền xóa lái xe!");
    if (
      !window.confirm(
        "Xác nhận xóa tất cả lái xe? Hành động này không thể hoàn tác!",
      )
    )
      return;

    try {
      await axios.delete(`${apiDrivers}/all`, {
        headers: { Authorization: token ? `Bearer ${token}` : undefined },
      });
      setDrivers([]); // xóa toàn bộ khỏi UI
      alert("Đã xóa tất cả lái xe thành công!");
    } catch (err) {
      console.error(
        "Xóa tất cả thất bại:",
        err.response?.data?.error || err.message,
      );
      alert("Không thể xóa tất cả lái xe!");
    }
  };

  // import modal logic omitted here for brevity — keep your existing handlers
  const [showImportMode, setShowImportMode] = useState(false);
  const [importMode, setImportMode] = useState("append");
  const importFileRef = fileInputRef;
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleImportConfirm = async () => {
    if (!file) return alert("Vui lòng chọn file Excel!");
    setImporting(true);

    if (isSubmitting) return; // tránh double click ngay tức thì
    setIsSubmitting(true);

    const formData = new FormData();

    formData.append("file", file);
    try {
      const res = await axios.post(
        `${apiDrivers}/import?mode=${importMode}`,
        formData,
        {
          headers: {
            "Content-Type": "multipart/form-data",
            Authorization: token ? `Bearer ${token}` : undefined,
          },
        },
      );

      const added = res.data.imported || 0;
      const updated = res.data.updated || 0;
      alert(`Import xong — Thêm: ${added}, Cập nhật: ${updated}`);
      if (importFileRef.current) importFileRef.current.value = "";
      setFile(null);
      fetch();
    } catch (err) {
      console.error("Lỗi import:", err);
      alert("Không thể import file Excel!");
    } finally {
      setImporting(false);
      setShowImportMode(false);
      setIsSubmitting(false);
      fetch();
    }
  };

  const exportExcel = async () => {
    try {
      const res = await axios.get(
        `${apiDrivers}/export-excel`,
        {
          responseType: "blob", // 🔥 BẮT BUỘC
        },
        {
          headers: { Authorization: token ? `Bearer ${token}` : undefined },
        },
      );

      saveAs(
        new Blob([res.data], {
          type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        }),
        "DANH_SACH_LAI_XE.xlsx",
      );
    } catch (err) {
      console.error("Export drivers lỗi:", err);
      alert(err.response?.data?.message || "Xuất danh sách lái xe thất bại");
    }
  };

  const [warnings, setWarnings] = useState({});
  const toggleWarning = async (driverId) => {
    try {
      const res = await axios.put(
        `${apiDrivers}/warning/${driverId}`,
        {}, // body rỗng
        {
          headers: { Authorization: token ? `Bearer ${token}` : undefined },
        },
      );

      const newWarningState = res.data.warning;

      setWarnings((prev) => ({
        ...prev,
        [driverId]: newWarningState,
      }));
    } catch (err) {
      console.error("Toggle warning failed", err);
      alert("Không cập nhật được cảnh báo!");
    }
  };

  const [selectedRows, setSelectedRows] = useState([]);
  const toggleRowHighlight = (id) => {
    setSelectedRows(
      (prev) =>
        prev.includes(id)
          ? prev.filter((x) => x !== id) // bỏ ra
          : [...prev, id], // thêm vào
    );
  };

  const [showColumnBox, setShowColumnBox] = useState(false);

  // ---------- UI render (giữ nguyên layout của bạn) ----------
  return (
    <div className="p-4 bg-gray-50 min-h-screen text-xs">
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

      <div className="flex justify-between items-center mb-4 mt-2">
        <h1 className="text-xl font-bold">Quản lý Lái xe</h1>
        <div className="flex gap-2 items-center flex-wrap">
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Tìm tên, sđt, cccd..."
            className="border p-2 rounded"
          />
          <button
            onClick={() => fetch(q)}
            className="bg-blue-500 text-white px-3 py-1 rounded"
          >
            Tìm
          </button>
          <button
            onClick={() => {
              setQ("");
              fetch();
            }}
            className="bg-gray-200 px-3 py-1 rounded"
          >
            Reset
          </button>
          <button
            onClick={handleAdd}
            className={`bg-green-500 px-3 py-1 text-white rounded ${
              !canEditDriver ? "opacity-50 cursor-not-allowed" : ""
            }`}
            disabled={!canEditDriver}
          >
            + Thêm
          </button>
          <button
            onClick={exportExcel}
            className="bg-blue-600 px-3 py-1 text-white rounded"
          >
            Xuất Excel
          </button>

          <input
            ref={fileInputRef}
            id="fileExcelInput"
            type="file"
            accept=".xlsx"
            onChange={(e) => setFile(e.target.files[0])}
            className="border p-1 rounded"
          />

          <button
            onClick={() => {
              if (!file) return alert("Vui lòng chọn file Excel!");
              setShowImportMode(true);
            }}
            className={`bg-purple-600 text-white px-3 py-1 rounded ${
              !canEditDriver || importing ? "opacity-50 cursor-not-allowed" : ""
            }`}
            disabled={!canEditDriver || importing}
          >
            {importing ? "Đang import..." : "Import Excel"}
          </button>
        </div>
      </div>

      {/* Choose visible columns UI */}
      <div className="relative mb-3">
        <button
          onClick={() => setShowColumnBox(!showColumnBox)}
          className="px-3 py-1 bg-gray-700 text-white rounded"
        >
          Ẩn/Hiện Cột
        </button>

        {showColumnBox && (
          <div
            className="absolute left-0 mt-2 bg-white border rounded shadow-lg p-3 z-50"
            style={{ width: 260, maxHeight: 300, overflowY: "auto" }}
          >
            <div className="flex justify-between mb-2">
              <strong>Chọn cột hiển thị</strong>
              <button
                className="text-red-500"
                onClick={() => setShowColumnBox(false)}
              >
                ✕
              </button>
            </div>

            {allColumns.map((c) => (
              <label
                key={c.key}
                className="flex items-center gap-2 text-sm py-1 cursor-pointer"
              >
                <input
                  type="checkbox"
                  checked={visibleColumns.includes(c.key)}
                  onChange={() =>
                    setVisibleColumns((prev) =>
                      prev.includes(c.key)
                        ? prev.filter((k) => k !== c.key)
                        : [...prev, c.key],
                    )
                  }
                />
                {c.label}
              </label>
            ))}
          </div>
        )}
      </div>

      {/* Table */}
      {/* Table (REPLACEMENT) */}
      <div
        className="overflow-auto border"
        style={{ maxHeight: "80vh", position: "relative" }} // ensure relative container
      >
        <table
          // removed tailwind border-collapse to avoid collapse seams
          style={{
            tableLayout: "fixed",
            width: "max-content",
            maxWidth: "max-content",
            borderCollapse: "separate", // important: avoid collapse seams
            borderSpacing: 0,
          }}
        >
          <thead className="bg-gray-200">
            <tr>
              {/* Cột cảnh báo (sticky col 0) */}
              <th
                className="border p-1 sticky top-0 bg-gray-200 text-center relative"
                style={{
                  width: 30,
                  zIndex: 40,
                  left: 0,
                  boxSizing: "border-box",
                  background: "#f3f4f6",
                  transform: "translateZ(0)",
                  backgroundClip: "padding-box",
                }}
              />

              {/* Các cột dữ liệu */}
              {visibleColumns.map((cKey, index) => {
                const colMeta = allColumns.find((ac) => ac.key === cKey) || {
                  key: cKey,
                  label: cKey,
                };

                const widthStyle = columnWidths[cKey]
                  ? {
                      width: columnWidths[cKey],
                      minWidth: columnWidths[cKey],
                      maxWidth: columnWidths[cKey],
                    }
                  : {};

                const isFirst = index === 0;
                const isSecond = index === 1;

                // left offset cho sticky
                const leftOffset = isFirst
                  ? 30
                  : isSecond
                    ? 30 + firstColWidth
                    : undefined;

                return (
                  <th
                    key={cKey}
                    data-col={cKey}
                    ref={index === 0 ? firstColRef : null}
                    draggable={!isResizing.current}
                    onDragStart={(e) => {
                      if (!isResizing.current) onDragStart(e, cKey);
                      else e.preventDefault();
                    }}
                    onDragOver={onDragOver}
                    onDrop={(e) => onDrop(e, cKey)}
                    className="border p-0 relative bg-gray-200 select-none"
                    style={{
                      position: "sticky",
                      top: 0,
                      left: leftOffset,
                      zIndex: leftOffset !== undefined ? 40 : 30,
                      background: "#f3f4f6",
                      overflow: "visible",
                      ...widthStyle, // ⭐ FIX QUAN TRỌNG: không gán width = object
                    }}
                  >
                    {/* LABEL */}
                    <div
                      className="p-2 flex items-center justify-center w-full text-center text-xs"
                      style={{ cursor: "pointer", userSelect: "none" }}
                      onClick={(e) => {
                        e.stopPropagation();
                      }}
                    >
                      <span className="truncate">{colMeta.label}</span>
                    </div>

                    {/* RESIZE HANDLE */}
                    <div
                      onMouseDown={(e) => {
                        isResizing.current = true;
                        e.preventDefault();
                        e.stopPropagation();
                        onMouseDownResize(e, cKey);
                      }}
                      onClick={(e) => e.stopPropagation()}
                      onDoubleClick={(e) => e.stopPropagation()}
                      style={{
                        position: "absolute",
                        right: 0,
                        top: 0,
                        bottom: 0,
                        width: 10,
                        cursor: "col-resize",
                        zIndex: 200,
                        userSelect: "none",
                      }}
                    ></div>
                  </th>
                );
              })}

              {/* Cột hành động */}
              <th
                className="border p-1 sticky top-0"
                style={{
                  zIndex: 20,
                  width: 120,
                  boxSizing: "border-box",
                  background: "#f3f4f6",
                  transform: "translateZ(0)",
                  backgroundClip: "padding-box",
                  borderLeft: "1px solid #e5e7eb",
                }}
              >
                Hành động
              </th>
            </tr>
          </thead>

          <tbody>
            {/* Đang load */}
            {loading && (
              <tr>
                <td
                  colSpan={visibleColumns.length + 2}
                  className="p-6 text-center"
                >
                  <div className="flex items-center justify-center gap-3 text-blue-500">
                    <span className="text-3xl animate-pulse">🐈💨</span>
                    <span className="italic">Mèo đang chạy lấy dữ liệu…</span>
                  </div>
                </td>
              </tr>
            )}

            {/* Load xong nhưng rỗng */}
            {!loading && drivers.length === 0 && (
              <tr>
                <td
                  colSpan={visibleColumns.length + 2}
                  className="p-4 text-center text-gray-500"
                >
                  Không có dữ liệu
                </td>
              </tr>
            )}

            {drivers.map((d, idx) => {
              const isWarning = warnings[d._id];

              return (
                <tr
                  key={d._id}
                  onClick={() => toggleRowHighlight(d._id)}
                  className={`cursor-pointer ${
                    isWarning
                      ? "bg-red-300"
                      : idx % 2 === 0
                        ? "bg-white"
                        : "bg-gray-50"
                  } ${selectedRows.includes(d._id) ? "bg-yellow-200" : ""}`}
                  style={{ height: 20 }}
                >
                  {/* Cột cảnh báo (sticky left) */}
                  <td
                    className="border p-1 text-center"
                    style={{
                      position: "sticky",
                      left: 0,
                      zIndex: 20, // body sticky under header but above other cells
                      width: 30,
                      height: 20,
                      lineHeight: "20px", // ⭐ canh giữa theo chiều dọc
                      whiteSpace: "nowrap", // ⭐ không xuống dòng
                      overflow: "hidden", // ⭐ ẩn phần vượt quá
                      textOverflow: "ellipsis", // ⭐ thêm ...
                      boxSizing: "border-box",
                      background: isWarning ? "#fca5a5" : "#fff",
                      transform: "translateZ(0)",
                      WebkitTransform: "translateZ(0)",
                      backgroundClip: "padding-box",
                      borderRight: "1px solid #e5e7eb", // prevents seam
                    }}
                  >
                    <button
                      onClick={() => toggleWarning(d._id)}
                      className={`px-1 py-1 rounded text-white ${
                        isWarning ? "bg-red-600" : "bg-gray-400"
                      }`}
                    >
                      ⚠
                    </button>
                  </td>

                  {visibleColumns.map((cKey, colIndex) => {
                    const dateColumns = [
                      "cccdExpiryAt",
                      "licenseExpiryAt",
                      "dayEndWork",
                    ];

                    let dateStyle = {};
                    if (dateColumns.includes(cKey) && d[cKey]) {
                      const today = new Date();
                      const cellDate = new Date(d[cKey]);

                      if (cellDate <= today) {
                        dateStyle = { color: "red", fontWeight: "bold" };
                      } else {
                        dateStyle = { color: "blue", fontWeight: "bold" };
                      }
                    }

                    const isFirst = colIndex === 0;
                    const isSecond = colIndex === 1;

                    const stickyLeft = isFirst
                      ? 30
                      : isSecond
                        ? 30 + firstColWidth
                        : undefined;

                    const cellWidthStyle = columnWidths[cKey]
                      ? {
                          width: columnWidths[cKey],
                          minWidth: columnWidths[cKey],
                          maxWidth: columnWidths[cKey],
                          boxSizing: "border-box",
                        }
                      : {};

                    return (
                      <td
                        key={cKey}
                        className="border p-1 align-top"
                        style={{
                          position: isFirst || isSecond ? "sticky" : "relative",
                          left: isFirst || isSecond ? stickyLeft : undefined,
                          zIndex: isFirst || isSecond ? 20 : 10,
                          height: 20,
                          lineHeight: "20px", // ⭐ canh giữa theo chiều dọc
                          whiteSpace: "nowrap", // ⭐ không xuống dòng
                          overflow: "hidden", // ⭐ ẩn phần vượt quá
                          textOverflow: "ellipsis", // ⭐ thêm ...
                          background: warnings[d._id]
                            ? "#fca5a5"
                            : selectedRows.includes(d._id)
                              ? "#fde68a"
                              : idx % 2 === 0
                                ? "#ffffff"
                                : "#f9fafb",
                          transform: "translateZ(0)",
                          WebkitTransform: "translateZ(0)",
                          backgroundClip: "padding-box",
                          borderRight:
                            isFirst || isSecond
                              ? "1px solid #e5e7eb"
                              : undefined,
                          ...cellWidthStyle,
                          ...dateStyle,
                        }}
                      >
                        {cKey === "stt" ? (
                          idx + 1
                        ) : cKey === "licenseImage" ||
                          cKey === "licenseImageCCCD" ? (
                          <div className="flex items-center gap-1 flex-wrap">
                            {Array.isArray(d[cKey]) && d[cKey].length > 0 ? (
                              d[cKey].map((url, i) => (
                                <a
                                  key={i}
                                  href={url}
                                  target="_blank"
                                  rel="noreferrer"
                                >
                                  <img
                                    src={url}
                                    alt="img"
                                    className="w-[42px] h-[28px] object-cover rounded border hover:scale-110 transition"
                                  />
                                </a>
                              ))
                            ) : (
                              <span className="text-gray-400 text-xs">—</span>
                            )}
                          </div>
                        ) : (
                          formatCellValue(cKey, d[cKey])
                        )}
                      </td>
                    );
                  })}

                  <td
                    className="border h-[38px]  flex gap-2 justify-center"
                    style={{ minWidth: 120, background: "#fff" }}
                    onClick={(e) => e.stopPropagation()}
                  >
                    {canEditDriver ? (
                      <>
                        <button
                          onClick={() => handleEdit(d)}
                          className="text-blue-600"
                        >
                          Sửa
                        </button>
                        <button
                          onClick={() => handleDelete(d._id)}
                          className="text-red-600"
                        >
                          Xóa
                        </button>
                      </>
                    ) : (
                      <span className="text-gray-400">Không có quyền</span>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <div className="flex justify-end mt-3">
        <button
          onClick={handleDeleteAll}
          className={`px-4 py-2 bg-red-600 text-white rounded shadow hover:bg-red-700 
      ${!canEditDriver ? "opacity-50 cursor-not-allowed" : ""}`}
          disabled={!canEditDriver}
        >
          Xóa tất cả
        </button>
      </div>

      {showModal && (
        <div className="z-[999]" style={{ zIndex: 999 }}>
          <DriverModal
            initialData={editDriver}
            onClose={() => {
              setShowModal(false);
              setEditDriver(null);
            }}
            onSave={handleSave}
            apiBase={apiDrivers}
          />
        </div>
      )}

      {showImportMode && (
        <div className="fixed inset-0 bg-black bg-opacity-40 flex items-center justify-center z-[100]">
          <div className="bg-white rounded p-5 shadow-lg w-80">
            <h2 className="text-lg font-bold mb-3">Chọn chế độ Import</h2>

            <label className="flex items-center gap-2 mb-2">
              <input
                type="radio"
                name="importMode"
                checked={importMode === "append"}
                onChange={() => setImportMode("append")}
              />
              Thêm mới (thêm tất cả, KHÔNG kiểm tra CCCD)
            </label>

            <label className="flex items-center gap-2 mb-4">
              <input
                type="radio"
                name="importMode"
                checked={importMode === "overwrite"}
                onChange={() => setImportMode("overwrite")}
              />
              Ghi đè (cập nhật nếu trùng CCCD)
            </label>

            <div className="flex justify-end gap-2">
              <button
                onClick={() => setShowImportMode(false)}
                className="px-4 py-1 bg-gray-300 rounded"
              >
                Hủy
              </button>
              <button
                onClick={handleImportConfirm}
                disabled={isSubmitting}
                className={`px-4 py-1 text-white rounded 
    ${isSubmitting ? "bg-purple-300 cursor-not-allowed" : "bg-purple-600"}
  `}
              >
                {isSubmitting ? "Đang xử lý..." : "Xác nhận"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
