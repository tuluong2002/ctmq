import { useEffect, useState, useRef } from "react";
import axios from "axios";
import VehicleProfitEpassTurnModal from "../../components/CostModal/VehicleProfitEpassTurnModal";
import API from "../../api";

export default function EpassTurnPage() {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(false);

  /* =====================================================
     IMPORT
  ===================================================== */

  const [importing, setImporting] = useState(false);
  const [importTotal, setImportTotal] = useState(0);
  const [importDone, setImportDone] = useState(0);

  const fileInputRef = useRef(null);
  const [importFile, setImportFile] = useState(null);

  const token = localStorage.getItem("token");

  const baseUrl = `${API}/epass-turn`;

  /* =====================================================
     FILTER BSX
  ===================================================== */

  const [bsxOptions, setBsxOptions] = useState([]);
  const [bsxFilter, setBsxFilter] = useState([]);
  const [bsxSearch, setBsxSearch] = useState("");

  const [showBsxDropdown, setShowBsxDropdown] = useState(false);

  const [dropdownPos, setDropdownPos] = useState({
    top: 0,
    left: 0,
  });

  /* =====================================================
     FILTER THÁNG
     Theo TimeActions
     Mặc định tháng hiện tại
  ===================================================== */

  const getCurrentMonth = () => {
    const now = new Date();

    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(
      2,
      "0",
    )}`;
  };

  const [monthFilter, setMonthFilter] = useState(getCurrentMonth());

  const [showVehicleProfitModal, setShowVehicleProfitModal] = useState(false);
  const [updatingVehicleProfit, setUpdatingVehicleProfit] = useState(false);

  /* =====================================================
     PHÂN TRANG
  ===================================================== */

  const [page, setPage] = useState(1);

  const limit = 150;

  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);

  /* =====================================================
     FETCH BSX
  ===================================================== */

  const fetchFilterOptions = async () => {
    try {
      const res = await axios.get(`${baseUrl}/unique-bsx`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      const bsx = Array.isArray(res.data) ? res.data : [];

      setBsxOptions(bsx);

      /*
       * Nếu chưa có filter thì chọn tất cả
       */
      setBsxFilter((prev) => {
        if (prev.length === 0) {
          return bsx;
        }

        return prev.filter((item) => bsx.includes(item));
      });
    } catch (err) {
      console.error("Lỗi lấy danh sách BSX:", err);
    }
  };

  /* =====================================================
     LOAD BSX LẦN ĐẦU
  ===================================================== */

  useEffect(() => {
    fetchFilterOptions();
  }, []);

  /* =====================================================
     FETCH DATA
  ===================================================== */

  const fetchData = async () => {
    setLoading(true);

    try {
      /*
       * BE hiện tại chỉ hỗ trợ:
       * page
       * limit
       * bienSoXe
       *
       * Không filter tháng ở BE.
       *
       * Vì vậy lấy dữ liệu theo trang trước,
       * sau đó filter TimeActions ở FE.
       */

      const params = {
        page,
        limit,
      };

      /*
       * Nếu chọn một phần BSX
       * thì gửi bienSoXe nhiều lần:
       *
       * ?bienSoXe=30A-xxx&bienSoXe=30B-xxx
       */

      if (bsxFilter.length > 0 && bsxFilter.length !== bsxOptions.length) {
        params.bienSoXe = bsxFilter;
      }

      const res = await axios.get(baseUrl, {
        params,

        headers: {
          Authorization: `Bearer ${token}`,
        },

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
      });

      let fetchedData = Array.isArray(res.data?.data) ? res.data.data : [];

      /*
       * =================================================
       * FILTER THÁNG
       * Theo TimeActions
       * =================================================
       */

      if (monthFilter) {
        fetchedData = fetchedData.filter((r) => {
          if (!r.TimeActions) {
            return false;
          }

          const date = new Date(r.TimeActions);

          if (Number.isNaN(date.getTime())) {
            return false;
          }

          const year = date.getFullYear();

          const month = String(date.getMonth() + 1).padStart(2, "0");

          return `${year}-${month}` === monthFilter;
        });
      }

      setData(fetchedData);

      /*
       * totalPages lấy trực tiếp từ BE
       */
      setTotalPages(Number(res.data?.totalPages || 1));

      setTotal(Number(res.data?.total || 0));
    } catch (err) {
      console.error("Lỗi lấy dữ liệu EpassTurn:", err);

      setData([]);
      setTotalPages(1);
      setTotal(0);
    } finally {
      setLoading(false);
    }
  };

  /* =====================================================
     LOAD KHI FILTER / PAGE THAY ĐỔI
  ===================================================== */

  useEffect(() => {
    if (bsxOptions.length === 0) {
      return;
    }

    fetchData();

    setImporting(false);
    setImportTotal(0);
    setImportDone(0);
  }, [page, monthFilter, bsxFilter.length, bsxFilter.join(",")]);

  /* =====================================================
     KHI ĐỔI THÁNG
     VỀ TRANG 1
  ===================================================== */

  const handleMonthChange = (e) => {
    setMonthFilter(e.target.value);
    setPage(1);
  };

  /* =====================================================
     IMPORT FILE
  ===================================================== */

  const handleSelectFile = (e) => {
    const file = e.target.files?.[0];

    if (!file) {
      return;
    }

    setImportFile(file);
  };

  /* =====================================================
     IMPORT
  ===================================================== */

  const handleImport = async () => {
    if (!importFile) {
      alert("Chưa chọn file Excel");
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

      const total = Number(res.data?.totalValid || 0);

      const inserted = Number(res.data?.inserted || 0);

      setImportTotal(total);
      setImportDone(inserted);

      /*
       * Cập nhật lại BSX
       */
      await fetchFilterOptions();

      /*
       * Về trang 1 sau import
       */
      setPage(1);

      /*
       * Lấy lại data
       */
      await fetchData();

      alert(`Import thành công ${inserted} dòng.`);
    } catch (err) {
      console.error("IMPORT EPASS TURN ERROR:", err);

      const msg =
        err.response?.data?.message ||
        err.response?.data?.error ||
        err.message ||
        "Import thất bại";

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

  /* =====================================================
     CẬP NHẬT
  ===================================================== */
  const handleUpdateVehicleProfit = async () => {
    if (!monthFilter) {
      return alert("Vui lòng chọn tháng");
    }

    if (updatingVehicleProfit) {
      return;
    }

    if (
      !window.confirm(
        `Bạn có chắc muốn cập nhật chi phí Epass lượt vào VehicleProfit tháng ${monthFilter}?`,
      )
    ) {
      return;
    }

    try {
      setUpdatingVehicleProfit(true);

      const token = localStorage.getItem("token");

      const res = await axios.post(
        `${baseUrl}/vehicle-profit/update`,
        {
          month: monthFilter,
        },
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        },
      );

      alert(res.data?.message || "Cập nhật chi phí Epass lượt thành công");

      // Nếu muốn load lại bảng sau khi cập nhật
      await fetchData();
    } catch (err) {
      console.error("UPDATE EPASS TURN VEHICLE PROFIT ERROR:", err);

      alert(
        err.response?.data?.message ||
          err.response?.data?.error ||
          err.message ||
          "Cập nhật chi phí Epass lượt thất bại",
      );
    } finally {
      setUpdatingVehicleProfit(false);
    }
  };

  /* =====================================================
     XÓA THEO THÁNG
  ===================================================== */

  const handleDeleteByMonth = async () => {
    if (!monthFilter) {
      return alert("Vui lòng chọn tháng");
    }

    const [year, month] = monthFilter.split("-");

    if (
      !window.confirm(
        `Bạn có chắc muốn xoá toàn bộ Epass lượt có thời gian giao dịch trong tháng ${month}/${year}?`,
      )
    ) {
      return;
    }

    try {
      const res = await axios.delete(`${baseUrl}/by-month-year`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },

        data: {
          month: Number(month),
          year: Number(year),
        },
      });

      alert(res.data.message);

      /*
       * Về trang 1
       */
      setPage(1);

      /*
       * Cập nhật lại BSX
       */
      await fetchFilterOptions();

      /*
       * Load lại data
       */
      await fetchData();
    } catch (err) {
      console.error("DELETE EPASS TURN ERROR:", err);

      alert(
        err.response?.data?.message || err.message || "Xoá dữ liệu thất bại",
      );
    }
  };

  /* =====================================================
     FORMAT TIỀN
  ===================================================== */

  const formatMoney = (value) => {
    return Number(value || 0).toLocaleString("vi-VN");
  };

  /* =====================================================
     FORMAT DATE TIME
  ===================================================== */

  const formatDateTime = (value) => {
    if (!value) {
      return "";
    }

    const date = new Date(value);

    if (Number.isNaN(date.getTime())) {
      return "";
    }

    return date.toLocaleString("vi-VN");
  };

  /* =====================================================
     TỔNG TIỀN
  ===================================================== */

  const totalMoney = data.reduce((sum, r) => sum + Number(r.price || 0), 0);

  /* =====================================================
     TOOLBAR
  ===================================================== */

  const Toolbar = () => (
    <div className="flex gap-2 mb-3 items-center flex-wrap">
      {/* =================================================
          THÁNG
      ================================================= */}

      <div className="flex items-center gap-1">
        <span className="text-xs font-semibold">Tháng:</span>

        <input
          type="month"
          value={monthFilter}
          onChange={handleMonthChange}
          className="border rounded px-2 py-1 text-sm"
        />
      </div>

      {/* =================================================
          FILE INPUT
      ================================================= */}

      <input
        type="file"
        ref={fileInputRef}
        onChange={handleSelectFile}
        className="hidden"
        accept=".xlsx,.xls"
      />

      {/* =================================================
          CHỌN FILE
      ================================================= */}

      <button
        onClick={() => fileInputRef.current?.click()}
        className="border px-2 py-1 rounded bg-white"
      >
        {importFile ? "Đã chọn file" : "Chọn file"}
      </button>

      {/* =================================================
          TÊN FILE
      ================================================= */}

      {importFile && (
        <span className="text-xs text-gray-600 max-w-[250px] truncate">
          {importFile.name}
        </span>
      )}

      {/* =================================================
          IMPORT
      ================================================= */}

      <button
        onClick={handleImport}
        disabled={!importFile || importing}
        className="bg-blue-600 text-white px-3 py-1 rounded disabled:opacity-50"
      >
        {importing ? "Đang import..." : "Import"}
      </button>

      {/* =================================================
          XÓA THEO THÁNG
      ================================================= */}

      <button
        onClick={handleDeleteByMonth}
        disabled={!monthFilter}
        className="bg-red-600 text-white px-2 py-1 rounded disabled:opacity-50"
      >
        Xóa theo tháng
      </button>

      {/* =================================================
          TRẠNG THÁI IMPORT
      ================================================= */}

      {importing && (
        <span className="text-blue-600 text-xs">Đang nhập dữ liệu...</span>
      )}

      {!importing && importTotal > 0 && (
        <span className="text-green-700 text-xs">
          Đã nhập {importDone}/{importTotal} dòng
        </span>
      )}

      {/* =================================================
    CẬP NHẬT VEHICLE PROFIT
      ================================================= */}

      <button
        type="button"
        onClick={handleUpdateVehicleProfit}
        disabled={!monthFilter || updatingVehicleProfit}
        className="bg-green-600 text-white px-3 py-1 rounded disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {updatingVehicleProfit ? "Đang cập nhật..." : "Cập nhật chi phí"}
      </button>

      {/* =================================================
    XEM VEHICLE PROFIT
================================================= */}

      <button
        onClick={() => setShowVehicleProfitModal(true)}
        disabled={!monthFilter}
        className="bg-purple-600 text-white px-3 py-1 rounded disabled:opacity-50"
      >
        Xem chi phí
      </button>
    </div>
  );

  /* =====================================================
     TABLE
  ===================================================== */

  return (
    <div className="p-4">
      <Toolbar />

      {/* =================================================
          SUMMARY
      ================================================= */}

      <div className="flex justify-between items-center mb-2 text-xs">
        <div>
          Tổng số dòng trang này: <b>{data.length}</b>
          {total > 0 && (
            <>
              {" "}
              / Tổng dữ liệu: <b>{total}</b>
            </>
          )}
        </div>

        <div>
          Tổng tiền trang này:{" "}
          <b className="text-red-600">{formatMoney(totalMoney)}</b> VNĐ
        </div>
      </div>

      {/* =================================================
          LOADING
      ================================================= */}

      {loading && (
        <p className="text-sm text-gray-500 mb-2">Đang tải dữ liệu...</p>
      )}

      {/* =================================================
          TABLE
      ================================================= */}

      <div className="border rounded-lg overflow-auto max-h-[70vh] shadow-sm">
        <table className="min-w-[1400px] w-full table-auto border-separate border-spacing-0 text-xs">
          <thead className="sticky top-0 bg-blue-600 text-white z-20">
            <tr>
              {[
                "STT",
                "MÃ GD",
                "TRẠM VÀO",
                "THỜI GIAN TRẠM VÀO",
                "TRẠM RA",
                "THỜI GIAN TRẠM RA",
                "THỜI GIAN THỰC HIỆN GD",
                "BIỂN SỐ XE",
                "HÌNH THỨC THU PHÍ",
                "LOẠI VÉ",
                "GIÁ TIỀN",
              ].map((h) => (
                <th
                  key={h}
                  className="border px-2 py-2 text-center whitespace-nowrap"
                >
                  {h === "BIỂN SỐ XE" ? (
                    <div className="relative flex flex-col">
                      <span
                        className="cursor-pointer select-none"
                        onClick={(e) => {
                          const rect = e.currentTarget.getBoundingClientRect();

                          setDropdownPos({
                            top: rect.bottom + window.scrollY,
                            left: rect.left + window.scrollX,
                          });

                          setShowBsxDropdown((p) => !p);
                        }}
                      >
                        {h}
                      </span>

                      {/* =================================================
                          DROPDOWN BSX
                      ================================================= */}

                      {showBsxDropdown && (
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
                            placeholder="Tìm biển số..."
                            className="w-full border rounded px-1 mb-1"
                            value={bsxSearch}
                            onChange={(e) => setBsxSearch(e.target.value)}
                          />

                          {/* CHỌN TẤT CẢ */}

                          <label className="flex items-center gap-1 mb-1">
                            <input
                              type="checkbox"
                              checked={
                                bsxOptions.length > 0 &&
                                bsxFilter.length === bsxOptions.length
                              }
                              onChange={(e) => {
                                setBsxFilter(
                                  e.target.checked ? [...bsxOptions] : [],
                                );

                                setPage(1);
                              }}
                            />

                            <span>Chọn tất cả</span>
                          </label>

                          {/* DANH SÁCH BSX */}

                          <div className="max-h-40 overflow-auto">
                            {bsxOptions
                              .filter((v) =>
                                String(v)
                                  .toLowerCase()
                                  .includes(bsxSearch.toLowerCase()),
                              )
                              .map((v) => (
                                <label
                                  key={v}
                                  className="flex items-center gap-1 mb-1"
                                >
                                  <input
                                    type="checkbox"
                                    checked={bsxFilter.includes(v)}
                                    onChange={(e) => {
                                      setBsxFilter((prev) =>
                                        e.target.checked
                                          ? [...prev, v]
                                          : prev.filter((x) => x !== v),
                                      );

                                      setPage(1);
                                    }}
                                  />

                                  <span>{v}</span>
                                </label>
                              ))}
                          </div>

                          {/* ĐÓNG */}

                          <button
                            onClick={() => setShowBsxDropdown(false)}
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
            {data.map((r, i) => (
              <tr
                key={r._id}
                className={
                  r.isDontMatchCP
                    ? "text-red-600 even:bg-red-50 hover:bg-red-100"
                    : "even:bg-gray-50 hover:bg-blue-50"
                }
              >
                {/* STT */}
                <td className="border px-2 py-1 text-center">
                  {(page - 1) * limit + i + 1}
                </td>

                {/* MÃ GD */}
                <td className="border px-2 py-1">{r.maGD}</td>

                {/* TRẠM VÀO */}
                <td className="border px-2 py-1">{r.TramVao}</td>

                {/* TIME IN */}
                <td className="border px-2 py-1 text-center whitespace-nowrap">
                  {formatDateTime(r.TimeIn)}
                </td>

                {/* TRẠM RA */}
                <td className="border px-2 py-1">{r.TramRa}</td>

                {/* TIME OUT */}
                <td className="border px-2 py-1 text-center whitespace-nowrap">
                  {formatDateTime(r.TimeOut)}
                </td>

                {/* TIME ACTIONS */}
                <td className="border px-2 py-1 text-center whitespace-nowrap">
                  {formatDateTime(r.TimeActions)}
                </td>

                {/* BSX */}
                <td className="border px-2 py-1 font-semibold">{r.bienSoXe}</td>

                {/* HÌNH THỨC THU PHÍ */}
                <td className="border px-2 py-1">{r.htThuPhi}</td>

                {/* LOẠI VÉ */}
                <td className="border px-2 py-1 text-center">{r.loaiVe}</td>

                {/* GIÁ */}
                <td className="border px-2 py-1 text-right font-semibold">
                  {formatMoney(r.price)}
                </td>
              </tr>
            ))}

            {!loading && data.length === 0 && (
              <tr>
                <td
                  colSpan={11}
                  className="border px-2 py-8 text-center text-gray-500"
                >
                  Không có dữ liệu
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* =====================================================
          PHÂN TRANG
      ===================================================== */}

      <div className="flex gap-2 justify-center mt-3 text-xs items-center">
        <button
          disabled={loading || page === 1}
          onClick={() => setPage((p) => Math.max(1, p - 1))}
          className="border px-3 py-1 rounded disabled:opacity-50"
        >
          ◀ Trước
        </button>

        <span>
          Trang <b>{page}</b> / <b>{totalPages}</b>
        </span>

        <button
          disabled={loading || page === totalPages}
          onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
          className="border px-3 py-1 rounded disabled:opacity-50"
        >
          Sau ▶
        </button>
      </div>

      {showVehicleProfitModal && (
        <VehicleProfitEpassTurnModal
          month={monthFilter}
          onClose={() => setShowVehicleProfitModal(false)}
        />
      )}
    </div>
  );
}
