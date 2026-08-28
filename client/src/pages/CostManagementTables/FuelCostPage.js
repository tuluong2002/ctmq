import { useEffect, useState, useRef } from "react";
import axios from "axios";
import VehicleProfitFuelModal from "../../components/CostModal/VehicleProfitFuelModal";
import API from "../../api";

export default function FuelCostPage() {
  const [source, setSource] = useState("vinh-khuc");
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(false);

  const [importing, setImporting] = useState(false);
  const [importTotal, setImportTotal] = useState(0);
  const [importDone, setImportDone] = useState(0);

  const [importFile, setImportFile] = useState(null);
  const fileInputRef = useRef(null);

  /* ================= FILTER ================= */
  const getCurrentMonth = () => {
    const now = new Date();

    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, "0");

    return `${year}-${month}`;
  };

  const [monthFilter, setMonthFilter] = useState(getCurrentMonth());
  const [vehicleFilter, setVehicleFilter] = useState([]);
  const [vehicleFilterOptions, setVehicleFilterOptions] = useState([]);
  const [vehicleFilterSearch, setVehicleFilterSearch] = useState("");
  const [showVehicleFilterDropdown, setShowVehicleFilterDropdown] =
    useState(false);

  /* ================= VEHICLE PROFIT ================= */
  const [showVehicleProfitModal, setShowVehicleProfitModal] = useState(false);

  const [updatingVehicleProfit, setUpdatingVehicleProfit] = useState(false);

  const [dropdownPos, setDropdownPos] = useState({
    top: 0,
    left: 0,
  });

  const token = localStorage.getItem("token");

  const baseUrl =
    source === "vinh-khuc"
      ? `${API}/fuel-vinh-khuc`
      : source === "ngoc-long"
        ? `${API}/fuel-ngoc-long`
        : `${API}/fuel-dau-ngoai`;

  /* ================= LẤY DANH SÁCH SỐ XE ================= */
  const fetchVehicleFilterOptions = async () => {
    try {
      const url = `${baseUrl}/fuel-vehicle`;

      const res = await axios.get(url, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      const options = res.data || [];

      setVehicleFilterOptions(options);

      // Mặc định chọn tất cả
      setVehicleFilter(options);
    } catch (err) {
      console.error(err);
      setVehicleFilterOptions([]);
      setVehicleFilter([]);
    }
  };

  /* ================= LOAD LẦN ĐẦU / ĐỔI SOURCE ================= */
  useEffect(() => {
    fetchVehicleFilterOptions();
  }, [source]);

  /* ================= FETCH DATA ================= */
  const fetchData = async () => {
    setLoading(true);

    try {
      const res = await axios.get(baseUrl, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      let fetchedData = res.data || [];

      /* ================= LỌC THÁNG ================= */
      if (monthFilter) {
        fetchedData = fetchedData.filter((r) => {
          if (!r.dateFull) return false;

          const rMonth = new Date(r.dateFull).toISOString().slice(0, 7);

          return rMonth === monthFilter;
        });
      }

      /* ================= LỌC SỐ XE ================= */
      if (vehicleFilter && vehicleFilter.length > 0) {
        fetchedData = fetchedData.filter((r) => {
          if (source === "vinh-khuc" || source === "dau-ngoai") {
            return vehicleFilter.includes(r.vehicleNo);
          }

          if (source === "ngoc-long") {
            return vehicleFilter.includes(r.vehiclePlate);
          }

          return true;
        });
      } else {
        // Không chọn xe nào => không hiển thị dòng
        fetchedData = [];
      }

      setData(fetchedData);
    } catch (err) {
      console.error(err);
      setData([]);
    } finally {
      setLoading(false);
    }
  };

  /* ================= FETCH KHI THAY ĐỔI FILTER ================= */
  useEffect(() => {
    fetchData();

    setImporting(false);
    setImportTotal(0);
    setImportDone(0);
  }, [source, monthFilter, vehicleFilter]);

  /* ================= CẬP NHẬT CHI PHÍ NHIÊN LIỆU ================= */
  const handleUpdateVehicleProfitFuel = async () => {
    if (!monthFilter) {
      alert("Vui lòng chọn tháng");
      return;
    }

    const [year, month] = monthFilter.split("-");

    const maLoiNhuan = `LN.${Number(month)}.${year}`;

    const confirmUpdate = window.confirm(
      `Bạn có chắc muốn cập nhật chi phí nhiên liệu cho ${maLoiNhuan}?`,
    );

    if (!confirmUpdate) return;

    try {
      setUpdatingVehicleProfit(true);

      const res = await axios.post(
        `${API}/fuel-vinh-khuc/update-vehicle-profit-fuel`,
        {
          month: monthFilter,
        },
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        },
      );

      alert(
        res.data?.message || `Đã cập nhật chi phí nhiên liệu ${maLoiNhuan}`,
      );
    } catch (err) {
      console.error(err);

      alert(
        err.response?.data?.message || "Cập nhật chi phí nhiên liệu thất bại",
      );
    } finally {
      setUpdatingVehicleProfit(false);
    }
  };

  /* ================= IMPORT ================= */
  const handleSelectFile = (e) => {
    const file = e.target.files[0];

    if (!file) return;

    setImportFile(file);
  };

  const handleImport = async () => {
    if (!importFile) {
      alert("Chưa chọn file");
      return;
    }

    const formData = new FormData();

    formData.append("file", importFile);

    setImporting(true);
    setImportTotal(0);
    setImportDone(0);

    try {
      const res = await axios.post(`${baseUrl}/import`, formData, {
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "multipart/form-data",
        },
      });

      setImportTotal(res.data.totalValid || 0);
      setImportDone(res.data.inserted || 0);

      await fetchData();
      await fetchVehicleFilterOptions();
    } catch (err) {
      console.error(err);

      alert(err.response?.data?.message || "Import dữ liệu thất bại");
    } finally {
      setImporting(false);
      setImportFile(null);

      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }

      setTimeout(() => {
        setImportTotal(0);
        setImportDone(0);
      }, 2000);
    }
  };

  /* ================= SỬA DATA KHÔNG KHỚP ================= */

  const [editingData, setEditingData] = useState(null);
  const [editForm, setEditForm] = useState({});
  const [savingEdit, setSavingEdit] = useState(false);

  const handleOpenEdit = (row) => {
    setEditingData(row);

    // Copy toàn bộ dữ liệu của dòng
    // bỏ các field hệ thống không cho sửa
    const form = { ...row };

    delete form._id;
    delete form.__v;
    delete form.createdAt;
    delete form.updatedAt;
    delete form.isDontMatchCP;

    setEditForm(form);
  };

  const handleChangeEdit = (field, value) => {
    setEditForm((prev) => ({
      ...prev,
      [field]: value,
    }));
  };

  const handleSaveEdit = async () => {
    if (!editingData?._id) return;

    try {
      setSavingEdit(true);

      await axios.put(`${baseUrl}/${editingData._id}`, editForm, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      alert("Đã sửa dữ liệu");

      setEditingData(null);
      setEditForm({});

      await fetchData();
      await fetchVehicleFilterOptions();
    } catch (err) {
      console.error(err);

      alert(err.response?.data?.message || "Sửa dữ liệu thất bại");
    } finally {
      setSavingEdit(false);
    }
  };

  /* ================= KIỂU INPUT KHI SỬA ================= */

  const numericEditFields = [
    "day",
    "amount",
    "liter",
    "fuelPrice",
    "cumulativeMechanical1",
    "cumulativeMechanical2",
    "checkElectronic1",
    "checkElectronic2",
    "internalFuelPrice",
    "fuelRemaining",
  ];

  const dateEditFields = ["dateFull"];

  const getEditFieldLabel = (field) => {
    const labels = {
      dateFull: "Ngày Tháng Năm",
      day: "Ngày",

      vehicleNo: "Số xe",
      vehiclePlate: "Biển số xe",
      vehicleCode: "Mã xe",

      amount: "Số tiền",
      liter: "Số lít",

      fuelPrice: "Giá dầu",
      note: "Ghi chú",

      mayDo: "Máy đổ",

      cumulativeMechanical1: "Số điện tử máy 1",
      cumulativeMechanical2: "Số điện tử máy 2",

      checkElectronic1: "Check số điện tử máy 1",
      checkElectronic2: "Check số điện tử máy 2",

      internalFuelPrice: "Giá dầu Nội bộ đã gồm VAT",
      fuelRemaining: "Tồn dầu",

      infoVehicle: "Thông tin xe",
      placeFuel: "Nơi đổ",
    };

    return labels[field] || field;
  };

  const getEditInputType = (field) => {
    if (dateEditFields.includes(field)) {
      return "date";
    }

    if (numericEditFields.includes(field)) {
      return "number";
    }

    return "text";
  };

  const getEditInputValue = (field, value) => {
    if (dateEditFields.includes(field)) {
      if (!value) return "";

      const date = new Date(value);

      if (Number.isNaN(date.getTime())) {
        return "";
      }

      return date.toISOString().slice(0, 10);
    }

    return value ?? "";
  };

  /* ================= XOÁ THEO THÁNG ================= */
  const handleDeleteAll = async () => {
    if (!monthFilter) {
      alert("Vui lòng chọn tháng cần xóa");
      return;
    }

    const [year, month] = monthFilter.split("-");

    const confirmDelete = window.confirm(
      `Bạn có chắc muốn xóa toàn bộ dữ liệu tháng ${month}/${year}?`,
    );

    if (!confirmDelete) {
      return;
    }

    try {
      await axios.delete(`${baseUrl}/remove-by-month-year`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
        data: {
          month: Number(month),
          year: Number(year),
        },
      });

      await fetchData();
      await fetchVehicleFilterOptions();

      alert(`Đã xóa dữ liệu tháng ${month}/${year}`);
    } catch (err) {
      console.error(err);

      alert(
        err.response?.data?.message ||
          `Xóa dữ liệu tháng ${month}/${year} thất bại`,
      );
    }
  };

  /* ================= TOGGLE XE ================= */
  const handleToggleVehicle = (vehicle) => {
    if (vehicleFilter.includes(vehicle)) {
      setVehicleFilter(vehicleFilter.filter((x) => x !== vehicle));
    } else {
      setVehicleFilter([...vehicleFilter, vehicle]);
    }
  };

  /* ================= CHỌN TẤT CẢ ================= */
  const handleToggleAllVehicles = (checked) => {
    if (checked) {
      setVehicleFilter([...vehicleFilterOptions]);
    } else {
      setVehicleFilter([]);
    }
  };

  /* ================= DROPDOWN FILTER ================= */
  const renderVehicleFilterDropdown = (title) => {
    return (
      <div className="flex flex-col relative">
        <span
          className="cursor-pointer"
          onClick={(e) => {
            const rect = e.currentTarget.getBoundingClientRect();

            setDropdownPos({
              top: rect.bottom,
              left: rect.left,
            });

            setShowVehicleFilterDropdown(!showVehicleFilterDropdown);
          }}
        >
          {title}
        </span>

        {showVehicleFilterDropdown && (
          <div
            className="fixed z-[999] w-48 border rounded bg-white text-black p-2 shadow-lg"
            style={{
              top: `${dropdownPos.top}px`,
              left: `${dropdownPos.left}px`,
            }}
          >
            {/* TÌM SỐ XE */}
            <input
              type="text"
              placeholder="Tìm số xe..."
              className="w-full border rounded px-1 mb-1"
              value={vehicleFilterSearch}
              onChange={(e) => setVehicleFilterSearch(e.target.value)}
            />

            {/* CHỌN TẤT CẢ */}
            <label className="flex items-center gap-1 mb-1">
              <input
                type="checkbox"
                checked={
                  vehicleFilterOptions.length > 0 &&
                  vehicleFilter.length === vehicleFilterOptions.length
                }
                onChange={(e) => handleToggleAllVehicles(e.target.checked)}
              />

              <span>Chọn tất cả</span>
            </label>

            {/* DANH SÁCH XE */}
            <div className="max-h-40 overflow-auto">
              {vehicleFilterOptions
                .filter((v) =>
                  String(v)
                    .toLowerCase()
                    .includes(vehicleFilterSearch.toLowerCase()),
                )
                .map((v) => (
                  <label key={v} className="flex items-center gap-1">
                    <input
                      type="checkbox"
                      checked={vehicleFilter.includes(v)}
                      onChange={() => handleToggleVehicle(v)}
                    />

                    <span>{v}</span>
                  </label>
                ))}
            </div>
          </div>
        )}
      </div>
    );
  };

  /* ================= TABLE VINH KHÚC ================= */
  const renderVinhKhuc = () => {
    const totalRows = data.length;

    const totalMoney = data.reduce((sum, r) => sum + Number(r.amount || 0), 0);

    return (
      <>
        {/* SUMMARY */}
        <div className="flex justify-between items-center mb-2 text-sm">
          <div>
            Tổng số dòng: <b>{totalRows}</b>
          </div>

          <div>
            Tổng tiền:{" "}
            <b className="text-red-600">{totalMoney.toLocaleString("vi-VN")}</b>{" "}
            VNĐ
          </div>
        </div>

        {/* TABLE */}
        <div className="border rounded-lg overflow-auto max-h-[70vh] shadow-sm">
          <table className="w-full text-xs border-separate border-spacing-0">
            <thead className="sticky top-0 z-20 bg-blue-600">
              <tr>
                {[
                  "Ngày Tháng Năm",
                  "Ngày",
                  "Số Xe",
                  "Mã xe",
                  "Số tiền",
                  "Số lít",
                  "Giá dầu",
                  "Ghi chú",
                  "Thông tin xe",
                  "Nơi đổ",
                ].map((h) => (
                  <th
                    key={h}
                    className="border bg-blue-600 px-2 py-2 font-semibold text-white whitespace-nowrap relative"
                  >
                    {h === "Số Xe" ? renderVehicleFilterDropdown(h) : h}
                  </th>
                ))}
              </tr>
            </thead>

            <tbody>
              {data.map((r) => {
                const isDontMatch = r.isDontMatchCP === true;

                return (
                  <tr
                    key={r._id}
                    className={`even:bg-gray-50 hover:bg-blue-50 ${
                      isDontMatch ? "text-red-600" : ""
                    }`}
                  >
                    {/* NGÀY */}
                    <td className="border px-1 text-center whitespace-nowrap">
                      <div className="relative flex items-center justify-center">
                        <span>
                          {r.dateFull &&
                            new Date(r.dateFull).toLocaleDateString("vi-VN")}
                        </span>

                        {r.isDontMatchCP && (
                          <button
                            onClick={() => handleEdit(r)}
                            className="absolute right-full mr-[-30px] bg-blue-400 hover:bg-yellow-600 text-white px-1.5 py-0.25 rounded text-[10px]"
                          >
                            Sửa
                          </button>
                        )}
                      </div>
                    </td>

                    <td className="border px-2 text-center">{r.day}</td>

                    <td className="border px-2">{r.vehicleNo}</td>

                    <td className="border px-2">{r.vehicleCode}</td>

                    <td className="border px-2 text-right">
                      {Number(r.amount || 0).toLocaleString("vi-VN")}
                    </td>

                    <td className="border px-2 text-right">
                      {Number(r.liter || 0).toLocaleString("vi-VN")}
                    </td>

                    <td className="border px-2 text-right">
                      {Number(r.fuelPrice || 0).toLocaleString("vi-VN")}
                    </td>

                    <td className="border px-2">{r.note}</td>

                    <td className="border px-2">{r.infoVehicle}</td>

                    <td className="border px-2">{r.placeFuel}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </>
    );
  };

  /* ================= TABLE NGỌC LONG ================= */
  const renderNgocLong = () => {
    const totalRows = data.length;

    const totalMoney = data.reduce((sum, r) => sum + Number(r.amount || 0), 0);

    return (
      <>
        {/* SUMMARY */}
        <div className="flex justify-between items-center mb-2 text-sm">
          <div>
            Tổng số dòng: <b>{totalRows}</b>
          </div>

          <div>
            Tổng tiền:{" "}
            <b className="text-red-600">{totalMoney.toLocaleString("vi-VN")}</b>{" "}
            VNĐ
          </div>
        </div>

        {/* TABLE */}
        <div className="border rounded-lg overflow-auto max-h-[70vh] shadow-sm">
          <table className="w-full text-xs border-separate border-spacing-0">
            <thead className="sticky top-0 z-20 bg-blue-600">
              <tr>
                {[
                  "Ngày Tháng năm",
                  "Ngày",
                  "Biển số xe",
                  "Mã xe",
                  "Số tiền",
                  "Số lít",
                  "Máy đổ",
                  "Số điện tử máy 1",
                  "Số điện tử máy 2",
                  "Check số điện tử máy 1",
                  "Check số điện tử máy 2",
                  "Giá dầu Nội bộ đã gồm VAT",
                  "Tồn dầu",
                  "Thông tin xe",
                  "Nơi đổ",
                ].map((h) => (
                  <th
                    key={h}
                    className="border bg-blue-600 px-2 py-2 font-semibold text-white whitespace-nowrap relative"
                  >
                    {h === "Biển số xe" ? renderVehicleFilterDropdown(h) : h}
                  </th>
                ))}
              </tr>
            </thead>

            <tbody>
              {data.map((r) => {
                const isDontMatch = r.isDontMatchCP === true;

                return (
                  <tr
                    key={r._id}
                    className={`even:bg-gray-50 hover:bg-blue-50 ${
                      isDontMatch ? "text-red-600" : ""
                    }`}
                  >
                    {/* NGÀY */}
                    <td className="border px-1 text-center whitespace-nowrap">
                      <div className="relative flex items-center justify-center">
                        <span>
                          {r.dateFull &&
                            new Date(r.dateFull).toLocaleDateString("vi-VN")}
                        </span>

                        {r.isDontMatchCP && (
                          <button
                            onClick={() => handleEdit(r)}
                            className="absolute right-full mr-[-30px] bg-blue-400 hover:bg-yellow-600 text-white px-1.5 py-0.25 rounded text-[10px]"
                          >
                            Sửa
                          </button>
                        )}
                      </div>
                    </td>

                    <td className="border px-2 text-center">{r.day}</td>

                    <td className="border px-2">{r.vehiclePlate}</td>

                    <td className="border px-2">{r.vehicleCode}</td>

                    <td className="border px-2 text-right">
                      {Number(r.amount || 0).toLocaleString("vi-VN")}
                    </td>

                    <td className="border px-2 text-right">
                      {Number(r.liter || 0).toLocaleString("vi-VN")}
                    </td>

                    <td className="border px-2">{r.mayDo}</td>

                    <td className="border px-2 text-right">
                      {Number(r.cumulativeMechanical1 || 0).toLocaleString(
                        "vi-VN",
                      )}
                    </td>

                    <td className="border px-2 text-right">
                      {Number(r.cumulativeMechanical2 || 0).toLocaleString(
                        "vi-VN",
                      )}
                    </td>

                    <td className="border px-2 text-right">
                      {Number(r.checkElectronic1 || 0).toLocaleString("vi-VN")}
                    </td>

                    <td className="border px-2 text-right">
                      {Number(r.checkElectronic2 || 0).toLocaleString("vi-VN")}
                    </td>

                    <td className="border px-2 text-right">
                      {Number(r.internalFuelPrice || 0).toLocaleString("vi-VN")}
                    </td>

                    <td className="border px-2 text-right">
                      {Number(r.fuelRemaining || 0).toLocaleString("vi-VN")}
                    </td>

                    <td className="border px-2">{r.infoVehicle}</td>

                    <td className="border px-2">{r.placeFuel}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </>
    );
  };

  /* ================= TOOLBAR ================= */
  const Toolbar = () => (
    <div className="flex gap-3 mb-3 items-center">
      {/* FILTER THÁNG */}
      <div className="flex items-center gap-2">
        <label className="text-sm">Tháng:</label>

        <input
          type="month"
          value={monthFilter}
          onChange={(e) => setMonthFilter(e.target.value)}
          className="border py-1 text-xs"
        />
      </div>

      {/* FILE INPUT */}
      <input
        type="file"
        ref={fileInputRef}
        onChange={handleSelectFile}
        className="hidden"
      />

      <button
        onClick={() => fileInputRef.current?.click()}
        className="border px-3 py-1 bg-gray-100"
      >
        {importFile ? "Đã chọn file" : "Chọn file"}
      </button>

      {importFile && (
        <span className="text-xs text-gray-600">{importFile.name}</span>
      )}

      {/* IMPORT */}
      <button
        onClick={handleImport}
        disabled={!importFile || importing}
        className="bg-blue-600 text-white px-2 py-1 disabled:opacity-50"
      >
        Import
      </button>

      <button
        onClick={handleDeleteAll}
        disabled={!monthFilter}
        className="bg-red-500 text-white px-2 py-1 disabled:opacity-50"
      >
        Xóa theo tháng
      </button>

      {importing && <span className="text-blue-600 text-sm">Đang nhập...</span>}

      {!importing && importTotal > 0 && (
        <span className="text-green-700 text-xs">
          Đã nhập {importDone}/{importTotal} dòng hợp lệ
        </span>
      )}

      {/* CẬP NHẬT CHI PHÍ */}
      <button
        onClick={handleUpdateVehicleProfitFuel}
        disabled={!monthFilter || updatingVehicleProfit}
        className="bg-green-600 text-white px-3 py-1 disabled:opacity-50"
      >
        {updatingVehicleProfit ? "Đang cập nhật..." : "Cập nhật chi phí"}
      </button>

      {/* XEM DANH SÁCH */}
      <button
        onClick={() => setShowVehicleProfitModal(true)}
        disabled={!monthFilter}
        className="bg-purple-600 text-white px-3 py-1 disabled:opacity-50"
      >
        Xem chi phí
      </button>
    </div>
  );

  /* ================= RENDER ================= */
  return (
    <div className="p-4">
      {/* SOURCE */}
      <div className="flex gap-6 mb-4">
        <label>
          <input
            type="radio"
            checked={source === "vinh-khuc"}
            onChange={() => setSource("vinh-khuc")}
          />{" "}
          Vĩnh Khúc
        </label>

        <label>
          <input
            type="radio"
            checked={source === "ngoc-long"}
            onChange={() => setSource("ngoc-long")}
          />{" "}
          Ngọc Long
        </label>

        <label>
          <input
            type="radio"
            checked={source === "dau-ngoai"}
            onChange={() => setSource("dau-ngoai")}
          />{" "}
          Đổ dầu ngoài
        </label>
      </div>

      <Toolbar />

      {loading && <p>Đang tải...</p>}

      {source === "vinh-khuc" || source === "dau-ngoai"
        ? renderVinhKhuc()
        : renderNgocLong()}

      {showVehicleProfitModal && (
        <VehicleProfitFuelModal
          month={monthFilter}
          onClose={() => setShowVehicleProfitModal(false)}
        />
      )}

      {/* ================= MODAL SỬA DATA ================= */}

      {editingData && (
        <div className="fixed inset-0 z-[9999] bg-black/40 flex items-center justify-center p-4">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-3xl max-h-[90vh] flex flex-col">
            {/* ================= HEADER ================= */}

            <div className="flex justify-between items-center px-4 py-3 border-b">
              <h2 className="font-semibold text-lg">Sửa dữ liệu nhiên liệu</h2>

              <button
                type="button"
                onClick={() => {
                  setEditingData(null);
                  setEditForm({});
                }}
                className="text-gray-500 hover:text-red-600 text-2xl"
              >
                ×
              </button>
            </div>

            {/* ================= BODY ================= */}

            <div className="p-4 overflow-y-auto">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {Object.keys(editForm).map((field) => {
                  const type = getEditInputType(field);

                  const value = getEditInputValue(field, editForm[field]);

                  return (
                    <div key={field} className="flex flex-col">
                      <label className="text-xs font-semibold mb-1">
                        {getEditFieldLabel(field)}
                      </label>

                      <input
                        type={type}
                        value={value}
                        onChange={(e) => {
                          let newValue = e.target.value;

                          if (numericEditFields.includes(field)) {
                            newValue = newValue === "" ? "" : Number(newValue);
                          }

                          handleChangeEdit(field, newValue);
                        }}
                        className="border rounded px-2 py-1.5 text-sm focus:outline-none focus:ring-1 focus:ring-blue-500"
                      />
                    </div>
                  );
                })}
              </div>

              {/* ================= TRẠNG THÁI ================= */}

              <div className="mt-4 p-2 bg-red-50 border border-red-200 rounded text-xs">
                <span className="font-semibold">Trạng thái hiện tại:</span>{" "}
                <span className="text-red-600 font-semibold">
                  Không khớp chi phí
                </span>
                <div className="mt-1 text-gray-500">
                  Sau khi sửa biển số, hãy bấm <b>Cập nhật chi phí</b> để hệ
                  thống tính lại và tự xác định trạng thái khớp/không khớp.
                </div>
              </div>
            </div>

            {/* ================= FOOTER ================= */}

            <div className="flex justify-end gap-2 px-4 py-3 border-t">
              <button
                type="button"
                onClick={() => {
                  setEditingData(null);
                  setEditForm({});
                }}
                disabled={savingEdit}
                className="border px-4 py-1.5 rounded text-sm"
              >
                Hủy
              </button>

              <button
                type="button"
                onClick={handleSaveEdit}
                disabled={savingEdit}
                className="bg-blue-600 text-white px-4 py-1.5 rounded text-sm disabled:opacity-50"
              >
                {savingEdit ? "Đang lưu..." : "Lưu"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
