import { useEffect, useState, useRef } from "react";
import axios from "axios";
import RepairCostVehicleProfitModal from "../../components/CostModal/RepairCostVehicleProfitModal";
import API from "../../api";

export default function RepairCostPage() {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(false);

  // =====================================================
  // FILTER THÁNG / NĂM - THEO NGÀY SỬA CHỮA
  // =====================================================
  const getCurrentMonth = () => {
    const now = new Date();

    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, "0");

    return `${year}-${month}`;
  };

  const [monthFilter, setMonthFilter] = useState(getCurrentMonth());

  // =====================================================
  // MODAL CP SỬA XE VEHICLE PROFIT
  // =====================================================
  const [showRepairCostModal, setShowRepairCostModal] = useState(false);
  const [updatingRepairCost, setUpdatingRepairCost] = useState(false);

  const [importing, setImporting] = useState(false);
  const [importTotal, setImportTotal] = useState(0);
  const [importDone, setImportDone] = useState(0);

  const token = localStorage.getItem("token");
  const baseUrl = `${API}/repair`;

  const fileInputRef = useRef(null);
  const [importFile, setImportFile] = useState(null);

  // =====================================================
  // FILTER OPTIONS
  // =====================================================

  const [vehicleFilterOptions, setVehicleFilterOptions] = useState([]);
  const [unitFilterOptions, setUnitFilterOptions] = useState([]);

  const [vehicleFilter, setVehicleFilter] = useState([]);
  const [unitFilter, setUnitFilter] = useState([]);

  const [vehicleFilterSearch, setVehicleFilterSearch] = useState("");
  const [unitFilterSearch, setUnitFilterSearch] = useState("");

  const [showVehicleDropdown, setShowVehicleDropdown] = useState(false);
  const [showUnitDropdown, setShowUnitDropdown] = useState(false);

  const [dropdownPos, setDropdownPos] = useState({
    top: 0,
    left: 0,
  });

  // =====================================================
  // FETCH FILTER OPTIONS
  // =====================================================

  const fetchFilterOptions = async () => {
    try {
      const [vehiclesRes, unitsRes] = await Promise.all([
        axios.get(`${baseUrl}/unique-vehiclePlates`, {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }),

        axios.get(`${baseUrl}/unique-repairUnits`, {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }),
      ]);

      const vehicles = vehiclesRes.data || [];
      const units = unitsRes.data || [];

      setVehicleFilterOptions(vehicles);
      setUnitFilterOptions(units);

      // Nếu chưa có filter thì mặc định chọn tất cả
      setVehicleFilter((prev) =>
        prev.length === 0 ? vehicles : prev.filter((v) => vehicles.includes(v)),
      );

      setUnitFilter((prev) =>
        prev.length === 0 ? units : prev.filter((v) => units.includes(v)),
      );
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    fetchFilterOptions();
  }, []);

  // =====================================================
  // FETCH DATA
  // =====================================================
  const fetchData = async () => {
    setLoading(true);

    try {
      const params = {};

      // ==========================================
      // LỌC THÁNG / NĂM
      // month dạng: 2026-08
      // ==========================================
      if (monthFilter) {
        params.month = monthFilter;
      }

      // ==========================================
      // LỌC BIỂN SỐ
      // ==========================================
      if (vehicleFilter.length > 0) {
        params.vehiclePlates = JSON.stringify(vehicleFilter);
      }

      // ==========================================
      // LỌC ĐƠN VỊ
      // ==========================================
      if (unitFilter.length > 0) {
        params.repairUnits = JSON.stringify(unitFilter);
      }

      const res = await axios.get(baseUrl, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
        params,
      });

      setData(res.data || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    // Chỉ fetch khi đã có options
    if (vehicleFilterOptions.length === 0 && unitFilterOptions.length === 0) {
      return;
    }

    fetchData();

    setImporting(false);
    setImportTotal(0);
    setImportDone(0);
  }, [vehicleFilter, unitFilter, monthFilter]);

  // =====================================================
  // IMPORT
  // =====================================================

  const handleSelectFile = (e) => {
    const file = e.target.files?.[0];

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

      // Cập nhật lại danh sách filter
      await fetchFilterOptions();

      // Lấy lại dữ liệu
      await fetchData();

      alert(`Import thành công ${res.data.inserted || 0} dòng.`);
    } catch (err) {
      console.error(err);

      const msg =
        err.response?.data?.message || err.message || "Import thất bại";

      alert(msg);
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

  // =====================================================
  // CẬP NHẬT CHI PHÍ SỬA XE VÀO VEHICLE PROFIT
  // THEO THÁNG ĐANG CHỌN
  // =====================================================

  const handleUpdateRepairCost = async () => {
    if (!monthFilter) {
      alert("Vui lòng chọn tháng/năm");
      return;
    }

    const [year, month] = monthFilter.split("-");

    const confirmUpdate = window.confirm(
      `Bạn có chắc muốn cập nhật chi phí sửa xe tháng ${month}/${year} vào Doanh thu?`,
    );

    if (!confirmUpdate) {
      return;
    }

    setUpdatingRepairCost(true);

    try {
      const res = await axios.post(
        `${API}/repair/update-repair-cost`,
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
        res.data?.message ||
          `Đã cập nhật chi phí sửa xe tháng ${month}/${year}`,
      );
    } catch (err) {
      console.error(err);

      alert(err.response?.data?.message || "Lỗi cập nhật chi phí sửa xe");
    } finally {
      setUpdatingRepairCost(false);
    }
  };

  // =====================================================
  // XÓA THEO THÁNG / NĂM
  // THEO repairDate
  // =====================================================
  const handleDeleteByMonth = async () => {
    if (!monthFilter) {
      alert("Vui lòng chọn tháng/năm cần xóa");
      return;
    }

    const [year, month] = monthFilter.split("-");

    const confirmDelete = window.confirm(
      `Bạn có chắc muốn xóa toàn bộ dữ liệu sửa chữa tháng ${month}/${year}?`,
    );

    if (!confirmDelete) {
      return;
    }

    try {
      const res = await axios.delete(`${baseUrl}/month-year`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
        data: {
          month: Number(month),
          year: Number(year),
        },
      });

      alert(res.data?.message || `Đã xóa ${res.data?.deletedCount || 0} dòng`);

      // Load lại danh sách filter
      await fetchFilterOptions();

      // Load lại data theo tháng hiện tại
      await fetchData();
    } catch (err) {
      console.error(err);

      alert(err.response?.data?.message || "Xóa dữ liệu theo tháng thất bại");
    }
  };

  // =====================================================
  // FORMAT
  // =====================================================

  const formatMoney = (value) => {
    return Number(value || 0).toLocaleString("vi-VN");
  };

  const formatDate = (value) => {
    if (!value) return "";

    const date = new Date(value);

    if (Number.isNaN(date.getTime())) {
      return "";
    }

    return date.toLocaleDateString("vi-VN");
  };

  // =====================================================
  // TABLE
  // =====================================================

  const renderTable = () => {
    const totalMoney = data.reduce(
      (sum, r) => sum + Number(r.grandTotal || 0),
      0,
    );

    return (
      <>
        {/* =================================================
            SUMMARY
        ================================================= */}

        <div className="flex justify-between items-center mb-2 text-sm">
          <div>
            Tổng số dòng: <b>{data.length}</b>
          </div>

          <div>
            Tổng cộng: <b className="text-red-600">{formatMoney(totalMoney)}</b>{" "}
            VNĐ
          </div>
        </div>

        {/* =================================================
            TABLE
        ================================================= */}

        <div className="border rounded-lg overflow-auto max-h-[70vh] shadow-sm">
          <table className="min-w-[2600px] w-full table-auto border-separate border-spacing-0 text-xs">
            <thead className="sticky top-0 bg-blue-600 z-20">
              <tr>
                {[
                  "MÃ SỬA XE",
                  "MÃ SỐ THUẾ",
                  "ĐƠN VỊ SỬA CHỮA",
                  "NGÀY SỬA CHỮA",
                  "BIỂN SỐ XE",
                  "CHI TIẾT SỬA CHỮA",
                  "ĐVT",
                  "SL",
                  "ĐƠN GIÁ",
                  "THÀNH TIỀN",
                  "VAT",
                  "TỔNG CỘNG",
                  "GHI CHÚ",
                  "SỐ HÓA ĐƠN",
                  "NGƯỜI PHỤ TRÁCH",
                  "PHIẾU CHI SỐ",
                  "NGÀY THANH TOÁN",
                ].map((h) => (
                  <th
                    key={h}
                    className="border px-2 py-2 font-semibold text-white whitespace-nowrap relative text-center"
                  >
                    {h === "ĐƠN VỊ SỬA CHỮA" || h === "BIỂN SỐ XE" ? (
                      <div className="flex flex-col relative">
                        <span
                          className="cursor-pointer select-none"
                          onClick={(e) => {
                            const rect =
                              e.currentTarget.getBoundingClientRect();

                            setDropdownPos({
                              top: rect.bottom + window.scrollY,
                              left: rect.left + window.scrollX,
                            });

                            if (h === "ĐƠN VỊ SỬA CHỮA") {
                              setShowUnitDropdown((p) => !p);
                              setShowVehicleDropdown(false);
                            } else {
                              setShowVehicleDropdown((p) => !p);
                              setShowUnitDropdown(false);
                            }
                          }}
                        >
                          {h}
                        </span>

                        {/* =================================================
                            FILTER DROPDOWN
                        ================================================= */}

                        {((h === "ĐƠN VỊ SỬA CHỮA" && showUnitDropdown) ||
                          (h === "BIỂN SỐ XE" && showVehicleDropdown)) && (
                          <div
                            className="fixed z-[999] w-48 border rounded bg-white text-black p-2 shadow-lg"
                            style={{
                              top: `${dropdownPos.top}px`,
                              left: `${dropdownPos.left}px`,
                            }}
                          >
                            {/* SEARCH */}

                            <input
                              type="text"
                              placeholder={
                                h === "ĐƠN VỊ SỬA CHỮA"
                                  ? "Tìm đơn vị..."
                                  : "Tìm biển số..."
                              }
                              className="w-full border rounded px-1 mb-1"
                              value={
                                h === "ĐƠN VỊ SỬA CHỮA"
                                  ? unitFilterSearch
                                  : vehicleFilterSearch
                              }
                              onChange={(e) => {
                                if (h === "ĐƠN VỊ SỬA CHỮA") {
                                  setUnitFilterSearch(e.target.value);
                                } else {
                                  setVehicleFilterSearch(e.target.value);
                                }
                              }}
                            />

                            {/* CHỌN TẤT CẢ */}

                            <label className="flex items-center gap-1 mb-1">
                              <input
                                type="checkbox"
                                checked={
                                  h === "ĐƠN VỊ SỬA CHỮA"
                                    ? unitFilter.length ===
                                      unitFilterOptions.length
                                    : vehicleFilter.length ===
                                      vehicleFilterOptions.length
                                }
                                onChange={(e) => {
                                  if (h === "ĐƠN VỊ SỬA CHỮA") {
                                    setUnitFilter(
                                      e.target.checked
                                        ? [...unitFilterOptions]
                                        : [],
                                    );
                                  } else {
                                    setVehicleFilter(
                                      e.target.checked
                                        ? [...vehicleFilterOptions]
                                        : [],
                                    );
                                  }
                                }}
                              />

                              <span>Chọn tất cả</span>
                            </label>

                            {/* DANH SÁCH */}

                            <div className="max-h-40 overflow-auto">
                              {(h === "ĐƠN VỊ SỬA CHỮA"
                                ? unitFilterOptions
                                : vehicleFilterOptions
                              )
                                .filter((v) =>
                                  String(v)
                                    .toLowerCase()
                                    .includes(
                                      (h === "ĐƠN VỊ SỬA CHỮA"
                                        ? unitFilterSearch
                                        : vehicleFilterSearch
                                      ).toLowerCase(),
                                    ),
                                )
                                .map((v) => (
                                  <label
                                    key={v}
                                    className="flex items-center gap-1 mb-1"
                                  >
                                    <input
                                      type="checkbox"
                                      checked={
                                        h === "ĐƠN VỊ SỬA CHỮA"
                                          ? unitFilter.includes(v)
                                          : vehicleFilter.includes(v)
                                      }
                                      onChange={(e) => {
                                        if (h === "ĐƠN VỊ SỬA CHỮA") {
                                          setUnitFilter((p) =>
                                            e.target.checked
                                              ? [...p, v]
                                              : p.filter((x) => x !== v),
                                          );
                                        } else {
                                          setVehicleFilter((p) =>
                                            e.target.checked
                                              ? [...p, v]
                                              : p.filter((x) => x !== v),
                                          );
                                        }
                                      }}
                                    />

                                    <span>{v}</span>
                                  </label>
                                ))}
                            </div>

                            {/* ĐÓNG */}

                            <button
                              onClick={() => {
                                if (h === "ĐƠN VỊ SỬA CHỮA") {
                                  setShowUnitDropdown(false);
                                } else {
                                  setShowVehicleDropdown(false);
                                }
                              }}
                              className="mt-1 w-full bg-blue-600 text-white text-xs py-0.5 rounded"
                            >
                              Đóng
                            </button>
                          </div>
                        )}
                      </div>
                    ) : (
                      h
                    )}
                  </th>
                ))}
              </tr>
            </thead>

            <tbody>
              {data.map((r, idx) => (
                <tr
                  key={r._id}
                  className="even:bg-gray-50 hover:bg-blue-50 text-xs"
                >
                  {/* MÃ SỬA XE */}

                  <td className="border px-2 py-1 font-semibold text-blue-700 whitespace-nowrap">
                    {r.repairCode}
                  </td>

                  {/* MST */}

                  <td className="border px-2 py-1">{r.taxCode}</td>

                  {/* ĐƠN VỊ */}

                  <td className="border px-2 py-1">{r.repairUnit}</td>

                  {/* NGÀY SỬA */}

                  <td className="border px-2 py-1 whitespace-nowrap text-center">
                    {formatDate(r.repairDate)}
                  </td>

                  {/* BSX */}

                  <td className="border px-2 py-1 text-center">
                    {r.vehiclePlate}
                  </td>

                  {/* CHI TIẾT */}

                  <td className="border px-2 py-1">{r.repairDetails}</td>

                  {/* ĐVT */}

                  <td className="border px-2 py-1 text-center">{r.unit}</td>

                  {/* SL */}

                  <td className="border px-2 py-1 text-center">
                    {Number(r.quantity || 0).toLocaleString("vi-VN")}
                  </td>

                  {/* ĐƠN GIÁ */}

                  <td className="border px-2 py-1 text-right">
                    {formatMoney(r.unitPrice)}
                  </td>

                  {/* THÀNH TIỀN */}

                  <td className="border px-2 py-1 text-right font-semibold">
                    {formatMoney(r.totalAmount)}
                  </td>

                  {/* VAT */}

                  <td className="border px-2 py-1 text-right">
                    {Number(r.vat || 0).toLocaleString("vi-VN")}%
                  </td>

                  {/* TỔNG CỘNG */}

                  <td className="border px-2 py-1 text-right font-semibold text-red-600">
                    {formatMoney(r.grandTotal)}
                  </td>

                  {/* GHI CHÚ */}

                  <td className="border px-2 py-1">{r.note}</td>

                  {/* SỐ HÓA ĐƠN */}

                  <td className="border px-2 py-1">{r.invoiceNumber}</td>

                  {/* NGƯỜI PHỤ TRÁCH */}

                  <td className="border px-2 py-1">{r.personInCharge}</td>

                  {/* PHIẾU CHI */}

                  <td className="border px-2 py-1">{r.paymentVoucherNumber}</td>

                  {/* NGÀY THANH TOÁN */}

                  <td className="border px-2 py-1 whitespace-nowrap">
                    {formatDate(r.paymentDate)}
                  </td>
                </tr>
              ))}

              {/* KHÔNG CÓ DATA */}

              {!loading && data.length === 0 && (
                <tr>
                  <td
                    colSpan={18}
                    className="border px-2 py-8 text-center text-gray-500"
                  >
                    Không có dữ liệu
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </>
    );
  };

  // =====================================================
  // TOOLBAR
  // =====================================================

  const Toolbar = () => (
    <div className="flex gap-2 mb-3 items-center">
      {/* =================================================
      LỌC THÁNG / NĂM
      ================================================= */}
      <div className="flex items-center gap-1">
        <span className="text-xs font-semibold">Tháng:</span>

        <input
          type="month"
          value={monthFilter}
          onChange={(e) => {
            setMonthFilter(e.target.value);
          }}
          className="border px-2 py-1 rounded text-sm"
        />

        {monthFilter && (
          <button
            onClick={() => setMonthFilter("")}
            className="border px-2 py-1 rounded text-xs bg-gray-100 hover:bg-gray-200"
          >
            Tất cả
          </button>
        )}
      </div>
      {/* FILE INPUT */}

      <input
        type="file"
        ref={fileInputRef}
        onChange={handleSelectFile}
        className="hidden"
        accept=".xlsx,.xls"
      />

      {/* CHỌN FILE */}

      <button
        onClick={() => fileInputRef.current?.click()}
        className="border px-2 py-1 rounded"
      >
        {importFile ? "Đã chọn file" : "Chọn file"}
      </button>

      {/* TÊN FILE */}

      {importFile && <span className="text-xs">{importFile.name}</span>}

      {/* IMPORT */}

      <button
        onClick={handleImport}
        disabled={!importFile || importing}
        className="bg-blue-600 text-white px-2 py-1 rounded disabled:opacity-50"
      >
        {importing ? "Đang import..." : "Import"}
      </button>

      {/* =================================================
      XÓA THEO THÁNG / NĂM
      ================================================= */}
      <button
        onClick={handleDeleteByMonth}
        disabled={!monthFilter}
        className="bg-red-500 text-white px-2 py-1 rounded disabled:opacity-50"
      >
        Xóa theo tháng
      </button>

      {/* TRẠNG THÁI IMPORT */}

      {importing && <span className="text-blue-600 text-sm">Đang nhập...</span>}

      {!importing && importTotal > 0 && (
        <span className="text-green-700 text-xs">
          Đã nhập {importDone}/{importTotal} dòng hợp lệ
        </span>
      )}

      {/* =================================================
      CẬP NHẬT CP SỬA XE
      ================================================= */}

      <button
        onClick={handleUpdateRepairCost}
        disabled={!monthFilter || updatingRepairCost}
        className="bg-green-600 text-white px-2 py-1 rounded text-xs disabled:opacity-50"
      >
        {updatingRepairCost ? "Đang cập nhật..." : "Cập nhật chi phí"}
      </button>

      {/* =================================================
      XEM CP SỬA XE
      ================================================= */}

      <button
        onClick={() => {
          if (!monthFilter) {
            alert("Vui lòng chọn tháng/năm");
            return;
          }

          setShowRepairCostModal(true);
        }}
        disabled={!monthFilter}
        className="bg-purple-600 text-white px-2 py-1 rounded text-xs disabled:opacity-50"
      >
        Xem chi phí
      </button>
    </div>
  );

  // =====================================================
  // RENDER
  // =====================================================

  return (
    <div className="p-4">
      <Toolbar />

      {loading && <p className="text-sm text-gray-500 mb-2">Đang tải...</p>}

      {renderTable()}

      {/* =================================================
        MODAL DANH SÁCH CP SỬA XE
    ================================================= */}

      <RepairCostVehicleProfitModal
        open={showRepairCostModal}
        onClose={() => setShowRepairCostModal(false)}
        month={monthFilter}
      />
    </div>
  );
}
