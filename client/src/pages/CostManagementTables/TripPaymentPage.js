import { useEffect, useState, useRef } from "react";
import axios from "axios";
import VehicleProfitTripPaymentKTModal from "../../components/CostModal/VehicleProfitTripPaymentKTModal";
import API from "../../api";

export default function TripPaymentKTPage() {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(false);

  /* ================= THỐNG KÊ THÁNG ================= */
  const [monthlyStats, setMonthlyStats] = useState({
    totalTrips: 0,
    totalMoney: 0,
  });

  /* ================= IMPORT ================= */
  const [importing, setImporting] = useState(false);
  const [importTotal, setImportTotal] = useState(0);
  const [importDone, setImportDone] = useState(0);

  const fileInputRef = useRef(null);
  const [importFile, setImportFile] = useState(null);

  const token = localStorage.getItem("token");
  const baseUrl = `${API}/trip-payment-kt`;

  /* ================= FILTER OPTIONS ================= */
  const [driverOptions, setDriverOptions] = useState([]);
  const [plateOptions, setPlateOptions] = useState([]);

  const [driverFilter, setDriverFilter] = useState([]);
  const [plateFilter, setPlateFilter] = useState([]);

  /* ================= DROPDOWN ================= */
  const [showDriverDropdown, setShowDriverDropdown] = useState(false);
  const [showPlateDropdown, setShowPlateDropdown] = useState(false);

  const [dropdownPos, setDropdownPos] = useState({
    top: 0,
    left: 0,
  });

  const [driverFilterSearch, setDriverFilterSearch] = useState("");
  const [plateFilterSearch, setPlateFilterSearch] = useState("");

  /* ================= MONTH FILTER ================= */
  const getCurrentMonth = () => {
    const now = new Date();

    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(
      2,
      "0",
    )}`;
  };

  const [month, setMonth] = useState(getCurrentMonth());

  /* ================= VEHICLE PROFIT ================= */
  const [showVehicleProfitModal, setShowVehicleProfitModal] = useState(false);

  const [updatingVehicleProfit, setUpdatingVehicleProfit] = useState(false);

  /* ================= PAGINATION ================= */
  const [page, setPage] = useState(1);
  const limit = 150;
  const [totalPages, setTotalPages] = useState(1);

  /* =========================================================
     LẤY DANH SÁCH FILTER
  ========================================================= */
  const fetchFilterOptions = async () => {
    try {
      const [driversRes, platesRes] = await Promise.all([
        axios.get(`${baseUrl}/drivers`, {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }),

        axios.get(`${baseUrl}/plates`, {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }),
      ]);

      setDriverOptions(Array.isArray(driversRes.data) ? driversRes.data : []);

      setPlateOptions(Array.isArray(platesRes.data) ? platesRes.data : []);
    } catch (err) {
      console.error("Lỗi lấy filter:", err);
    }
  };

  useEffect(() => {
    fetchFilterOptions();
  }, []);

  /* =========================================================
     FETCH DATA
  ========================================================= */
  const fetchData = async () => {
    setLoading(true);

    try {
      const params = {
        page,
        limit,
      };

      /* ================= BIỂN SỐ XE ================= */
      if (
        plateFilter.length > 0 &&
        plateFilter.length !== plateOptions.length
      ) {
        params.bienSoXe = plateFilter;
      }

      /* ================= TÊN LÁI XE ================= */
      if (
        driverFilter.length > 0 &&
        driverFilter.length !== driverOptions.length
      ) {
        params.tenLaiXe = driverFilter;
      }

      /* ================= THÁNG ================= */
      if (month) {
        params.month = month;
      }

      const res = await axios.get(baseUrl, {
        params,

        paramsSerializer: (params) => {
          const qs = [];

          Object.keys(params).forEach((key) => {
            const value = params[key];

            if (Array.isArray(value)) {
              value.forEach((v) => {
                qs.push(`${key}=${encodeURIComponent(v)}`);
              });
            } else {
              qs.push(`${key}=${encodeURIComponent(value)}`);
            }
          });

          return qs.join("&");
        },

        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      setData(Array.isArray(res.data.data) ? res.data.data : []);

      setTotalPages(res.data.pagination?.totalPages || 1);

      setMonthlyStats({
        totalTrips: Number(res.data.monthlyStats?.totalTrips || 0),
        totalMoney: Number(res.data.monthlyStats?.totalMoney || 0),
      });
    } catch (err) {
      console.error("Lỗi lấy dữ liệu:", err);

      setData([]);
      setTotalPages(1);

      setMonthlyStats({
        totalTrips: 0,
        totalMoney: 0,
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [page, plateFilter.join(","), driverFilter.join(","), month]);

  /* =========================================================
     IMPORT EXCEL
  ========================================================= */
  const handleSelectFile = (e) => {
    const file = e.target.files?.[0];

    if (file) {
      setImportFile(file);
    }
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
      const res = await axios.post(`${baseUrl}/import-excel`, formData, {
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "multipart/form-data",
        },
      });

      const inserted = res.data.inserted || res.data.totalValid || 0;

      setImportTotal(inserted);
      setImportDone(inserted);

      setPage(1);

      await fetchData();

      alert(`Import thành công ${inserted} dòng`);
    } catch (err) {
      console.error(err);

      alert(err.response?.data?.message || "Import thất bại");
    } finally {
      setImporting(false);
      setImportFile(null);

      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    }
  };

  /* =========================================================
   XOÁ THEO THÁNG
========================================================= */
  const handleDeleteByMonth = async () => {
    if (!month) {
      alert("Chọn tháng trước");
      return;
    }

    if (!window.confirm(`Xoá tất cả dữ liệu của tháng ${month} ?`)) {
      return;
    }

    try {
      await axios.delete(`${baseUrl}/delete-by-date`, {
        params: {
          month,
        },

        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      setPage(1);

      await fetchData();

      alert("Xoá thành công");
    } catch (err) {
      console.error(err);

      alert(err.response?.data?.message || "Xoá thất bại");
    }
  };

  /* =========================================================
   CẬP NHẬT CHI PHÍ THANH TOÁN LỊCH TRÌNH
========================================================= */
  const handleUpdateVehicleProfit = async () => {
    if (!month) {
      alert("Vui lòng chọn tháng");
      return;
    }

    if (updatingVehicleProfit) {
      return;
    }

    if (
      !window.confirm(
        `Bạn có chắc muốn cập nhật chi phí thanh toán lịch trình vào VehicleProfit tháng ${month}?`,
      )
    ) {
      return;
    }

    setUpdatingVehicleProfit(true);

    try {
      const res = await axios.post(
        `${baseUrl}/vehicle-profit/update`,
        {
          month,
        },
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        },
      );

      alert(
        res.data?.message ||
          "Cập nhật chi phí thanh toán lịch trình thành công",
      );

      await fetchData();
    } catch (err) {
      console.error("UPDATE VEHICLE PROFIT TRIP PAYMENT KT ERROR:", err);

      alert(
        err.response?.data?.message ||
          err.response?.data?.error ||
          err.message ||
          "Cập nhật thất bại",
      );
    } finally {
      setUpdatingVehicleProfit(false);
    }
  };

  /* =========================================================
     TOOLBAR
  ========================================================= */
  const Toolbar = () => (
    <div className="flex gap-2 mb-3 items-center flex-wrap">
      {/* THÁNG */}
      <input
        type="month"
        value={month}
        onChange={(e) => {
          setMonth(e.target.value);
          setPage(1);
        }}
        className="border px-2 py-1"
      />

      {/* XOÁ THEO THÁNG */}
      <button
        onClick={handleDeleteByMonth}
        disabled={!month}
        className="bg-red-600 text-white px-2 py-1 disabled:opacity-50"
      >
        Xoá theo tháng
      </button>

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
        className="border px-2 py-1"
      >
        Chọn file
      </button>

      {importFile && (
        <span className="text-xs text-gray-700 max-w-[300px] truncate">
          {importFile.name}
        </span>
      )}

      {/* IMPORT */}
      <button
        onClick={handleImport}
        disabled={!importFile || importing}
        className="bg-blue-600 text-white px-2 py-1 disabled:opacity-50"
      >
        {importing ? "Đang import..." : "Import"}
      </button>

      {importing && importTotal > 0 && (
        <span className="text-xs">
          {importDone} / {importTotal}
        </span>
      )}

      {/* CẬP NHẬT CHI PHÍ */}
      <button
        onClick={handleUpdateVehicleProfit}
        disabled={!month || updatingVehicleProfit || importing}
        className="bg-green-600 text-white px-2 py-1 rounded disabled:opacity-50"
      >
        {updatingVehicleProfit
          ? "Đang cập nhật..."
          : "Cập nhật chi phí lịch trình"}
      </button>

      {/* XEM VEHICLE PROFIT */}
      <button
        onClick={() => {
          if (!month) {
            alert("Không xác định được tháng");
            return;
          }

          setShowVehicleProfitModal(true);
        }}
        disabled={!month || updatingVehicleProfit}
        className="bg-purple-600 text-white px-2 py-1 rounded disabled:opacity-50"
      >
        Xem chi phí lịch trình
      </button>
    </div>
  );

  /* =========================================================
     TABLE HEADER
  ========================================================= */
  const columns = [
    "ngayThang",
    "maXe",
    "totalMoney",
    "bienSoXe",
    "tenLaiXe",
    "ghiChu",
  ];

  const headers = [
    "Ngày tháng",
    "Mã xe",
    "Tổng tiền",
    "Biển số xe",
    "Tên lái xe",
    "Ghi chú",
  ];

  /* =========================================================
     RENDER
  ========================================================= */
  return (
    <div className="p-4">
      <Toolbar />

      {loading && <p className="mb-2 text-xs">Đang tải...</p>}

      {/* =======================================================
    THỐNG KÊ THÁNG
======================================================= */}
      <div className="flex gap-4 mb-3 justify-between text-xs">
        <div className="border rounded px-3 py-1.5 bg-gray-50">
          <span className="text-black">Số lịch trình trong tháng:</span>{" "}
          <span className="font-semibold">
            {monthlyStats.totalTrips.toLocaleString("vi-VN")}
          </span>
        </div>

        <div className="border rounded px-3 py-1.5 bg-gray-50">
          <span className="text-black">Tổng tiền của tháng:</span>{" "}
          <span className="font-semibold text-red-600">
            {monthlyStats.totalMoney.toLocaleString("vi-VN")}
          </span>{" "}
          VNĐ
        </div>
      </div>

      <div className="border rounded overflow-auto max-h-[70vh]"></div>

      <div className="border rounded overflow-auto max-h-[70vh]">
        <table className="min-w-[1000px] w-full text-xs table-auto border-separate border-spacing-0">
          <thead className="sticky top-0 bg-blue-600 text-white z-20">
            <tr>
              {headers.map((h) => (
                <th
                  key={h}
                  className="border px-2 py-1 whitespace-nowrap relative"
                >
                  {/* =================================================
                      FILTER TÊN LÁI XE
                  ================================================= */}
                  {h === "Tên lái xe" ? (
                    <div className="flex flex-col relative">
                      <span
                        className="cursor-pointer select-none"
                        onClick={(e) => {
                          const rect = e.currentTarget.getBoundingClientRect();

                          setDropdownPos({
                            top: rect.bottom + 4,
                            left: rect.left,
                          });

                          setShowDriverDropdown((p) => !p);

                          setShowPlateDropdown(false);
                        }}
                      >
                        {h}
                      </span>

                      {showDriverDropdown && (
                        <div
                          className="fixed z-[999] w-56 border rounded bg-white text-black p-2 shadow-lg"
                          style={{
                            top: dropdownPos.top,
                            left: dropdownPos.left,
                          }}
                        >
                          <input
                            type="text"
                            placeholder="Tìm tên lái xe..."
                            className="w-full border rounded px-1 mb-1"
                            value={driverFilterSearch}
                            onChange={(e) =>
                              setDriverFilterSearch(e.target.value)
                            }
                          />

                          {/* CHỌN TẤT CẢ */}
                          <label className="flex items-center gap-1 mb-1">
                            <input
                              type="checkbox"
                              checked={
                                driverOptions.length > 0 &&
                                driverFilter.length === driverOptions.length
                              }
                              onChange={(e) => {
                                setDriverFilter(
                                  e.target.checked ? [...driverOptions] : [],
                                );
                                setPage(1);
                              }}
                            />

                            <span>Chọn tất cả</span>
                          </label>

                          <div className="max-h-40 overflow-auto">
                            {driverOptions
                              .filter((d) =>
                                d
                                  .toLowerCase()
                                  .includes(driverFilterSearch.toLowerCase()),
                              )
                              .map((d) => (
                                <label
                                  key={d}
                                  className="flex items-center gap-1 mb-1"
                                >
                                  <input
                                    type="checkbox"
                                    checked={driverFilter.includes(d)}
                                    onChange={(e) => {
                                      setDriverFilter((prev) =>
                                        e.target.checked
                                          ? [...prev, d]
                                          : prev.filter((x) => x !== d),
                                      );

                                      setPage(1);
                                    }}
                                  />

                                  <span>{d}</span>
                                </label>
                              ))}
                          </div>

                          <button
                            onClick={() => setShowDriverDropdown(false)}
                            className="mt-1 w-full bg-blue-600 text-white text-xs py-0.5 rounded"
                          >
                            Đóng
                          </button>
                        </div>
                      )}
                    </div>
                  ) : h === "Biển số xe" ? (
                    /* =================================================
                       FILTER BIỂN SỐ XE
                    ================================================= */
                    <div className="flex flex-col relative">
                      <span
                        className="cursor-pointer select-none"
                        onClick={(e) => {
                          const rect = e.currentTarget.getBoundingClientRect();

                          setDropdownPos({
                            top: rect.bottom + 4,
                            left: rect.left,
                          });

                          setShowPlateDropdown((p) => !p);

                          setShowDriverDropdown(false);
                        }}
                      >
                        {h}
                      </span>

                      {showPlateDropdown && (
                        <div
                          className="fixed z-[999] w-48 border rounded bg-white text-black p-2 shadow-lg"
                          style={{
                            top: dropdownPos.top,
                            left: dropdownPos.left,
                          }}
                        >
                          <input
                            type="text"
                            placeholder="Tìm biển số..."
                            className="w-full border rounded px-1 mb-1"
                            value={plateFilterSearch}
                            onChange={(e) =>
                              setPlateFilterSearch(e.target.value)
                            }
                          />

                          {/* CHỌN TẤT CẢ */}
                          <label className="flex items-center gap-1 mb-1">
                            <input
                              type="checkbox"
                              checked={
                                plateOptions.length > 0 &&
                                plateFilter.length === plateOptions.length
                              }
                              onChange={(e) => {
                                setPlateFilter(
                                  e.target.checked ? [...plateOptions] : [],
                                );
                                setPage(1);
                              }}
                            />

                            <span>Chọn tất cả</span>
                          </label>

                          <div className="max-h-40 overflow-auto">
                            {plateOptions
                              .filter((p) =>
                                p
                                  .toLowerCase()
                                  .includes(plateFilterSearch.toLowerCase()),
                              )
                              .map((p) => (
                                <label
                                  key={p}
                                  className="flex items-center gap-1 mb-1"
                                >
                                  <input
                                    type="checkbox"
                                    checked={plateFilter.includes(p)}
                                    onChange={(e) => {
                                      setPlateFilter((prev) =>
                                        e.target.checked
                                          ? [...prev, p]
                                          : prev.filter((x) => x !== p),
                                      );

                                      setPage(1);
                                    }}
                                  />

                                  <span>{p}</span>
                                </label>
                              ))}
                          </div>

                          <button
                            onClick={() => setShowPlateDropdown(false)}
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
            {data.length === 0 && !loading ? (
              <tr>
                <td
                  colSpan={columns.length}
                  className="border px-2 py-4 text-center text-gray-500"
                >
                  Không có dữ liệu
                </td>
              </tr>
            ) : (
              data.map((r) => (
                <tr
                  key={r._id}
                  className={r.isDontMatchCP === true ? "text-red-600" : ""}
                >
                  {/* NGÀY THÁNG */}
                  <td className="border px-2 text-center whitespace-nowrap">
                    {r.ngayThang
                      ? new Date(r.ngayThang).toLocaleDateString("vi-VN")
                      : ""}
                  </td>

                  {/* MÃ XE */}
                  <td className="border px-2 text-center">{r.maXe || ""}</td>

                  {/* TỔNG TIỀN */}
                  <td className="border px-2 text-right whitespace-nowrap font-semibold">
                    {Number(r.totalMoney || 0).toLocaleString("vi-VN")}
                  </td>

                  {/* BIỂN SỐ XE */}
                  <td className="border px-2">{r.bienSoXe || ""}</td>

                  {/* TÊN LÁI XE */}
                  <td className="border px-2">{r.tenLaiXe || ""}</td>

                  {/* GHI CHÚ */}
                  <td className="border px-2">{r.ghiChu || ""}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* =======================================================
          PHÂN TRANG
      ======================================================= */}
      <div className="flex gap-2 justify-center mt-3 text-xs items-center">
        <button
          disabled={page === 1 || loading}
          onClick={() => setPage((p) => Math.max(p - 1, 1))}
          className="border px-2 py-1 disabled:opacity-50"
        >
          ◀ Trước
        </button>

        <span>
          Trang {page} / {totalPages}
        </span>

        <button
          disabled={page === totalPages || loading}
          onClick={() => setPage((p) => Math.min(p + 1, totalPages))}
          className="border px-2 py-1 disabled:opacity-50"
        >
          Sau ▶
        </button>
      </div>
      <VehicleProfitTripPaymentKTModal
        open={showVehicleProfitModal}
        month={month}
        onClose={() => setShowVehicleProfitModal(false)}
      />
    </div>
  );
}
