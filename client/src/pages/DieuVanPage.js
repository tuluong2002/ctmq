import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { format } from "date-fns";
import { FaEdit, FaTrash, FaHistory, FaSearch, FaCopy } from "react-icons/fa";
import RideModal from "../components/RideModal";
import ProfileModal from "../components/ProfileModal";
import RideEditRequestModal from "../components/RideEditRequestModal";
import RideHistoryModal from "../components/RideHistoryModal";
import axios from "axios";
import API from "../api";

const API_URL = `${API}/schedule-admin`;
const USER_API = `${API}/auth/dieu-van`;

const removeVietnamese = (str = "") =>
  str
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/đ/g, "d")
    .replace(/Đ/g, "D");

const normalize = (s = "") =>
  s.toString().normalize("NFC").replace(/\s+/g, " ").trim().toLowerCase();

const mainColumns = [
  { key: "dieuVan", label: "ĐIỀU VẬN PHỤ TRÁCH" },
  { key: "maKH", label: "MÃ KH" },
  { key: "khachHang", label: "KHÁCH HÀNG" },
  { key: "dienGiai", label: "DIỄN GIẢI" },
  { key: "diemXepHang", label: "ĐIỂM ĐÓNG HÀNG" },
  { key: "diemDoHang", label: "ĐIỂM GIAO HÀNG" },
  { key: "diemXepHangNew", label: "ĐIỂM ĐÓNG MỚI" },
  { key: "diemDoHangNew", label: "ĐIỂM GIAO MỚI" },
  { key: "ngayBocHang", label: "NGÀY ĐÓNG HÀNG" },
  { key: "ngayGiaoHang", label: "NGÀY GIAO HÀNG" },
  { key: "KHdiemGiaoHang", label: "KH ĐIỂM GIAO" },
  { key: "bienSoXe", label: "BIỂN SỐ XE" },
  { key: "maChuyen", label: "MÃ CHUYẾN" },
];

const extraColumns = [
  { key: "tenLaiXe", label: "TÊN LÁI XE" },
  { key: "soDiem", label: "SỐ ĐIỂM" },
  { key: "trongLuong", label: "TRỌNG LƯỢNG" },
  { key: "cuocPhi", label: "CƯỚC PHÍ" },
  { key: "laiXeThuCuoc", label: "LÁI XE THU CƯỚC" },
  { key: "bocXep", label: "BỐC XẾP" },
  { key: "ve", label: "VÉ" },
  { key: "hangVe", label: "HÀNG VỀ" },
  { key: "luuCa", label: "LƯU CA" },
  { key: "luatChiPhiKhac", label: "LUẬT CP KHÁC" },
  { key: "keToanPhuTrach", label: "KẾ TOÁN PHỤ TRÁCH" },
  { key: "ghiChu", label: "GHI CHÚ" },
  { key: "gioNhanChuyen", label: "NHẬN CHUYẾN LÚC" },
  { key: "gioHoanThanh", label: "HOÀN THÀNH LÚC" },
];

const COLUMN_CONFIG_KEY = "dieuVan_table_columns_v1";

export default function DieuVanPage({ user, onLogout }) {
  const navigate = useNavigate();
  const token = localStorage.getItem("token");
  const storedUser = JSON.parse(localStorage.getItem("user") || "{}");
  const currentUser = user || storedUser;

  // State quản lý user hiện tại, để live update avatar/tên
  const [currentUserState, setCurrentUserState] = useState(user || storedUser);

  const [today] = useState(new Date());
  const [date, setDate] = useState(new Date());
  const [rides, setRides] = useState([]);
  const [managers, setManagers] = useState([]);
  const [selectedManager, setSelectedManager] = useState(currentUser || "");
  const [showModal, setShowModal] = useState(false);
  const [showProfileModal, setShowProfileModal] = useState(false);
  const [editRide, setEditRide] = useState(null);
  const todayStr = format(new Date(), "yyyy-MM-dd");

  const [filters, setFilters] = useState({
    tenLaiXe: "",
    maChuyen: "",
    khachHang: "",
    ngayBoc: todayStr, // ✅ MẶC ĐỊNH HÔM NAY
  });

  // 🔹 4 danh sách gợi ý
  const [drivers, setDrivers] = useState([]);
  const [customers, setCustomers] = useState([]);
  const [vehicles, setVehicles] = useState([]);
  const [addressSuggestions, setAddressSuggestions] = useState([]);
  const [customers2, setCustomers2] = useState([]);

  // 🔹 Lấy danh sách gợi ý
  useEffect(() => {
    const fetchData = async () => {
      const [driverRes, customerRes, vehicleRes, addressRes, customer2Res] =
        await Promise.all([
          axios.get(`${API}/drivers/names/list`),
          axios.get(`${API}/customers`),
          axios.get(`${API}/vehicles/names/list`),
          axios.get(`${API}/address/all`),
          axios.get(`${API}/customer2/all`),
        ]);
      setDrivers(driverRes.data);
      setCustomers(customerRes.data);
      setVehicles(vehicleRes.data);
      setAddressSuggestions(addressRes.data.data || []);
      setCustomers2(customer2Res.data.data || []);
    };
    fetchData();
  }, []);

  console.log(customers2);

  // 🟢 Lấy danh sách điều vận
  const fetchManagers = async () => {
    try {
      const res = await axios.get(USER_API, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setManagers(res.data);
    } catch (err) {
      console.error(
        "Lỗi lấy danh sách điều vận:",
        err.response?.data || err.message,
      );
    }
  };

  useEffect(() => {
    fetchManagers();
  }, []);

  const [page, setPage] = useState(1);
  const [limit] = useState(150);
  const [totalPages, setTotalPages] = useState(1);

  const [warnings, setWarnings] = useState({});

  // 🔹 Lấy tất cả chuyến (có filter)
  const fetchRides = async () => {
    try {
      const q = new URLSearchParams();
      q.append("page", page);
      q.append("limit", limit);

      // 🔥 EXCEL FILTER – DÙNG excelSelected
      if (excelSelected.khachHang.length > 0) {
        excelSelected.khachHang.forEach((v) => q.append("khachHang", v));
      }

      if (excelSelected.tenLaiXe.length > 0) {
        excelSelected.tenLaiXe.forEach((v) => q.append("tenLaiXe", v));
      }

      if (excelSelected.bienSoXe.length > 0) {
        excelSelected.bienSoXe.forEach((v) => q.append("bienSoXe", v));
      }

      if (excelSelected.dienGiai.length > 0) {
        excelSelected.dienGiai.forEach((v) => q.append("dienGiai", v));
      }

      if (excelSelected.cuocPhi.length > 0) {
        excelSelected.cuocPhi.forEach((v) => q.append("cuocPhi", v));
      }
      Object.entries(filters).forEach(([key, value]) => {
        if (value !== "" && value !== null && value !== undefined) {
          q.append(key, value);
        }
      });

      const res = await axios.get(`${API_URL}/dieuvan?${q.toString()}`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      setRides(res.data.data || []);
      setTotalPages(res.data.totalPages || 1);

      const w = {};
      res.data.data.forEach((d) => {
        if (d.warning === true) w[d._id] = true;
      });
      setWarnings(w);
    } catch (err) {
      console.error(
        "Lỗi khi lấy tất cả chuyến:",
        err.response?.data || err.message,
      );
      setRides([]);
    }
  };

  const [openFilter, setOpenFilter] = useState(null);

  const [searchKH, setSearchKH] = useState("");
  const [searchDriver, setSearchDriver] = useState("");
  const [searchPlate, setSearchPlate] = useState("");
  const [searchDGiai, setSearchDGiai] = useState("");
  const [searchCuocPhiBD, setSearchCuocPhiBD] = useState("");

  const [moneyFilter, setMoneyFilter] = useState({});

  // 🔒 DANH SÁCH GỐC – LƯU CỨNG
  const [excelOptions, setExcelOptions] = useState({
    khachHang: [],
    tenLaiXe: [],
    bienSoXe: [],
    dienGiai: [],
    cuocPhi: [],
  });

  // ✅ DANH SÁCH ĐƯỢC CHỌN
  const [excelSelected, setExcelSelected] = useState({
    khachHang: [],
    tenLaiXe: [],
    bienSoXe: [],
    dienGiai: [],
    cuocPhi: [],
  });
  useEffect(() => {
    fetchRides();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    filters,
    excelSelected.khachHang.join("|"),
    excelSelected.tenLaiXe.join("|"),
    excelSelected.bienSoXe.join("|"),
    excelSelected.dienGiai.join("|"),
    excelSelected.cuocPhi.join("|"),
    JSON.stringify(moneyFilter),
    date,
    page,
  ]);
  useEffect(() => {
    axios
      .get(`${API_URL}/accountant/filter-all`, {
        headers: { Authorization: `Bearer ${token}` },
      })
      .then((res) => setExcelOptions(res.data))
      .catch(console.error);
  }, []);

  useEffect(() => {
    const close = (e) => {
      const th = e.target.closest("th[data-col]");
      if (!th) setOpenFilter(null);
    };
    document.addEventListener("mousedown", close);
    return () => document.removeEventListener("mousedown", close);
  }, []);

  const [filterPos, setFilterPos] = useState({ x: 0, y: 0 });
  const getColumnLabel = (key) => {
    return allColumns.find((c) => c.key === key)?.label || key;
  };

  // 🧹 Xoá lọc
  const clearFilters = () => {
    // Xóa các filter to
    setExcelSelected({
      khachHang: [],
      tenLaiXe: [],
      bienSoXe: [],
      dienGiai: [],
      cuocPhi: [],
    });

    // Reset ngày
    setDate(new Date());

    // Xóa toàn bộ filter theo từng cột
    setColumnFilters({});

    // Đóng filter cột đang mở
    setActiveFilterCol(null);

    // Fetch lại danh sách sạch hoàn toàn
    fetchRides();
  };

  const emptyForm = {
    dieuVanID: currentUser._id,
    dieuVan: currentUser.fullname,
    createdByID: currentUser._id,
    createdBy: currentUser.fullname,
    tenLaiXe: "",
    khachHang: "",
    dienGiai: "",
    ngayBocHang: format(date, "yyyy-MM-dd"),
    ngayGiaoHang: format(date, "yyyy-MM-dd"),
    diemXepHang: "",
    diemDoHang: "",
    diemXepHangNew: "",
    diemDoHangNew: "",
    soDiem: "",
    trongLuong: "",
    bienSoXe: "",
    cuocPhi: "",
    laiXeThuCuoc: "",
    bocXep: "",
    ve: "",
    hangVe: "",
    luuCa: "",
    luatChiPhiKhac: "",
    ghiChu: "",
    //maChuyen: "",
    ngayBoc: format(date, "yyyy-MM-dd"),
    keToanPhuTrach: "",
    accountUsername: "",
    KHdiemGiaoHang: "",
  };

  const COPY_FIELDS = [
    "tenLaiXe",
    "khachHang",
    "maKH",
    "dienGiai",
    "ngayBocHang",
    "ngayGiaoHang",

    "diemXepHang",
    "diemDoHang",
    "diemXepHangNew",
    "diemDoHangNew",

    "soDiem",
    "trongLuong",
    "bienSoXe",

    "cuocPhi",
    "laiXeThuCuoc",
    "bocXep",
    "ve",
    "hangVe",
    "luuCa",
    "luatChiPhiKhac",

    "ghiChu",
    "keToanPhuTrach",
    "accountUsername",
    "KHdiemGiaoHang",
  ];

  const [rideDraft, setRideDraft] = useState(null);

  const handleAdd = () => {
    setEditRide(null);
    setShowModal(true);
  };

  const buildCopyFromRide = (ride) => {
    const result = {};

    COPY_FIELDS.forEach((key) => {
      if (ride[key] != null) {
        result[key] = ride[key];
      }
    });

    return result;
  };

  const handleCopyRide = (ride) => {
    const copied = {
      // ✅ base form sạch
      ...emptyForm,

      // ✅ chỉ copy field cho phép
      ...buildCopyFromRide(ride),

      // ✅ format ngày cho input
      ngayBocHang: ride.ngayBocHang
        ? format(new Date(ride.ngayBocHang), "yyyy-MM-dd")
        : emptyForm.ngayBocHang,

      ngayGiaoHang: ride.ngayGiaoHang
        ? format(new Date(ride.ngayGiaoHang), "yyyy-MM-dd")
        : emptyForm.ngayGiaoHang,

      // ❌ KHÔNG copy hệ thống
      _id: undefined,
      maChuyen: undefined,
      ngayBoc: undefined,

      // ✅ gán người tạo mới
      createdByID: currentUser._id,
      createdBy: currentUser.fullname,
      dieuVanID: currentUser._id,
      dieuVan: currentUser.fullname,
    };

    setRideDraft(copied);
    setEditRide(null);
    setShowModal(true);
  };

  const [showEditRequestModal, setShowEditRequestModal] = useState(false);
  const [editRequestRide, setEditRequestRide] = useState(null);

  // Khi bấm chỉnh sửa chuyến → mở modal yêu cầu chỉnh sửa
  const handleEdit = (ride) => {
    setEditRequestRide(ride); // gán chuyến cần chỉnh sửa
    setShowEditRequestModal(true); // mở modal
  };

  const handleSave = async (payload) => {
    try {
      if (editRide) {
        const res = await axios.put(`${API_URL}`, payload, {
          headers: { Authorization: `Bearer ${token}` },
        });
        setRides((prev) =>
          prev.map((r) => (r._id === editRide ? res.data : r)),
        );
      } else {
        const res = await axios.post(API_URL, payload, {
          headers: { Authorization: `Bearer ${token}` },
        });
        setRides((prev) => [...prev, res.data]);
        fetchRides();
      }
      setShowModal(false);
    } catch (err) {
      alert("Không lưu được: " + err.response?.data?.error);
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm("Bạn có chắc muốn xoá chuyến này?")) return;
    try {
      await axios.delete(`${API_URL}/${id}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setRides((prev) => prev.filter((r) => r._id !== id));
    } catch (err) {
      alert("Không xoá được: " + err.response?.data?.error);
    }
  };

  const formatDate = (val) => (val ? format(new Date(val), "dd/MM/yyyy") : "");

  // Lịch sử chỉnh sửa
  const [rideHistory, setRideHistory] = useState([]); // dữ liệu lịch sử của chuyến
  const [showHistoryModal, setShowHistoryModal] = useState(false); // hiển thị modal
  const [historyRide, setHistoryRide] = useState(null); // chuyến đang xem
  const [editCounts, setEditCounts] = useState({}); // { rideID: số lần chỉnh sửa }

  const fetchEditCounts = async () => {
    try {
      const counts = {};
      await Promise.all(
        rides.map(async (r) => {
          const res = await axios.get(`${API_URL}/history-count/${r._id}`, {
            headers: { Authorization: `Bearer ${token}` },
          });
          counts[r._id] = res.data.editCount;
        }),
      );
      setEditCounts(counts);
    } catch (err) {
      console.error(
        "Lỗi lấy số lần chỉnh sửa:",
        err.response?.data || err.message,
      );
    }
  };

  // Gọi sau khi fetchRides xong
  useEffect(() => {
    if (rides.length) fetchEditCounts();
  }, [rides]);

  const handleViewHistory = async (ride) => {
    try {
      const res = await axios.get(`${API_URL}/history/${ride._id}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setRideHistory(res.data);
      setHistoryRide(ride);
      setShowHistoryModal(true);
    } catch (err) {
      alert(
        "Không lấy được lịch sử: " + (err.response?.data?.error || err.message),
      );
    }
  };

  // Thêm state quản lý chiều rộng cột
  const allColumns = [...mainColumns, ...extraColumns];

  const defaultVisibleColumns = allColumns.reduce(
    (acc, col) => ({ ...acc, [col.key]: true }),
    {},
  );

  const [visibleColumns, setVisibleColumns] = useState(() => {
    const saved = localStorage.getItem(COLUMN_CONFIG_KEY);
    if (!saved) return defaultVisibleColumns;
    try {
      return JSON.parse(saved).visibleColumns || defaultVisibleColumns;
    } catch {
      return defaultVisibleColumns;
    }
  });

  const [columnWidths, setColumnWidths] = useState(() => {
    const saved = localStorage.getItem(COLUMN_CONFIG_KEY);
    if (!saved)
      return allColumns.reduce((acc, col) => ({ ...acc, [col.key]: 150 }), {});
    try {
      return JSON.parse(saved).columnWidths;
    } catch {
      return {};
    }
  });

  const [columnOrder, setColumnOrder] = useState(() => {
    const saved = localStorage.getItem(COLUMN_CONFIG_KEY);
    if (!saved) return allColumns.map((col) => col.key);
    try {
      return JSON.parse(saved).columnOrder;
    } catch {
      return allColumns.map((col) => col.key);
    }
  });

  // Load config
  useEffect(() => {
    localStorage.setItem(
      COLUMN_CONFIG_KEY,
      JSON.stringify({
        columnOrder,
        columnWidths,
        visibleColumns,
      }),
    );
  }, [columnOrder, columnWidths, visibleColumns]);

  // Hàm kéo cột
  const handleResizeStart = (e, key) => {
    e.preventDefault();
    const startX = e.clientX;
    const startWidth = columnWidths[key];

    const onMouseMove = (ev) => {
      setColumnWidths((prev) => ({
        ...prev,
        [key]: Math.max(10, startWidth + (ev.clientX - startX)),
      }));
    };

    const onMouseUp = () => {
      document.body.style.cursor = "";
      document.removeEventListener("mousemove", onMouseMove);
      document.removeEventListener("mouseup", onMouseUp);
    };

    document.addEventListener("mousemove", onMouseMove);
    document.addEventListener("mouseup", onMouseUp);
    document.body.style.cursor = "col-resize";
  };

  const handleColumnDrag = (startIndex, endIndex) => {
    const newOrder = [...columnOrder];
    const [moved] = newOrder.splice(startIndex, 1);
    newOrder.splice(endIndex, 0, moved);
    setColumnOrder(newOrder);
  };

  const [openColumnMenu, setOpenColumnMenu] = useState(false);

  const formatMoney = (value) => {
    if (value === undefined || value === null || value === "") return "";
    const num = Number(value);
    if (isNaN(num)) return value;
    return num.toLocaleString("vi-VN"); // 👉 Tự động thành 100.000 – 1.200.000
  };

  const [columnFilters, setColumnFilters] = useState({});
  const [activeFilterCol, setActiveFilterCol] = useState(null);

  const dateColumns = ["ngayBoc", "ngayBocHang", "ngayGiaoHang"];
  const moneyColumns = [
    "cuocPhi",
    "laiXeThuCuoc",
    "bocXep",
    "ve",
    "hangVe",
    "luuCa",
    "luatChiPhiKhac",
  ];

  const filterRef = useRef(null);
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (filterRef.current && !filterRef.current.contains(e.target)) {
        setActiveFilterCol(null);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  return (
    <div className="p-4 bg-gray-50 min-h-screen text-xs">
      {/* Header */}
      <div className="flex justify-between items-center mb-4">
        <h1 className="text-xl font-bold">QUẢN LÝ ĐIỀU CHUYẾN XE</h1>
        <div className="flex gap-4 items-center">
          <img
            src={currentUserState.avatar}
            alt="avatar"
            className="w-10 h-10 rounded-full object-cover"
          />
          <span>{currentUserState?.fullname || currentUserState.username}</span>
          <button
            onClick={() => setShowProfileModal(true)}
            className="bg-yellow-400 rounded-full border"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              fill="none"
              viewBox="0 0 24 24"
              strokeWidth={1.5}
              stroke="currentColor"
              className="size-6"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M17.982 18.725A7.488 7.488 0 0 0 12 15.75a7.488 7.488 0 0 0-5.982 2.975m11.963 0a9 9 0 1 0-11.963 0m11.963 0A8.966 8.966 0 0 1 12 21a8.966 8.966 0 0 1-5.982-2.275M15 9.75a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z"
              />
            </svg>
          </button>

          <span className="font-semibold text-blue-600">
            Ngày: {format(today, "dd/MM/yyyy")}
          </span>
          <button
            onClick={onLogout || (() => navigate("/login"))}
            className="bg-gray-300 px-3 py-1 rounded"
          >
            Đăng xuất
          </button>
        </div>
      </div>

      {/* Chọn điều vận */}
      <div className="flex gap-2 mb-4 flex-wrap">
        <button
          onClick={() => navigate("/tonghop")}
          className="ml-auto bg-gray-300 px-3 py-1 rounded"
        >
          Tổng hợp
        </button>
      </div>

      {/* Thêm / Hiển thị thêm */}
      <div className="flex gap-3 mb-4">
        <div className="flex items-center gap-2">
          <span className="font-semibold">Ngày nhập:</span>
          <input
            type="date"
            value={filters.ngayBoc}
            onChange={(e) =>
              setFilters((f) => ({
                ...f,
                ngayBoc: e.target.value,
              }))
            }
            className="border px-2 py-1 rounded text-xs"
          />
        </div>

        <button
          onClick={handleAdd}
          className="bg-blue-500 text-white px-4 py-2 rounded"
        >
          Thêm chuyến
        </button>
      </div>

      <div className="relative inline-block flex justify-between mb-2">
        <button
          onClick={() => setOpenColumnMenu(!openColumnMenu)}
          className="bg-green-600 text-white px-3 py-2 rounded"
        >
          Tuỳ chọn cột
        </button>

        {openColumnMenu && (
          <div className="absolute left-0 mt-8 w-64 bg-white shadow-lg border rounded p-2 z-50">
            <div className="max-h-72 overflow-y-auto grid grid-cols-1 gap-1">
              {allColumns.map((col) => (
                <label
                  key={col.key}
                  className="flex items-center gap-2 px-2 py-1 hover:bg-gray-100 rounded cursor-pointer"
                >
                  <input
                    type="checkbox"
                    checked={!!visibleColumns[col.key]}
                    onChange={() =>
                      setVisibleColumns((prev) => ({
                        ...prev,
                        [col.key]: !prev[col.key], // toggle boolean
                      }))
                    }
                  />

                  <span className="text-sx">{col.label}</span>
                </label>
              ))}
            </div>
          </div>
        )}
        <button
          onClick={clearFilters}
          className="bg-gray-400 text-white rounded px-3 py-1"
        >
          Xoá lọc
        </button>
      </div>

      {/* Container scroll cả ngang và dọc */}
      <div className="border rounded shadow-lg h-[600px] overflow-auto">
        <table
          className="border-separate border-spacing-0 border w-max text-xs"
          style={{ tableLayout: "auto" }}
        >
          <thead className="bg-blue-600 text-white sticky top-0 z-20">
            <tr>
              <th
                className="border p-2 bg-blue-600 text-white select-none"
                style={{ width: 90 }}
              >
                Hành động
              </th>
              {columnOrder.map((key, index) => {
                const col = allColumns.find((c) => c.key === key);
                if (!col) return null;
                if (visibleColumns[key] === false) return null;

                return (
                  <th
                    key={col.key}
                    draggable
                    onDragStart={(e) => {
                      if (
                        e.target.closest &&
                        e.target.closest("[data-resize='true']")
                      )
                        return;
                      e.dataTransfer.setData("colIndex", index);
                    }}
                    onDragOver={(e) => e.preventDefault()}
                    onDrop={(e) => {
                      const start = Number(e.dataTransfer.getData("colIndex"));
                      handleColumnDrag(start, index);
                    }}
                    onClick={(e) => {
                      e.stopPropagation();
                      const rect = e.currentTarget.getBoundingClientRect();
                      setFilterPos({
                        x: rect.left,
                        y: rect.bottom,
                      });
                      setOpenFilter(col.key);
                    }}
                    style={{
                      width: columnWidths[col.key],
                      minWidth: 30,
                      maxWidth: columnWidths[col.key], // ⭐ QUAN TRỌNG
                      textAlign: "center",
                    }}
                    className="border p-2 relative select-none overflow-hidden"
                  >
                    {/* TIÊU ĐỀ + ICON KÍNH LÚP */}
                    <div className="flex items-start justify-center gap-1 relative">
                      <div
                        className="w-full"
                        style={{
                          display: "-webkit-box",
                          WebkitBoxOrient: "vertical",
                          WebkitLineClamp: 2,
                          overflow: "hidden",
                          textOverflow: "ellipsis",
                          lineHeight: "1.2",
                          fontSize: "12px",
                          whiteSpace: "normal",
                        }}
                      >
                        {col.label}
                      </div>

                      {/* ICON KÍNH LÚP */}
                      <FaSearch
                        className={`text-[10px] mt-[2px] cursor-pointer ${
                          columnFilters[col.key]
                            ? "text-yellow-300"
                            : "text-white/70"
                        }`}
                        title="Tìm kiếm theo cột"
                        onClick={(e) => {
                          e.stopPropagation();
                          const rect = e.currentTarget.getBoundingClientRect();
                          setFilterPos({
                            x: rect.left,
                            y: rect.bottom,
                          });
                          setOpenFilter(col.key);
                        }}
                      />
                    </div>

                    {/* Ô FILTER */}
                    {openFilter && (
                      <div
                        className="fixed bg-white border rounded shadow p-2 z-[9999] text-black text-xs"
                        style={{
                          top: filterPos.y,
                          left: filterPos.x,
                          width: 240,
                        }}
                        onClick={(e) => e.stopPropagation()}
                        onMouseDown={(e) => e.stopPropagation()}
                      >
                        {/* ===== FILTER KHÁCH HÀNG ===== */}
                        {openFilter === "khachHang" && (
                          <>
                            <input
                              className="border w-full px-2 py-1 mb-1"
                              placeholder="Tìm nhanh..."
                              value={searchKH}
                              onChange={(e) => setSearchKH(e.target.value)}
                            />

                            <label className="flex gap-1 items-center mb-1">
                              <input
                                type="checkbox"
                                checked={
                                  excelSelected.khachHang.length ===
                                    excelOptions.khachHang.length &&
                                  excelOptions.khachHang.length > 0
                                }
                                onChange={() => {
                                  setExcelSelected((p) => ({
                                    ...p,
                                    khachHang:
                                      p.khachHang.length ===
                                      excelOptions.khachHang.length
                                        ? []
                                        : excelOptions.khachHang,
                                  }));
                                  setPage(1);
                                }}
                              />
                              Chọn tất cả
                            </label>

                            <div className="max-h-40 overflow-y-auto border p-1">
                              {excelOptions.khachHang
                                .filter((c) => {
                                  if (!searchKH) return true;
                                  return normalize(c).includes(
                                    normalize(searchKH),
                                  );
                                })

                                .map((c) => (
                                  <label
                                    key={c}
                                    className="flex gap-1 items-center"
                                  >
                                    <input
                                      type="checkbox"
                                      checked={excelSelected.khachHang.includes(
                                        c,
                                      )}
                                      onChange={() =>
                                        setExcelSelected((p) => ({
                                          ...p,
                                          khachHang: p.khachHang.includes(c)
                                            ? p.khachHang.filter((x) => x !== c)
                                            : [...p.khachHang, c],
                                        }))
                                      }
                                    />
                                    <span className="truncate">{c}</span>
                                  </label>
                                ))}
                            </div>

                            <div className="flex gap-1 mt-2">
                              <button
                                className="flex-1 bg-blue-600 text-white px-2 py-1 rounded"
                                onClick={() => {
                                  setPage(1);
                                  setOpenFilter(null);
                                }}
                              >
                                Áp dụng
                              </button>

                              <button
                                className="flex-1 bg-gray-200 px-2 py-1 rounded"
                                onClick={() => {
                                  setExcelSelected((p) => ({
                                    ...p,
                                    khachHang: [],
                                  }));
                                  setPage(1);
                                  setOpenFilter(null);
                                }}
                              >
                                Xóa
                              </button>
                            </div>
                          </>
                        )}

                        {/* ===== FILTER LÁI XE ===== */}
                        {openFilter === "tenLaiXe" && (
                          <>
                            <input
                              className="border w-full px-2 py-1 mb-1"
                              placeholder="Tìm nhanh..."
                              value={searchDriver}
                              onChange={(e) => setSearchDriver(e.target.value)}
                            />

                            <label className="flex gap-1 items-center mb-1">
                              <input
                                type="checkbox"
                                checked={
                                  excelSelected.tenLaiXe.length ===
                                    excelOptions.tenLaiXe.length &&
                                  excelOptions.tenLaiXe.length > 0
                                }
                                onChange={() => {
                                  setExcelSelected((p) => ({
                                    ...p,
                                    tenLaiXe:
                                      p.tenLaiXe.length ===
                                      excelOptions.tenLaiXe.length
                                        ? []
                                        : excelOptions.tenLaiXe,
                                  }));
                                  setPage(1);
                                }}
                              />
                              Chọn tất cả
                            </label>

                            <div className="max-h-40 overflow-y-auto border p-1">
                              {excelOptions.tenLaiXe
                                .filter((d) => {
                                  if (!searchDriver) return true;
                                  return normalize(d).includes(
                                    normalize(searchDriver),
                                  );
                                })

                                .map((d) => (
                                  <label
                                    key={d}
                                    className="flex gap-1 items-center"
                                  >
                                    <input
                                      type="checkbox"
                                      checked={excelSelected.tenLaiXe.includes(
                                        d,
                                      )}
                                      onChange={() =>
                                        setExcelSelected((p) => ({
                                          ...p,
                                          tenLaiXe: p.tenLaiXe.includes(d)
                                            ? p.tenLaiXe.filter((x) => x !== d)
                                            : [...p.tenLaiXe, d],
                                        }))
                                      }
                                    />
                                    <span className="truncate">{d}</span>
                                  </label>
                                ))}
                            </div>

                            <div className="flex gap-1 mt-2">
                              <button
                                className="flex-1 bg-blue-600 text-white px-2 py-1 rounded"
                                onClick={() => {
                                  setPage(1);
                                  setOpenFilter(null);
                                }}
                              >
                                Áp dụng
                              </button>

                              <button
                                className="flex-1 bg-gray-200 px-2 py-1 rounded"
                                onClick={() => {
                                  setExcelSelected((p) => ({
                                    ...p,
                                    tenLaiXe: [],
                                  }));
                                  setPage(1);
                                  setOpenFilter(null);
                                }}
                              >
                                Xóa
                              </button>
                            </div>
                          </>
                        )}

                        {/* ===== FILTER BIỂN SỐ XE ===== */}
                        {openFilter === "bienSoXe" && (
                          <>
                            <input
                              className="border w-full px-2 py-1 mb-1"
                              placeholder="Tìm nhanh..."
                              value={searchPlate}
                              onChange={(e) => setSearchPlate(e.target.value)}
                            />

                            <label className="flex gap-1 items-center mb-1">
                              <input
                                type="checkbox"
                                checked={
                                  excelSelected.bienSoXe.length ===
                                    excelOptions.bienSoXe.length &&
                                  excelOptions.bienSoXe.length > 0
                                }
                                onChange={() => {
                                  setExcelSelected((p) => ({
                                    ...p,
                                    bienSoXe:
                                      p.bienSoXe.length ===
                                      excelOptions.bienSoXe.length
                                        ? []
                                        : excelOptions.bienSoXe,
                                  }));
                                  setPage(1);
                                }}
                              />
                              Chọn tất cả
                            </label>

                            <div className="max-h-40 overflow-y-auto border p-1">
                              {excelOptions.bienSoXe
                                .filter((p) => {
                                  if (!searchPlate) return true;
                                  return normalize(p).includes(
                                    normalize(searchPlate),
                                  );
                                })

                                .map((p) => (
                                  <label
                                    key={p}
                                    className="flex gap-1 items-center"
                                  >
                                    <input
                                      type="checkbox"
                                      checked={excelSelected.bienSoXe.includes(
                                        p,
                                      )}
                                      onChange={() =>
                                        setExcelSelected((s) => ({
                                          ...s,
                                          bienSoXe: s.bienSoXe.includes(p)
                                            ? s.bienSoXe.filter((x) => x !== p)
                                            : [...s.bienSoXe, p],
                                        }))
                                      }
                                    />
                                    <span className="truncate">{p}</span>
                                  </label>
                                ))}
                            </div>

                            <div className="flex gap-1 mt-2">
                              <button
                                className="flex-1 bg-blue-600 text-white px-2 py-1 rounded"
                                onClick={() => {
                                  setPage(1);
                                  setOpenFilter(null);
                                }}
                              >
                                Áp dụng
                              </button>

                              <button
                                className="flex-1 bg-gray-200 px-2 py-1 rounded"
                                onClick={() => {
                                  setExcelSelected((p) => ({
                                    ...p,
                                    bienSoXe: [],
                                  }));
                                  setPage(1);
                                  setOpenFilter(null);
                                }}
                              >
                                Xóa
                              </button>
                            </div>
                          </>
                        )}

                        {/* ===== FILTER DIỄN GIẢI ===== */}
                        {openFilter === "dienGiai" && (
                          <>
                            <input
                              className="border w-full px-2 py-1 mb-1"
                              placeholder="Tìm nhanh..."
                              value={searchDGiai}
                              onChange={(e) => setSearchDGiai(e.target.value)}
                            />

                            <label className="flex gap-1 items-center mb-1">
                              <input
                                type="checkbox"
                                checked={
                                  excelSelected.dienGiai.length ===
                                    excelOptions.dienGiai.length &&
                                  excelOptions.dienGiai.length > 0
                                }
                                onChange={() => {
                                  setExcelSelected((prev) => ({
                                    ...prev,
                                    dienGiai:
                                      prev.dienGiai.length ===
                                      excelOptions.dienGiai.length
                                        ? []
                                        : excelOptions.dienGiai,
                                  }));
                                  setPage(1);
                                }}
                              />
                              Chọn tất cả
                            </label>

                            <div className="max-h-40 overflow-y-auto border p-1">
                              {excelOptions.dienGiai
                                .filter((dg) => {
                                  if (!searchDGiai) return true;
                                  return normalize(dg).includes(
                                    normalize(searchDGiai),
                                  );
                                })
                                .map((dg) => (
                                  <label
                                    key={dg}
                                    className="flex gap-1 items-center"
                                  >
                                    <input
                                      type="checkbox"
                                      checked={excelSelected.dienGiai.includes(
                                        dg,
                                      )}
                                      onChange={() =>
                                        setExcelSelected((prev) => ({
                                          ...prev,
                                          dienGiai: prev.dienGiai.includes(dg)
                                            ? prev.dienGiai.filter(
                                                (x) => x !== dg,
                                              )
                                            : [...prev.dienGiai, dg],
                                        }))
                                      }
                                    />
                                    <span className="truncate">{dg}</span>
                                  </label>
                                ))}
                            </div>

                            <div className="flex gap-1 mt-2">
                              <button
                                className="flex-1 bg-blue-600 text-white px-2 py-1 rounded"
                                onClick={() => {
                                  setPage(1);
                                  setOpenFilter(null);
                                }}
                              >
                                Áp dụng
                              </button>

                              <button
                                className="flex-1 bg-gray-200 px-2 py-1 rounded"
                                onClick={() => {
                                  setExcelSelected((prev) => ({
                                    ...prev,
                                    dienGiai: [],
                                  }));
                                  setPage(1);
                                  setOpenFilter(null);
                                }}
                              >
                                Xóa
                              </button>
                            </div>
                          </>
                        )}

                        {/* ===== FILTER CƯỚC PHÍ (STRING) ===== */}
                        {openFilter === "cuocPhi" && (
                          <>
                            <input
                              className="border w-full px-2 py-1 mb-1"
                              placeholder="Tìm nhanh..."
                              value={searchCuocPhiBD}
                              onChange={(e) =>
                                setSearchCuocPhiBD(e.target.value)
                              }
                            />

                            <label className="flex gap-1 items-center mb-1">
                              <input
                                type="checkbox"
                                checked={
                                  excelSelected.cuocPhi.length ===
                                    excelOptions.cuocPhi.length &&
                                  excelOptions.cuocPhi.length > 0
                                }
                                onChange={() => {
                                  setExcelSelected((prev) => ({
                                    ...prev,
                                    cuocPhi:
                                      prev.cuocPhi.length ===
                                      excelOptions.cuocPhi.length
                                        ? []
                                        : excelOptions.cuocPhi,
                                  }));
                                  setPage(1);
                                }}
                              />
                              Chọn tất cả
                            </label>

                            <div className="max-h-40 overflow-y-auto border p-1">
                              {excelOptions.cuocPhi
                                .filter((cp) => {
                                  if (!searchCuocPhiBD) return true;
                                  return normalize(cp).includes(
                                    normalize(searchCuocPhiBD),
                                  );
                                })
                                .map((cp) => (
                                  <label
                                    key={cp}
                                    className="flex gap-1 items-center"
                                  >
                                    <input
                                      type="checkbox"
                                      checked={excelSelected.cuocPhi.includes(
                                        cp,
                                      )}
                                      onChange={() =>
                                        setExcelSelected((prev) => ({
                                          ...prev,
                                          cuocPhi: prev.cuocPhi.includes(cp)
                                            ? prev.cuocPhi.filter(
                                                (x) => x !== cp,
                                              )
                                            : [...prev.cuocPhi, cp],
                                        }))
                                      }
                                    />
                                    <span className="truncate">
                                      {formatMoney(cp)}
                                    </span>
                                  </label>
                                ))}
                            </div>

                            <div className="flex gap-1 mt-2">
                              <button
                                className="flex-1 bg-blue-600 text-white px-2 py-1 rounded"
                                onClick={() => {
                                  setPage(1);
                                  setOpenFilter(null);
                                }}
                              >
                                Áp dụng
                              </button>

                              <button
                                className="flex-1 bg-gray-200 px-2 py-1 rounded"
                                onClick={() => {
                                  setExcelSelected((prev) => ({
                                    ...prev,
                                    cuocPhi: [],
                                  }));
                                  setPage(1);
                                  setOpenFilter(null);
                                }}
                              >
                                Xóa
                              </button>
                            </div>
                          </>
                        )}

                        {/* ===== FILTER CÁC CỘT CÒN LẠI (TEXT / DATE) ===== */}
                        {![
                          "khachHang",
                          "tenLaiXe",
                          "bienSoXe",
                          "dienGiai",
                          "cuocPhi",
                        ].includes(openFilter) &&
                          !moneyColumns.includes(openFilter) && (
                            <>
                              {[
                                "ngayBoc",
                                "ngayBocHang",
                                "ngayGiaoHang",
                              ].includes(openFilter) ? (
                                <input
                                  type="date"
                                  className="w-full border px-2 py-1 rounded text-black"
                                  value={filters[openFilter] || ""}
                                  onChange={(e) =>
                                    setFilters((p) => ({
                                      ...p,
                                      [openFilter]: e.target.value,
                                    }))
                                  }
                                />
                              ) : (
                                <input
                                  type="text"
                                  className="w-full border px-2 py-1 rounded text-black"
                                  placeholder={`Lọc theo ${getColumnLabel(
                                    openFilter,
                                  )}`}
                                  value={filters[openFilter] || ""}
                                  onChange={(e) =>
                                    setFilters((p) => ({
                                      ...p,
                                      [openFilter]: e.target.value,
                                    }))
                                  }
                                />
                              )}

                              <div className="flex gap-1 mt-2">
                                <button
                                  className="flex-1 bg-blue-600 text-white px-2 py-1 rounded"
                                  onClick={() => {
                                    setPage(1);
                                    setOpenFilter(null);
                                  }}
                                >
                                  Áp dụng
                                </button>

                                <button
                                  className="flex-1 bg-gray-200 px-2 py-1 rounded"
                                  onClick={() =>
                                    setFilters((p) => ({
                                      ...p,
                                      [openFilter]: "",
                                    }))
                                  }
                                >
                                  Xóa
                                </button>
                              </div>
                            </>
                          )}

                        {/* ===== FILTER TIỀN ===== */}
                        {moneyColumns.includes(openFilter) && (
                          <>
                            <div className="font-semibold mb-1">
                              {getColumnLabel(openFilter)}
                            </div>

                            <label className="flex items-center gap-1 mb-1">
                              <input
                                type="checkbox"
                                checked={
                                  moneyFilter[openFilter]?.empty || false
                                }
                                onChange={() =>
                                  setMoneyFilter((p) => {
                                    const isChecked = p[openFilter]?.empty;

                                    return {
                                      ...p,
                                      [openFilter]: isChecked
                                        ? {} // bỏ chọn
                                        : { empty: true, filled: false }, // chọn empty => tắt filled
                                    };
                                  })
                                }
                              />
                              Chưa nhập
                            </label>

                            <label className="flex items-center gap-1">
                              <input
                                type="checkbox"
                                checked={
                                  moneyFilter[openFilter]?.filled || false
                                }
                                onChange={() =>
                                  setMoneyFilter((p) => {
                                    const isChecked = p[openFilter]?.filled;

                                    return {
                                      ...p,
                                      [openFilter]: isChecked
                                        ? {} // bỏ chọn
                                        : { filled: true, empty: false }, // chọn filled => tắt empty
                                    };
                                  })
                                }
                              />
                              Đã nhập
                            </label>

                            <div className="flex gap-1 mt-2">
                              <button
                                className="flex-1 bg-blue-600 text-white px-2 py-1 rounded"
                                onClick={() => {
                                  setPage(1);
                                  setOpenFilter(null);
                                }}
                              >
                                Áp dụng
                              </button>

                              <button
                                className="flex-1 bg-gray-200 px-2 py-1 rounded"
                                onClick={() => {
                                  setMoneyFilter((p) => {
                                    const c = { ...p };
                                    delete c[openFilter];
                                    return c;
                                  });
                                  setPage(1);
                                  setOpenFilter(null);
                                }}
                              >
                                Xóa
                              </button>
                            </div>

                            <hr className="my-2" />
                          </>
                        )}
                      </div>
                    )}

                    {/* Thanh kéo resize */}
                    <div
                      data-resize="true"
                      onMouseDown={(e) => {
                        e.stopPropagation();
                        handleResizeStart(e, col.key);
                      }}
                      className="absolute top-0 right-0 h-full cursor-col-resize z-20"
                      style={{ width: "8px", background: "transparent" }}
                      onMouseEnter={(e) =>
                        (e.currentTarget.style.background = "#d1d5db")
                      }
                      onMouseLeave={(e) =>
                        (e.currentTarget.style.background = "transparent")
                      }
                    />
                  </th>
                );
              })}
            </tr>
          </thead>
          <tbody className="bg-white">
            {rides
              .filter((r) => {
                if (filters.ngayBoc) {
                  const rowDate = r.ngayBoc
                    ? format(new Date(r.ngayBoc), "yyyy-MM-dd")
                    : "";
                  if (rowDate !== filters.ngayBoc) return false;
                }
                // Lọc khách hàng không dấu giữ nguyên
                if (filters.khachHang?.trim()) {
                  const kw = removeVietnamese(filters.khachHang.toLowerCase());
                  const name = removeVietnamese(
                    (r.khachHang || "").toLowerCase(),
                  );
                  if (!name.includes(kw)) return false;
                }

                // Lọc từng cột
                for (const key in columnFilters) {
                  const f = columnFilters[key]?.trim();
                  if (!f) continue;

                  const raw = r[key];

                  // 🔹 Lọc NGÀY
                  if (dateColumns.includes(key)) {
                    const formatted = raw
                      ? format(new Date(raw), "yyyy-MM-dd")
                      : "";
                    if (formatted !== f) return false;
                    continue;
                  }

                  // 🔹 Lọc SỐ TIỀN
                  if (moneyColumns.includes(key)) {
                    const rawNum = (raw || "").toString().replace(/\./g, "");
                    const fNum = f.replace(/\./g, "");
                    if (!rawNum.includes(fNum)) return false;
                    continue;
                  }

                  // 🔹 Lọc TEXT có bỏ dấu
                  const field = removeVietnamese(
                    (raw || "").toString().toLowerCase(),
                  );
                  const filterText = removeVietnamese(f.toLowerCase());

                  if (!field.includes(filterText)) return false;
                }

                return true;
              })

              .map((r) => (
                <tr key={r._id} className="text-center" style={{ height: 30 }}>
                  <td className="border p-2" style={{ height: 30, width: 90 }}>
                    {/* Hành động */}
                    <div className="flex justify-center items-center gap-2">
                      <button
                        onClick={() => handleEdit(r)}
                        className="text-blue-500 flex items-center justify-center w-4 h-4 rounded hover:bg-blue-100"
                      >
                        <FaEdit />
                      </button>
                      <button
                        onClick={() => handleDelete(r._id)}
                        className="text-red-500 flex items-center justify-center w-4 h-4 rounded hover:bg-red-100"
                      >
                        <FaTrash />
                      </button>
                      <div
                        onClick={() =>
                          editCounts[r._id] > 0 && handleViewHistory(r)
                        }
                        className="relative cursor-pointer w-4 h-4 flex items-center justify-center rounded hover:bg-green-100"
                      >
                        {editCounts[r._id] > 0 ? (
                          <>
                            <FaHistory className="text-green-600 w-5 h-5" />
                            <span className="absolute -top-1 -right-1 bg-red-500 text-white text-[10px] w-3 h-3 flex items-center justify-center rounded-full">
                              {editCounts[r._id]}
                            </span>
                          </>
                        ) : (
                          <span className="text-gray-400">-</span>
                        )}
                      </div>
                      <button
                        onClick={() => handleCopyRide(r)}
                        className="text-gray-500 flex items-center justify-center w-4 h-4 rounded hover:bg-red-100"
                      >
                        <FaCopy />
                      </button>
                    </div>
                  </td>
                  {columnOrder.map((key) => {
                    if (visibleColumns[key] === false) return null;
                    const col = allColumns.find((c) => c.key === key);
                    if (!col) return null;

                    const raw = [
                      "ngayBocHang",
                      "ngayGiaoHang",
                      "ngayBoc",
                    ].includes(col.key)
                      ? formatDate(r[col.key])
                      : // 🕒 format giờ
                        ["gioNhanChuyen", "gioHoanThanh"].includes(col.key)
                        ? r[col.key]
                          ? format(new Date(r[col.key]), "HH:mm, dd/MM/yyyy")
                          : ""
                        : [
                              "cuocPhi",
                              "laiXeThuCuoc",
                              "bocXep",
                              "ve",
                              "hangVe",
                              "luuCa",
                              "luatChiPhiKhac",
                              "cuocPhiBoSung",
                            ].includes(col.key)
                          ? formatMoney(r[col.key])
                          : r[col.key];

                    return (
                      <td
                        className="border px-2 py-1 whitespace-nowrap overflow-hidden text-ellipsis"
                        style={{
                          width: columnWidths[col.key],
                          maxWidth: columnWidths[col.key],
                        }}
                      >
                        {col.key === "gioNhanChuyen" ? (
                          raw ? (
                            <span className="bg-yellow-200 text-black px-2 py-1 rounded font-semibold">
                              {raw}
                            </span>
                          ) : (
                            ""
                          )
                        ) : col.key === "gioHoanThanh" ? (
                          r.gioHoanThanh ? (
                            <span className="bg-green-300 text-black px-2 py-1 rounded font-semibold">
                              {raw}
                            </span>
                          ) : !r.gioNhanChuyen ? (
                            <span
                              className="text-gray-400 cursor-not-allowed"
                              title="Chưa nhận chuyến nên không thể hoàn thành"
                            >
                              -
                            </span>
                          ) : (
                            <button
                              onClick={async () => {
                                try {
                                  await axios.put(
                                    `${API_URL}/complete/${r._id}`,
                                    {},
                                    {
                                      headers: {
                                        Authorization: `Bearer ${token}`,
                                      },
                                    },
                                  );

                                  fetchRides();
                                } catch (err) {
                                  alert(
                                    err.response?.data?.error ||
                                      "Không thể hoàn thành chuyến",
                                  );
                                }
                              }}
                              className="bg-green-300 text-black px-2 py-1 rounded font-bold hover:bg-green-600"
                              title="Xác nhận hoàn thành chuyến"
                            >
                              Xác nhận
                            </button>
                          )
                        ) : (
                          (raw ?? "")
                        )}
                      </td>
                    );
                  })}
                </tr>
              ))}
          </tbody>
        </table>
      </div>

      <div className="flex justify-center items-center gap-3 mt-4">
        {/* Trang trước */}
        <button
          disabled={page <= 1}
          onClick={() => setPage(page - 1)}
          className="px-3 py-1 bg-gray-200 rounded disabled:opacity-50"
        >
          ← Trang trước
        </button>

        {/* Hiển thị số trang */}
        <span className="font-semibold">
          {page} / {totalPages}
        </span>

        {/* Nhập số trang muốn tới */}
        <select
          value={page}
          onChange={(e) => setPage(Number(e.target.value))}
          className="border p-1 rounded"
        >
          {Array.from({ length: totalPages }, (_, i) => i + 1).map((p) => (
            <option key={p} value={p}>
              {p}
            </option>
          ))}
        </select>

        {/* Trang sau */}
        <button
          disabled={page >= totalPages}
          onClick={() => setPage(page + 1)}
          className="px-3 py-1 bg-gray-200 rounded disabled:opacity-50"
        >
          Trang sau →
        </button>
      </div>

      {/* Modal */}
      {/* Modal thêm chuyến */}
      {showModal && !editRide && (
        <RideModal
          key="new"
          initialData={rideDraft || emptyForm}
          onClose={() => setShowModal(false)}
          onSave={handleSave}
          dieuVanList={managers}
          currentUser={currentUser}
          drivers={drivers}
          customers={customers}
          vehicles={vehicles}
          addresses={addressSuggestions} // thêm địa chỉ gợi ý
          customers2={customers2}
        />
      )}

      {showProfileModal && (
        <ProfileModal
          user={currentUserState}
          onClose={() => setShowProfileModal(false)}
          onUpdate={(updatedUser) => {
            localStorage.setItem("user", JSON.stringify(updatedUser));
            setCurrentUserState(updatedUser); // 🔄 live update avatar + tên
          }}
        />
      )}

      {/* Modal yêu cầu chỉnh sửa */}
      {showEditRequestModal && editRequestRide && (
        <RideEditRequestModal
          ride={editRequestRide} // chuyến cần chỉnh sửa
          currentUser={currentUser}
          dieuVanList={managers}
          drivers={drivers}
          customers={customers}
          vehicles={vehicles}
          addresses={addressSuggestions} // thêm địa chỉ gợi ý
          customers2={customers2}
          onClose={() => {
            setShowEditRequestModal(false);
            setEditRequestRide(null);
          }}
          onSubmitEdit={async (payload) => {
            try {
              const token = localStorage.getItem("token");
              await axios.post(`${API_URL}/edit-request`, payload, {
                headers: { Authorization: `Bearer ${token}` },
              });
              alert("Chuyến đã được chỉnh sửa và lưu lịch sử!");
              setShowEditRequestModal(false);
              setEditRequestRide(null);
              fetchRides(selectedManager, filters, date); // reload danh sách
            } catch (err) {
              alert(
                "Không lưu được chuyến: " +
                  (err.response?.data?.error || err.message),
              );
            }
          }}
        />
      )}
      {showHistoryModal && historyRide && (
        <RideHistoryModal
          ride={historyRide}
          historyData={rideHistory}
          onClose={() => setShowHistoryModal(false)}
          role={currentUser.role}
        />
      )}
    </div>
  );
}
