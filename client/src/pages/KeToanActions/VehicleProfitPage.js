import React, { useMemo, useState } from "react";
import axios from "axios";
import {
  FiRefreshCw,
  FiPlus,
  FiSearch,
  FiSave,
  FiTrendingUp,
  FiDollarSign,
  FiBarChart2,
  FiUpload,
  FiDownload,
} from "react-icons/fi";

import API from "../../api";

const VehicleProfitPage = ({ user }) => {
  // =====================================================
  // STATE
  // =====================================================
  const [monthYear, setMonthYear] = useState("");
  const [data, setData] = useState([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(false);
  const [creating, setCreating] = useState(false);
  const [recalculating, setRecalculating] = useState(false);
  const [savingId, setSavingId] = useState(null);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [importing, setImporting] = useState(false);

  // =====================================================
  // TẠO MÃ LỢI NHUẬN TỪ THÁNG + NĂM
  // =====================================================
  const getMaLoiNhuan = () => {
    if (!monthYear) {
      return "";
    }

    const [year, month] = monthYear.split("-");

    if (!year || !month) {
      return "";
    }

    return `LN.${Number(month)}.${year}`;
  };

  // =====================================================
  // FORMAT TIỀN
  // =====================================================

  const formatMoney = (value) => {
    const number = Number(value || 0);

    return number.toLocaleString("vi-VN");
  };

  // =====================================================
  // LẤY DỮ LIỆU
  // =====================================================
  const fetchProfit = async () => {
    const maLoiNhuan = getMaLoiNhuan();

    if (!maLoiNhuan) {
      setError("Vui lòng chọn tháng và năm");
      return;
    }

    try {
      setLoading(true);
      setError("");
      setMessage("");

      const res = await axios.get(`${API}/vehicle-profit`, {
        params: {
          maLoiNhuan,
        },
      });

      if (res.data.success) {
        setData(res.data.data || []);

        setMessage(
          `Đã tải dữ liệu ${maLoiNhuan}: ${res.data.data?.length || 0} xe`,
        );
      }
    } catch (err) {
      console.error(err);

      setData([]);

      setError(
        err.response?.data?.message || "Không lấy được dữ liệu lợi nhuận",
      );
    } finally {
      setLoading(false);
    }
  };

  // =====================================================
  // TẠO KỲ LỢI NHUẬN
  // =====================================================
  const handleCreate = async () => {
    const maLoiNhuan = getMaLoiNhuan();

    if (!maLoiNhuan) {
      setError("Vui lòng chọn tháng và năm");
      return;
    }

    try {
      setCreating(true);
      setError("");
      setMessage("");

      const res = await axios.post(`${API}/vehicle-profit/create`, {
        maLoiNhuan,
      });

      if (res.data.success) {
        setData(res.data.data || []);

        setMessage(
          `Đã tạo kỳ ${res.data.maLoiNhuan}. ` +
            `Tạo mới: ${res.data.createdCount}, ` +
            `đã tồn tại: ${res.data.skippedCount}`,
        );
      }
    } catch (err) {
      console.error(err);

      setError(err.response?.data?.message || "Không thể tạo kỳ lợi nhuận");
    } finally {
      setCreating(false);
    }
  };

  // =====================================================
  // TÍNH LẠI TOÀN BỘ
  // =====================================================
  const handleRecalculate = async () => {
    const maLoiNhuan = getMaLoiNhuan();

    if (!maLoiNhuan) {
      setError("Vui lòng chọn tháng và năm");
      return;
    }

    const confirmed = window.confirm(
      `Tính lại doanh thu và lợi nhuận của ${maLoiNhuan}?\n\n` +
        `Doanh thu sẽ được lấy lại từ ScheduleAdmin theo ngày giao hàng.\n` +
        `Chi phí đã nhập sẽ được giữ nguyên.`,
    );

    if (!confirmed) {
      return;
    }

    try {
      setRecalculating(true);
      setError("");
      setMessage("");

      const res = await axios.put(`${API}/vehicle-profit/recalculate`, {
        maLoiNhuan,
      });

      if (res.data.success) {
        setData(res.data.data || []);

        setMessage(`Đã tính lại doanh thu và lợi nhuận ${maLoiNhuan}`);
      }
    } catch (err) {
      console.error(err);

      setError(err.response?.data?.message || "Không thể tính lại lợi nhuận");
    } finally {
      setRecalculating(false);
    }
  };

  // =====================================================
  // THAY ĐỔI CHI PHÍ
  // =====================================================
  const handleChangeCost = (id, value) => {
    setData((prev) =>
      prev.map((item) => {
        if (item._id !== id) {
          return item;
        }

        const chiPhi =
          value === "" ? "" : Number(String(value).replace(/\D/g, ""));

        const doanhThu = Number(item.doanhThu || 0);

        const loiNhuan = doanhThu - Number(chiPhi || 0);

        return {
          ...item,
          chiPhi,
          loiNhuan,
        };
      }),
    );
  };

  // =====================================================
  // LƯU CHI PHÍ
  // =====================================================

  const handleSaveCost = async (item) => {
    const maLoiNhuan = getMaLoiNhuan();

    if (!maLoiNhuan) {
      setError("Vui lòng chọn tháng và năm");
      return;
    }

    try {
      setSavingId(item._id);
      setError("");
      setMessage("");

      const res = await axios.put(
        `${API}/vehicle-profit/${encodeURIComponent(item.bsx)}`,
        {
          maLoiNhuan,
          chiPhi: Number(item.chiPhi || 0),
        },
      );

      if (res.data.success) {
        setData((prev) =>
          prev.map((row) => (row._id === item._id ? res.data.data : row)),
        );

        setMessage(`Đã lưu chi phí cho ${item.bsx}`);
      }
    } catch (err) {
      console.error(err);

      setError(err.response?.data?.message || "Không thể lưu chi phí");
    } finally {
      setSavingId(null);
    }
  };

  // =====================================================
  // LỌC BIỂN SỐ
  // =====================================================

  const filteredData = useMemo(() => {
    const keyword = search.trim().toUpperCase();

    if (!keyword) {
      return data;
    }

    return data.filter((item) =>
      String(item.bsx || "")
        .toUpperCase()
        .includes(keyword),
    );
  }, [data, search]);

  // =====================================================
  // TỔNG
  // =====================================================

  const totals = useMemo(() => {
    return data.reduce(
      (acc, item) => {
        acc.doanhThu += Number(item.doanhThu || 0);

        acc.chiPhi += Number(item.chiPhi || 0);

        acc.loiNhuan += Number(item.loiNhuan || 0);

        return acc;
      },
      {
        doanhThu: 0,
        chiPhi: 0,
        loiNhuan: 0,
      },
    );
  }, [data]);

  // =====================================================
  // XUẤT EXCEL
  // =====================================================
  const handleExportExcel = async () => {
    const maLoiNhuan = getMaLoiNhuan();

    if (!maLoiNhuan) {
      setError("Vui lòng chọn tháng và năm");
      return;
    }

    try {
      setError("");
      setMessage("");

      const res = await axios.get(`${API}/vehicle-profit/export`, {
        params: {
          maLoiNhuan,
        },
        responseType: "blob",
      });

      // ==========================================
      // TẠO FILE DOWNLOAD
      // ==========================================
      const blob = new Blob([res.data], {
        type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      });

      const url = window.URL.createObjectURL(blob);

      const link = document.createElement("a");

      link.href = url;

      link.download = `Loi_nhuan_${maLoiNhuan}.xlsx`;

      document.body.appendChild(link);

      link.click();

      link.remove();

      window.URL.revokeObjectURL(url);

      setMessage(`Đã xuất Excel lợi nhuận ${maLoiNhuan}`);
    } catch (err) {
      console.error(err);

      // ==========================================
      // Nếu backend trả JSON lỗi nhưng responseType
      // là blob thì đọc lại lỗi
      // ==========================================
      let message = "Không thể xuất Excel";

      if (err.response?.data instanceof Blob) {
        try {
          const text = await err.response.data.text();

          const json = JSON.parse(text);

          message = json.message || message;
        } catch {
          // Không làm gì
        }
      } else {
        message = err.response?.data?.message || message;
      }

      setError(message);
    }
  };

  // =====================================================
  // NHẬP EXCEL
  // =====================================================
  const handleImportExcel = async (event) => {
    const file = event.target.files?.[0];

    // Reset input để có thể chọn lại cùng file
    event.target.value = "";

    if (!file) {
      return;
    }

    // ==========================================
    // KIỂM TRA THÁNG
    // ==========================================
    const maLoiNhuan = getMaLoiNhuan();

    if (!maLoiNhuan) {
      setError("Vui lòng chọn tháng và năm trước khi nhập Excel");
      return;
    }

    // ==========================================
    // KIỂM TRA FILE
    // ==========================================
    const fileName = file.name.toLowerCase();

    if (!fileName.endsWith(".xlsx") && !fileName.endsWith(".xls")) {
      setError("Vui lòng chọn file Excel (.xlsx hoặc .xls)");
      return;
    }

    // ==========================================
    // XÁC NHẬN
    // ==========================================
    const confirmed = window.confirm(
      `Nhập chi phí từ file Excel cho ${maLoiNhuan}?\n\n` +
        `Hệ thống sẽ kiểm tra BSX + Mã LN và cập nhật chi phí tương ứng.\n` +
        `Doanh thu và lợi nhuận trong file Excel sẽ không được sử dụng.`,
    );

    if (!confirmed) {
      return;
    }

    try {
      setImporting(true);
      setError("");
      setMessage("");

      const formData = new FormData();

      formData.append("file", file);

      const res = await axios.post(
        `${API}/vehicle-profit/import-cost`,
        formData,
        {
          headers: {
            "Content-Type": "multipart/form-data",
          },
        },
      );

      if (res.data.success) {
        // ==========================================
        // CẬP NHẬT DATA
        //
        // API trả về tất cả bản ghi của các mã LN
        // trong file.
        //
        // Chỉ lấy đúng kỳ đang xem.
        // ==========================================
        const importedData = (res.data.data || []).filter(
          (item) => item.maLoiNhuan === maLoiNhuan,
        );

        setData(importedData);

        let messageText =
          `Đã nhập chi phí ${maLoiNhuan}. ` +
          `Cập nhật: ${res.data.updatedCount || 0} dòng`;

        if (res.data.skippedCount > 0) {
          messageText += `, bỏ qua: ${res.data.skippedCount} dòng`;
        }

        setMessage(messageText);

        // ==========================================
        // NẾU CÓ DÒNG BỊ BỎ QUA
        // HIỂN THỊ CHI TIẾT TRONG CONSOLE
        // ==========================================
        if (res.data.skippedCount > 0) {
          console.warn("Các dòng bị bỏ qua:", res.data.skipped);
        }
      }
    } catch (err) {
      console.error(err);

      setError(
        err.response?.data?.message || "Không thể nhập chi phí từ Excel",
      );
    } finally {
      setImporting(false);
    }
  };

  // =====================================================
  // RENDER
  // =====================================================

  return (
    <div className="p-4">
      {/* =================================================
          HEADER
      ================================================= */}

      <div className="bg-white rounded-lg shadow-sm border p-4 mb-4">
        <div>
          <h1 className="text-xl font-bold text-gray-800">
            LỢI NHUẬN CỦA XE THEO THÁNG
          </h1>
        </div>

        {/* =================================================
            CONTROL
        ================================================= */}

        <div className="flex flex-wrap items-end gap-2 mt-4">
          {/* THÁNG + NĂM */}

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Tháng / Năm
            </label>

            <input
              type="month"
              value={monthYear}
              onChange={(e) => {
                setMonthYear(e.target.value);

                // Đổi tháng thì xóa thông báo cũ
                setError("");
                setMessage("");
              }}
              className="
                border border-gray-300
                rounded-md
                px-3
                py-2
                w-44
                outline-none
                focus:ring-2
                focus:ring-blue-500
              "
            />
          </div>

          {/* HIỂN THỊ MÃ */}

          {monthYear && (
            <div className="flex flex-col justify-end">
              <span className="text-xs text-gray-500 mb-1">Mã lợi nhuận</span>

              <div
                className="
                  px-3
                  py-2
                  bg-gray-100
                  border
                  border-gray-300
                  rounded-md
                  font-semibold
                  text-gray-700
                  min-w-[110px]
                  text-center
                "
              >
                {getMaLoiNhuan()}
              </div>
            </div>
          )}

          {/* XEM */}

          <button
            onClick={fetchProfit}
            disabled={loading || !monthYear}
            className="
              flex items-center gap-2
              px-4 py-2
              rounded-md
              bg-blue-600
              text-white
              hover:bg-blue-700
              disabled:opacity-50
            "
          >
            <FiSearch />

            {loading ? "Đang tải..." : "Xem"}
          </button>

          {/* TẠO */}

          <button
            onClick={handleCreate}
            disabled={creating || !monthYear}
            className="
              flex items-center gap-2
              px-4 py-2
              rounded-md
              bg-green-600
              text-white
              hover:bg-green-700
              disabled:opacity-50
            "
          >
            <FiPlus />

            {creating ? "Đang tạo..." : "Tạo kỳ"}
          </button>

          {/* TÍNH LẠI */}

          <button
            onClick={handleRecalculate}
            disabled={recalculating || !monthYear || data.length === 0}
            className="
              flex items-center gap-2
              px-4 py-2
              rounded-md
              bg-orange-500
              text-white
              hover:bg-orange-600
              disabled:opacity-50
            "
          >
            <FiRefreshCw />

            {recalculating ? "Đang tính..." : "Tính lại"}
          </button>

          {/* XUẤT EXCEL */}

          <button
            onClick={handleExportExcel}
            disabled={!monthYear || data.length === 0}
            className="
    flex items-center gap-2
    px-4 py-2
    rounded-md
    bg-indigo-600
    text-white
    hover:bg-indigo-700
    disabled:opacity-50
  "
          >
            <FiDownload />
            Xuất Excel
          </button>

          {/* NHẬP EXCEL */}

          <label
            className={`
    flex items-center gap-2
    px-4 py-2
    rounded-md
    bg-teal-600
    text-white
    hover:bg-teal-700
    cursor-pointer
    ${importing || !monthYear ? "opacity-50 cursor-not-allowed" : ""}
  `}
          >
            <FiUpload />

            {importing ? "Đang nhập..." : "Nhập chi phí"}

            <input
              type="file"
              accept=".xlsx,.xls"
              className="hidden"
              disabled={importing || !monthYear}
              onChange={handleImportExcel}
            />
          </label>
        </div>

        {/* MESSAGE */}

        {message && (
          <div className="mt-3 px-3 py-2 rounded bg-green-50 text-green-700 text-sm">
            {message}
          </div>
        )}

        {error && (
          <div className="mt-3 px-3 py-2 rounded bg-red-50 text-red-700 text-sm">
            {error}
          </div>
        )}
      </div>

      {/* =================================================
          SUMMARY
      ================================================= */}

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
        {/* DOANH THU */}

        <div className="bg-white rounded-lg shadow-sm border p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500">Tổng doanh thu</p>

              <p className="text-2xl font-bold text-blue-600 mt-1">
                {formatMoney(totals.doanhThu)} VNĐ
              </p>
            </div>

            <div className="p-3 rounded-full bg-blue-50">
              <FiTrendingUp size={22} className="text-blue-600" />
            </div>
          </div>
        </div>

        {/* CHI PHÍ */}

        <div className="bg-white rounded-lg shadow-sm border p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500">Tổng chi phí</p>

              <p className="text-2xl font-bold text-orange-600 mt-1">
                {formatMoney(totals.chiPhi)} VNĐ
              </p>
            </div>

            <div className="p-3 rounded-full bg-orange-50">
              <FiDollarSign size={22} className="text-orange-600" />
            </div>
          </div>
        </div>

        {/* LỢI NHUẬN */}

        <div className="bg-white rounded-lg shadow-sm border p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500">Tổng lợi nhuận</p>

              <p
                className={`text-2xl font-bold mt-1 ${
                  totals.loiNhuan >= 0 ? "text-green-600" : "text-red-600"
                }`}
              >
                {formatMoney(totals.loiNhuan)} VNĐ
              </p>
            </div>

            <div className="p-3 rounded-full bg-green-50">
              <FiBarChart2 size={22} className="text-green-600" />
            </div>
          </div>
        </div>
      </div>

      {/* =================================================
          TABLE
      ================================================= */}

      <div className="bg-white rounded-lg shadow-sm border">
        {/* SEARCH */}

        <div className="p-4 border-b flex items-center justify-between gap-3">
          <div className="relative w-full max-w-sm">
            <FiSearch
              className="
                absolute
                left-3
                top-1/2
                -translate-y-1/2
                text-gray-400
              "
            />

            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Tìm biển số xe..."
              className="
                w-full
                border
                border-gray-300
                rounded-md
                pl-9
                pr-3
                py-2
                outline-none
                focus:ring-2
                focus:ring-blue-500
              "
            />
          </div>

          <div className="text-sm text-gray-500">
            {filteredData.length} / {data.length} xe
          </div>
        </div>

        {/* TABLE */}

        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-100">
              <tr>
                <th className="border px-3 py-3 text-center w-16">STT</th>

                <th className="border px-3 py-3 text-center">BIỂN SỐ XE</th>

                <th className="border px-3 py-3 text-center">DOANH THU</th>

                <th className="border px-3 py-3 text-center">CHI PHÍ</th>

                <th className="border px-3 py-3 text-center">LỢI NHUẬN</th>

                <th className="border px-3 py-3 text-center">MÃ LN</th>

                <th className="border px-3 py-3 text-center w-28">Thao tác</th>
              </tr>
            </thead>

            <tbody>
              {filteredData.length === 0 ? (
                <tr>
                  <td
                    colSpan={7}
                    className="border px-4 py-12 text-center text-gray-500"
                  >
                    {loading
                      ? "Đang tải dữ liệu..."
                      : "Chưa có dữ liệu lợi nhuận"}
                  </td>
                </tr>
              ) : (
                filteredData.map((item, index) => {
                  const loiNhuan =
                    Number(item.doanhThu || 0) - Number(item.chiPhi || 0);

                  return (
                    <tr key={item._id} className="hover:bg-gray-50">
                      {/* STT */}

                      <td className="border px-3 py-2 text-center">
                        {index + 1}
                      </td>

                      {/* BSX */}

                      <td className="border px-3 py-2 font-semibold">
                        {item.bsx}
                      </td>

                      {/* DOANH THU */}

                      <td className="border px-3 py-2 text-right font-medium text-blue-600">
                        {formatMoney(item.doanhThu)} VNĐ
                      </td>

                      {/* CHI PHÍ */}

                      <td className="border px-3 py-2">
                        <div className="flex items-center gap-2 justify-end">
                          <input
                            type="text"
                            value={
                              item.chiPhi === "" ? "" : formatMoney(item.chiPhi)
                            }
                            onChange={(e) => {
                              const raw = e.target.value.replace(/\D/g, "");

                              handleChangeCost(item._id, raw);
                            }}
                            className="
                              w-40
                              border
                              border-gray-300
                              rounded-md
                              px-2
                              py-1.5
                              text-right
                              outline-none
                              focus:ring-2
                              focus:ring-orange-400
                            "
                          />

                          <span className="text-gray-500">VNĐ</span>
                        </div>
                      </td>

                      {/* LỢI NHUẬN */}

                      <td
                        className={`border px-3 py-2 text-right font-bold ${
                          loiNhuan >= 0 ? "text-green-600" : "text-red-600"
                        }`}
                      >
                        {formatMoney(loiNhuan)} VNĐ
                      </td>

                      {/* MÃ */}

                      <td className="border px-3 py-2 text-center font-medium">
                        {item.maLoiNhuan}
                      </td>

                      {/* SAVE */}

                      <td className="border px-3 py-2 text-center">
                        <button
                          onClick={() => handleSaveCost(item)}
                          disabled={savingId === item._id}
                          className="
                            inline-flex
                            items-center
                            gap-1
                            px-3
                            py-1.5
                            rounded-md
                            bg-blue-600
                            text-white
                            hover:bg-blue-700
                            disabled:opacity-50
                          "
                        >
                          <FiSave />

                          {savingId === item._id ? "Lưu..." : "Lưu"}
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>

            {/* FOOTER */}

            {data.length > 0 && (
              <tfoot className="bg-gray-50 font-bold">
                <tr>
                  <td colSpan={2} className="border px-3 py-3 text-right">
                    TỔNG
                  </td>

                  <td className="border px-3 py-3 text-right text-blue-600">
                    {formatMoney(totals.doanhThu)} VNĐ
                  </td>

                  <td className="border px-3 py-3 text-right text-orange-600">
                    {formatMoney(totals.chiPhi)} VNĐ
                  </td>

                  <td
                    className={`border px-3 py-3 text-right ${
                      totals.loiNhuan >= 0 ? "text-green-600" : "text-red-600"
                    }`}
                  >
                    {formatMoney(totals.loiNhuan)} VNĐ
                  </td>

                  <td className="border" />

                  <td className="border" />
                </tr>
              </tfoot>
            )}
          </table>
        </div>
      </div>
    </div>
  );
};

export default VehicleProfitPage;
