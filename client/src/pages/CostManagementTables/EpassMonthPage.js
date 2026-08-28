import { useEffect, useState, useRef } from "react";
import axios from "axios";
import VehicleProfitEpassMonthModal from "../../components/CostModal/VehicleProfitEpassMonthModal";
import API from "../../api";

export default function EpassMonthPage() {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(false);

  const [importing, setImporting] = useState(false);
  const [importTotal, setImportTotal] = useState(0);
  const [importDone, setImportDone] = useState(0);

  const token = localStorage.getItem("token");
  const baseUrl = `${API}/epass-month`;

  const fileInputRef = useRef(null);
  const [importFile, setImportFile] = useState(null);

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
     MẶC ĐỊNH THÁNG HIỆN TẠI
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

  /* =====================================================
     FETCH DANH SÁCH BSX
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
       * Nếu trước đó chưa có filter
       * hoặc BSX cũ không còn tồn tại
       * thì chọn toàn bộ BSX
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
     FETCH BSX LẦN ĐẦU
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
      const res = await axios.get(baseUrl, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      let fetchedData = Array.isArray(res.data) ? res.data : [];

      /* =================================================
         FILTER THÁNG
         Theo dayBuy = NGÀY MUA
      ================================================= */

      if (monthFilter) {
        fetchedData = fetchedData.filter((r) => {
          if (!r.dayBuy) {
            return false;
          }

          const date = new Date(r.dayBuy);

          if (Number.isNaN(date.getTime())) {
            return false;
          }

          const year = date.getFullYear();
          const month = String(date.getMonth() + 1).padStart(2, "0");

          const ym = `${year}-${month}`;

          return ym === monthFilter;
        });
      }

      /* =================================================
         FILTER BIỂN SỐ
      ================================================= */

      if (bsxFilter.length > 0) {
        fetchedData = fetchedData.filter((r) => bsxFilter.includes(r.bienSoXe));
      } else {
        fetchedData = [];
      }

      setData(fetchedData);
    } catch (err) {
      console.error("Lỗi lấy dữ liệu Epass:", err);
    } finally {
      setLoading(false);
    }
  };

  /* =====================================================
     LOAD KHI FILTER THAY ĐỔI
  ===================================================== */

  useEffect(() => {
    /*
     * Chưa có danh sách BSX thì chưa fetch
     */
    if (bsxOptions.length === 0) {
      return;
    }

    fetchData();

    setImporting(false);
    setImportTotal(0);
    setImportDone(0);
  }, [monthFilter, bsxFilter]);

  /* =====================================================
     IMPORT
  ===================================================== */

  const handleSelectFile = (e) => {
    const file = e.target.files?.[0];

    if (!file) {
      return;
    }

    setImportFile(file);
  };

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

      const total = Number(res.data.total || 0);
      const inserted = Number(res.data.inserted || 0);

      setImportTotal(total);
      setImportDone(inserted);

      /*
       * Cập nhật lại danh sách BSX
       */
      await fetchFilterOptions();

      /*
       * Lấy lại data theo tháng + BSX hiện tại
       */
      await fetchData();

      alert(`Import thành công ${inserted} dòng.`);
    } catch (err) {
      console.error("IMPORT EPASS ERROR:", err);

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

  const handleDeleteByMonth = async () => {
    if (!monthFilter) {
      return alert("Vui lòng chọn tháng");
    }

    const [year, month] = monthFilter.split("-");

    if (
      !window.confirm(
        `Bạn có chắc muốn xoá toàn bộ Epass có ngày mua trong tháng ${month}/${year}?`,
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

      await fetchData();
    } catch (err) {
      console.error(err);
      alert(
        err.response?.data?.message || err.message || "Xoá dữ liệu thất bại",
      );
    }
  };

  const handleUpdateVehicleProfit = async () => {
    if (!monthFilter) {
      return alert("Vui lòng chọn tháng");
    }

    try {
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

      alert(res.data.message || "Cập nhật thành công");

      await fetchData();
    } catch (err) {
      console.error(
        "UPDATE EPASS VEHICLE PROFIT ERROR:",
        err.response?.data || err,
      );

      alert(
        err.response?.data?.message ||
          err.response?.data?.error ||
          "Cập nhật chi phí Epass thất bại",
      );
    }
  };

  /* =====================================================
     FORMAT
  ===================================================== */

  const formatMoney = (value) => {
    return Number(value || 0).toLocaleString("vi-VN");
  };

  const formatDate = (value) => {
    if (!value) {
      return "";
    }

    const date = new Date(value);

    if (Number.isNaN(date.getTime())) {
      return "";
    }

    return date.toLocaleDateString("vi-VN");
  };

  /* =====================================================
     TỔNG TIỀN
  ===================================================== */

  const totalMoney = data.reduce(
    (sum, r) => sum + Number(r.moneyAmount || 0),
    0,
  );

  /* =====================================================
     TOOLBAR
  ===================================================== */

  const Toolbar = () => (
    <div className="flex gap-2 mb-3 items-center flex-wrap">
      {/* =================================================
          THÁNG / NĂM
      ================================================= */}

      <div className="flex items-center gap-1">
        <span className="text-xs font-semibold">Tháng:</span>

        <input
          type="month"
          value={monthFilter}
          onChange={(e) => setMonthFilter(e.target.value)}
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
          XÓA TẤT CẢ
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
       CẬP NHẬT CP EPASS VÀO VEHICLE PROFIT
       ================================================= */}

      <button
        onClick={handleUpdateVehicleProfit}
        disabled={!monthFilter}
        className="bg-green-600 text-white px-3 py-1 rounded disabled:opacity-50"
      >
        Cập nhật chi phí
      </button>

      {/* =================================================
      XEM CHI PHÍ EPASS TRÊN VEHICLE PROFIT
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
          Tổng số dòng: <b>{data.length}</b>
        </div>

        <div>
          Tổng tiền: <b className="text-red-600">{formatMoney(totalMoney)}</b>{" "}
          VNĐ
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
        <table className="min-w-[1100px] w-full table-auto border-separate border-spacing-0 text-xs">
          <thead className="sticky top-0 bg-blue-600 text-white z-20">
            <tr>
              {[
                "STT",
                "BIỂN SỐ XE",
                "TRẠM / ĐOẠN",
                "LOẠI VÉ",
                "SỐ TIỀN",
                "NGÀY MUA",
                "TỪ NGÀY",
                "ĐẾN NGÀY",
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
              <tr key={r._id} className="even:bg-gray-50 hover:bg-blue-50">
                {/* STT */}

                <td className="border px-2 py-1 text-center">{i + 1}</td>

                {/* BSX */}

                <td className="border px-2 py-1 font-semibold">{r.bienSoXe}</td>

                {/* TRẠM / ĐOẠN */}

                <td className="border px-2 py-1">{r.tramDoan}</td>

                {/* LOẠI VÉ */}

                <td className="border px-2 py-1 text-center">{r.loaiVe}</td>

                {/* SỐ TIỀN */}

                <td className="border px-2 py-1 text-right font-semibold">
                  {formatMoney(r.moneyAmount)}
                </td>

                {/* NGÀY MUA */}

                <td className="border px-2 py-1 text-center whitespace-nowrap">
                  {formatDate(r.dayBuy)}
                </td>

                {/* TỪ NGÀY */}

                <td className="border px-2 py-1 text-center whitespace-nowrap">
                  {formatDate(r.dayFrom)}
                </td>

                {/* ĐẾN NGÀY */}

                <td className="border px-2 py-1 text-center whitespace-nowrap">
                  {formatDate(r.dayTo)}
                </td>
              </tr>
            ))}

            {/* =================================================
                KHÔNG CÓ DATA
            ================================================= */}

            {!loading && data.length === 0 && (
              <tr>
                <td
                  colSpan={8}
                  className="border px-2 py-8 text-center text-gray-500"
                >
                  Không có dữ liệu
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {showVehicleProfitModal && (
        <VehicleProfitEpassMonthModal
          month={monthFilter}
          onClose={() => setShowVehicleProfitModal(false)}
        />
      )}
    </div>
  );
}
