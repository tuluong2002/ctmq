import { useEffect, useState, useRef } from "react";
import axios from "axios";
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
  const [monthFilter, setMonthFilter] = useState("");
  const [vehicleFilter, setVehicleFilter] = useState([]);
  const [vehicleFilterOptions, setVehicleFilterOptions] = useState([]);
  const [vehicleFilterSearch, setVehicleFilterSearch] = useState("");
  const [showVehicleFilterDropdown, setShowVehicleFilterDropdown] =
    useState(false);

  const [dropdownPos, setDropdownPos] = useState({
    top: 0,
    left: 0,
  });

  const token = localStorage.getItem("token");

  const baseUrl =
    source === "vinh-khuc" ? `${API}/fuel-vinh-khuc` : `${API}/fuel-ngoc-long`;

  /* ================= LẤY DANH SÁCH SỐ XE ================= */
  const fetchVehicleFilterOptions = async () => {
    try {
      const url =
        source === "vinh-khuc"
          ? `${API}/fuel-vinh-khuc/fuel-vehicle`
          : `${API}/fuel-ngoc-long/fuel-vehicle`;

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
          if (source === "vinh-khuc") {
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

  /* ================= XOÁ TẤT CẢ ================= */
  const handleDeleteAll = async () => {
    if (!window.confirm("Xóa toàn bộ dữ liệu?")) {
      return;
    }

    try {
      await axios.delete(baseUrl, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      await fetchData();
      await fetchVehicleFilterOptions();
    } catch (err) {
      console.error(err);

      alert(err.response?.data?.message || "Xóa toàn bộ dữ liệu thất bại");
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
              {data.map((r) => (
                <tr key={r._id} className="even:bg-gray-50 hover:bg-blue-50">
                  <td className="border px-2">
                    {r.dateFull &&
                      new Date(r.dateFull).toLocaleDateString("vi-VN")}
                  </td>

                  <td className="border px-2">{r.day}</td>

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
              ))}
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
                  "Nơi đổ"
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
              {data.map((r) => (
                <tr key={r._id} className="even:bg-gray-50 hover:bg-blue-50">
                  <td className="border px-2 text-center">
                    {r.dateFull &&
                      new Date(r.dateFull).toLocaleDateString("vi-VN")}
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
                    {Number(r.cumulativeMechanical1 || " ").toLocaleString(
                      "vi-VN",
                    )}
                  </td>

                  <td className="border px-2 text-right">
                    {Number(r.cumulativeMechanical2 || " ").toLocaleString(
                      "vi-VN",
                    )}
                  </td>

                  <td className="border px-2 text-right">
                    {Number(r.checkElectronic1 || " ").toLocaleString(
                      "vi-VN",
                    )}
                  </td>

                  <td className="border px-2 text-right">
                    {Number(r.checkElectronic2 || " ").toLocaleString(
                      "vi-VN",
                    )}
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
              ))}
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

      {/* XOÁ TẤT CẢ */}
      <button
        onClick={handleDeleteAll}
        className="bg-red-500 text-white px-2 py-1"
      >
        Xóa tất cả
      </button>

      {importing && <span className="text-blue-600 text-sm">Đang nhập...</span>}

      {!importing && importTotal > 0 && (
        <span className="text-green-700 text-xs">
          Đã nhập {importDone}/{importTotal} dòng hợp lệ
        </span>
      )}
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
      </div>

      <Toolbar />

      {loading && <p>Đang tải...</p>}

      {source === "vinh-khuc" ? renderVinhKhuc() : renderNgocLong()}
    </div>
  );
}
