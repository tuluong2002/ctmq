import React, { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import {
  FiRefreshCw,
  FiPlus,
  FiSearch,
  FiSave,
  FiTrendingUp,
  FiDollarSign,
  FiBarChart2,
  FiDownload,
} from "react-icons/fi";

import API from "../../api";

/* =====================================================
   FORMAT TIỀN
===================================================== */

const formatMoneyStatic = (value) => {
  return Number(value || 0).toLocaleString("vi-VN");
};

/* =====================================================
   INPUT CHỈ ĐỌC
===================================================== */

const ReadOnlyCost = ({ value }) => {
  return (
    <div className="flex items-center gap-1">
      <input
        type="text"
        value={
          value === "" || value === undefined || value === null
            ? ""
            : formatMoneyStatic(value)
        }
        disabled
        className="
          w-full
          border border-gray-200
          rounded-md
          px-2 py-1.5
          text-right
          bg-gray-100
          text-black
          cursor-not-allowed
          outline-none
        "
      />
    </div>
  );
};

const VehicleProfitPage = ({ user }) => {
  const navigate = useNavigate();

  // =====================================================
  // PHÂN QUYỀN DOANH THU / LỢI NHUẬN
  // =====================================================

  const permissions = user?.permissions || [];

  const canViewAllDoanhThu = permissions.includes("all_doanh_thu");

  const canImportChiPhi = permissions.includes("add_cp_doanh_thu");

  const canAccessDoanhThuPage = canViewAllDoanhThu || canImportChiPhi;

  // =====================================================
  // STATE
  // =====================================================

  const [monthYear, setMonthYear] = useState("");
  const [data, setData] = useState([]);
  const [doanhThuTong, setDoanhThuTong] = useState(null);

  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(false);
  const [creating, setCreating] = useState(false);
  const [recalculating, setRecalculating] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

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
    if (Number(value) === 0) return "";

    return Number(value || 0).toLocaleString("vi-VN");
  };

  // =====================================================
  // TỔNG CHI PHÍ
  // =====================================================

  const getTotalCost = (item) => {
    return (
      Number(item.cpLuong || 0) +
      Number(item.cpNhienLieu || 0) +
      Number(item.cpSuaXe || 0) +
      Number(item.cpEpassMonth || 0) +
      Number(item.cpEpassTurn || 0) +
      Number(item.cpETC || 0) +
      Number(item.cpDKDKBH || 0) +
      Number(item.cpKhauHaoXe || 0) +
      Number(item.cpThanhToanLichTrinh || 0)
    );
  };

  // =====================================================
  // TÍNH LỢI NHUẬN
  // =====================================================

  const getProfit = (item) => {
    return Number(item.doanhThu || 0) - getTotalCost(item);
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
        setDoanhThuTong(res.data.doanhThuTong || null);

        setMessage(
          `Đã tải dữ liệu ${maLoiNhuan}: ${res.data.data?.length || 0} xe`,
        );
      }
    } catch (err) {
      console.error(err);

      setData([]);
      setDoanhThuTong(null);

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

        setDoanhThuTong(res.data.doanhThuTong || null);

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
      `Tính lại doanh thu của ${maLoiNhuan}?\n\n` +
        `Doanh thu sẽ được lấy lại từ ScheduleAdmin theo ngày giao hàng.\n` +
        `Các chi phí đã nhập sẽ được giữ nguyên.`,
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
        setDoanhThuTong(res.data.doanhThuTong || null);

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

        acc.cpLuong += Number(item.cpLuong || 0);
        acc.cpNhienLieu += Number(item.cpNhienLieu || 0);
        acc.cpSuaXe += Number(item.cpSuaXe || 0);
        acc.cpEpassMonth += Number(item.cpEpassMonth || 0);
        acc.cpEpassTurn += Number(item.cpEpassTurn || 0);
        acc.cpKhauHaoXe += Number(item.cpKhauHaoXe || 0);
        acc.cpETC += Number(item.cpETC || 0);
        acc.cpDKDKBH += Number(item.cpDKDKBH || 0);
        acc.cpThanhToanLichTrinh += Number(item.cpThanhToanLichTrinh || 0);

        acc.chiPhi += getTotalCost(item);

        acc.loiNhuan += getProfit(item);

        return acc;
      },
      {
        doanhThu: 0,
        cpLuong: 0,
        cpNhienLieu: 0,
        cpSuaXe: 0,
        cpEpassMonth: 0,
        cpEpassTurn: 0,
        cpKhauHaoXe: 0,
        cpETC: 0,
        cpDKDKBH: 0,
        cpThanhToanLichTrinh: 0,
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
  // RENDER
  // =====================================================

  if (!canAccessDoanhThuPage) {
    return (
      <div className="p-6">
        <div className="flex gap-2 items-center mb-4 text-xs">
          <button
            onClick={() => navigate("/ke-toan")}
            className="
              px-3 py-1
              rounded
              text-white
              bg-blue-500
            "
          >
            Trang chính
          </button>
        </div>

        <div
          className="
          bg-red-50
          border border-red-200
          rounded-lg
          p-6
          text-center
        "
        >
          <div
            className="
            text-red-600
            text-lg
            font-semibold
          "
          >
            Bạn không có quyền truy cập
          </div>

          <div
            className="
            text-red-500
            text-sm
            mt-1
          "
          >
            Bạn không có quyền xem dữ liệu doanh thu của xe.
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-4">
      {/* =================================================
          HEADER
      ================================================= */}

      <div className="flex gap-2 items-center mb-4 text-xs">
        <button
          onClick={() => navigate("/ke-toan")}
          className="
            px-3 py-1
            rounded
            text-white
            bg-blue-500
            hover:bg-blue-600
          "
        >
          Trang chính
        </button>
      </div>

      {/* =================================================
          CONTROL
      ================================================= */}

      <div
        className="
        bg-white
        rounded-lg
        shadow-sm
        border
        p-4
        mb-4
      "
      >
        <h1
          className="
          text-xl
          font-bold
          text-gray-800
        "
        >
          LỢI NHUẬN CỦA XE THEO THÁNG
        </h1>

        <div
          className="
          flex
          flex-wrap
          items-end
          gap-2
          mt-4
        "
        >
          {/* THÁNG */}

          <div>
            <label
              className="
              block
              text-sm
              font-medium
              text-gray-700
              mb-1
            "
            >
              Tháng / Năm
            </label>

            <input
              type="month"
              value={monthYear}
              onChange={(e) => {
                setMonthYear(e.target.value);
                setError("");
                setMessage("");
              }}
              className="
                border
                border-gray-300
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

          {/* MÃ LN */}

          {monthYear && (
            <div
              className="
              flex
              flex-col
              justify-end
            "
            >
              <span
                className="
                text-xs
                text-gray-500
                mb-1
              "
              >
                Mã lợi nhuận
              </span>

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
              flex
              items-center
              gap-2
              px-4
              py-2
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

          {canViewAllDoanhThu && (
            <button
              onClick={handleCreate}
              disabled={creating || !monthYear}
              className="
                flex
                items-center
                gap-2
                px-4
                py-2
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
          )}

          {/* TÍNH LẠI */}

          {canViewAllDoanhThu && (
            <button
              onClick={handleRecalculate}
              disabled={recalculating || !monthYear || data.length === 0}
              className="
                flex
                items-center
                gap-2
                px-4
                py-2
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
          )}

          {/* XUẤT */}

          {canViewAllDoanhThu && (
            <button
              onClick={handleExportExcel}
              disabled={!monthYear || data.length === 0}
              className="
                flex
                items-center
                gap-2
                px-4
                py-2
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
          )}
        </div>

        {/* MESSAGE */}

        {message && (
          <div
            className="
            mt-3
            px-3
            py-2
            rounded
            bg-green-50
            text-green-700
            text-sm
          "
          >
            {message}
          </div>
        )}

        {error && (
          <div
            className="
            mt-3
            px-3
            py-2
            rounded
            bg-red-50
            text-red-700
            text-sm
          "
          >
            {error}
          </div>
        )}
      </div>

      {/* =================================================
          SUMMARY
      ================================================= */}

      {canViewAllDoanhThu && (
        <div
          className="
  grid
  grid-cols-1
  md:grid-cols-4
  gap-4
  mb-4
"
        >
          {/* DOANH THU */}

          <div
            className="
    bg-white
    rounded-lg
    shadow-sm
    border
    p-4
  "
          >
            <div
              className="
      flex
      items-center
      justify-between
    "
            >
              <div>
                <p
                  className="
          text-sm
          text-gray-500
        "
                >
                  Tổng doanh thu
                </p>

                <p
                  className="
          text-2xl
          font-bold
          text-blue-600
          mt-1
        "
                >
                  {formatMoney(doanhThuTong?.tongDoanhThu)} VNĐ
                </p>
              </div>

              <div
                className="
        p-3
        rounded-full
        bg-blue-50
      "
              >
                <FiTrendingUp size={22} className="text-blue-600" />
              </div>
            </div>
          </div>

          {/* CHI PHÍ */}

          <div
            className="
    bg-white
    rounded-lg
    shadow-sm
    border
    p-4
  "
          >
            <div
              className="
      flex
      items-center
      justify-between
    "
            >
              <div>
                <p
                  className="
          text-sm
          text-gray-500
        "
                >
                  Tổng chi phí theo xe
                </p>

                <p
                  className="
          text-2xl
          font-bold
          text-orange-600
          mt-1
        "
                >
                  {formatMoney(doanhThuTong?.tongChiPhiTheoXe)} VNĐ
                </p>
              </div>

              <div
                className="
        p-3
        rounded-full
        bg-orange-50
      "
              >
                <FiDollarSign size={22} className="text-orange-600" />
              </div>
            </div>
          </div>

          {/* CHI PHÍ KHÁC - THÊM MỚI */}

          <div
            className="
    bg-white
    rounded-lg
    shadow-sm
    border
    p-4
  "
          >
            <div
              className="
      flex
      items-center
      justify-between
    "
            >
              <div>
                <p
                  className="
          text-sm
          text-gray-500
        "
                >
                  Chi phí khác
                </p>

                <p
                  className="
          text-2xl
          font-bold
          text-purple-600
          mt-1
        "
                >
                  {formatMoney(doanhThuTong?.chiPhiKhac) || 0} VNĐ
                </p>
              </div>

              <div
                className="
        p-3
        rounded-full
        bg-purple-50
      "
              >
                <FiDollarSign size={22} className="text-purple-600" />
              </div>
            </div>
          </div>

          {/* LỢI NHUẬN */}

          <div
            className="
    bg-white
    rounded-lg
    shadow-sm
    border
    p-4
  "
          >
            <div
              className="
      flex
      items-center
      justify-between
    "
            >
              <div>
                <p
                  className="
          text-sm
          text-gray-500
        "
                >
                  Tổng lợi nhuận
                </p>

                <p
                  className={`
            text-2xl
            font-bold
            mt-1
            ${totals.loiNhuan >= 0 ? "text-green-600" : "text-red-600"}
          `}
                >
                  {formatMoney(doanhThuTong?.loiNhuan)} VNĐ
                </p>
              </div>

              <div
                className="
        p-3
        rounded-full
        bg-green-50
      "
              >
                <FiBarChart2 size={22} className="text-green-600" />
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ================================================= TABLE ================================================= */}
      <div className="bg-white rounded-lg shadow-sm border overflow-hidden">
        {/* SEARCH */}
        <div className="p-4 border-b flex items-center justify-between gap-3">
          <div className="relative w-full max-w-sm">
            <FiSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Tìm biển số xe..."
              className="w-full border border-gray-300 rounded-md pl-9 pr-3 py-2 outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div className="text-sm text-gray-500 whitespace-nowrap">
            {filteredData.length} / {data.length} xe
          </div>
        </div>

        {/* TABLE */}
        <div className="overflow-auto max-h-[70vh]">
          <table className="min-w-[2000px] w-full text-xs border-separate border-spacing-0">
            <thead className="sticky top-0 z-20 bg-blue-600 text-white">
              <tr>
                <th className="border border-blue-500 px-3 py-3 text-center w-14">
                  STT
                </th>
                <th className="border border-blue-500 px-3 py-3 text-center min-w-[140px] sticky left-0 z-30 bg-blue-600">
                  BIỂN SỐ XE
                </th>
                <th className="border border-blue-500 px-3 py-3 text-center min-w-[150px]">
                  ĐƠN VỊ VẬN TẢI
                </th>
                <th className="border border-blue-500 px-3 py-3 text-center min-w-[150px]">
                  DOANH THU
                </th>
                <th className="border border-blue-500 px-3 py-3 text-center min-w-[160px]">
                  NHIÊN LIỆU
                </th>
                <th className="border border-blue-500 px-3 py-3 text-center min-w-[150px]">
                  SỬA XE
                </th>
                <th className="border border-blue-500 px-3 py-3 text-center min-w-[160px]">
                  EPASS THÁNG
                </th>
                <th className="border border-blue-500 px-3 py-3 text-center min-w-[150px]">
                  EPASS LƯỢT
                </th>
                <th className="border border-blue-500 px-3 py-3 text-center min-w-[160px]">
                  KHẤU HAO XE
                </th>
                <th className="border border-blue-500 px-3 py-3 text-center min-w-[150px]">
                  ETC
                </th>
                <th className="border border-blue-500 px-3 py-3 text-center min-w-[170px]">
                  ĐK - ĐK - BH XE
                </th>
                <th className="border border-blue-500 px-3 py-3 text-center min-w-[190px]">
                  THANH TOÁN LỊCH TRÌNH
                </th>
                <th className="border border-blue-500 px-3 py-3 text-center min-w-[170px]">
                  LƯƠNG CƠ BẢN
                </th>
                <th className="border border-blue-500 px-3 py-3 text-center min-w-[160px]">
                  TỔNG CHI PHÍ
                </th>
                <th className="border border-blue-500 px-3 py-3 text-center min-w-[160px]">
                  LỢI NHUẬN
                </th>
                <th className="border border-blue-500 px-3 py-3 text-center min-w-[110px]">
                  MÃ LN
                </th>
              </tr>
            </thead>

            <tbody>
              {filteredData.length === 0 ? (
                <tr>
                  <td
                    colSpan={15}
                    className="border px-4 py-12 text-center text-gray-500"
                  >
                    {loading
                      ? "Đang tải dữ liệu..."
                      : "Chưa có dữ liệu lợi nhuận"}
                  </td>
                </tr>
              ) : (
                filteredData.map((item, index) => {
                  const totalCost = getTotalCost(item);
                  const loiNhuan = getProfit(item);

                  return (
                    <tr key={item._id} className="hover:bg-gray-50">
                      <td className="border px-3 py-2 text-center">
                        {index + 1}
                      </td>

                      <td className="border px-3 py-2 text-center font-semibold sticky left-0 bg-white z-10">
                        {item.bsx}
                      </td>

                      <td className="border px-2 py-1 text-center">
                        {item.company}
                      </td>

                      <td className="border px-3 py-2 text-right font-semibold text-blue-600 whitespace-nowrap">
                        {canViewAllDoanhThu
                          ? `${formatMoney(item.doanhThu)} VNĐ`
                          : "0 VNĐ"}
                      </td>

                      <td className="border px-2 py-1">
                        <ReadOnlyCost value={item.cpNhienLieu} />
                      </td>

                      <td className="border px-2 py-1">
                        <ReadOnlyCost value={item.cpSuaXe} />
                      </td>

                      <td className="border px-2 py-1">
                        <ReadOnlyCost value={item.cpEpassMonth} />
                      </td>

                      <td className="border px-2 py-1">
                        <ReadOnlyCost value={item.cpEpassTurn} />
                      </td>

                      <td className="border px-2 py-1">
                        <ReadOnlyCost value={item.cpKhauHaoXe} />
                      </td>

                      <td className="border px-2 py-1">
                        <ReadOnlyCost value={item.cpETC} />
                      </td>

                      <td className="border px-2 py-1">
                        <ReadOnlyCost value={item.cpDKDKBH} />
                      </td>

                      <td className="border px-2 py-1">
                        <ReadOnlyCost value={item.cpThanhToanLichTrinh} />
                      </td>

                      <td className="border px-2 py-1">
                        <ReadOnlyCost value={item.cpLuong} />
                      </td>

                      <td className="border px-3 py-2 text-right font-bold text-orange-600 whitespace-nowrap">
                        {canViewAllDoanhThu
                          ? `${formatMoney(totalCost)} VNĐ`
                          : "0 VNĐ"}
                      </td>

                      <td
                        className={`border px-3 py-2 text-right font-bold whitespace-nowrap ${!canViewAllDoanhThu ? "text-gray-500" : loiNhuan >= 0 ? "text-green-600" : "text-red-600"}`}
                      >
                        {canViewAllDoanhThu
                          ? `${formatMoney(loiNhuan)} VNĐ`
                          : "0 VNĐ"}
                      </td>

                      <td className="border px-3 py-2 text-center font-medium whitespace-nowrap">
                        {item.maLoiNhuan}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>

            {data.length > 0 && (
              <tfoot className="sticky bottom-0 z-20 bg-gray-100 font-bold">
                <tr>
                  <td colSpan={3} className="border px-3 py-3 text-right">
                    TỔNG
                  </td>

                  <td className="border px-3 py-3 text-right text-blue-600 whitespace-nowrap">
                    {canViewAllDoanhThu
                      ? `${formatMoney(totals.doanhThu)} VNĐ`
                      : "0 VNĐ"}
                  </td>

                  <td className="border px-3 py-3 text-right text-gray-500 whitespace-nowrap">
                    {formatMoney(totals.cpNhienLieu)} VNĐ
                  </td>

                  <td className="border px-3 py-3 text-right text-gray-500 whitespace-nowrap">
                    {formatMoney(totals.cpSuaXe)} VNĐ
                  </td>

                  <td className="border px-3 py-3 text-right text-gray-500 whitespace-nowrap">
                    {formatMoney(totals.cpEpassMonth)} VNĐ
                  </td>

                  <td className="border px-3 py-3 text-right text-gray-500 whitespace-nowrap">
                    {formatMoney(totals.cpEpassTurn)} VNĐ
                  </td>

                  <td className="border px-3 py-3 text-right text-gray-500 whitespace-nowrap">
                    {formatMoney(totals.cpKhauHaoXe)} VNĐ
                  </td>

                  <td className="border px-3 py-3 text-right text-gray-500 whitespace-nowrap">
                    {formatMoney(totals.cpETC)} VNĐ
                  </td>

                  <td className="border px-3 py-3 text-right text-gray-500 whitespace-nowrap">
                    {formatMoney(totals.cpDKDKBH)} VNĐ
                  </td>

                  <td className="border px-3 py-3 text-right text-gray-500 whitespace-nowrap">
                    {formatMoney(totals.cpThanhToanLichTrinh)} VNĐ
                  </td>

                  <td className="border px-3 py-3 text-right text-gray-500 whitespace-nowrap">
                    {formatMoney(totals.cpLuong)} VNĐ
                  </td>

                  <td className="border px-3 py-3 text-right text-orange-700 whitespace-nowrap">
                    {formatMoney(totals.chiPhi)} VNĐ
                  </td>

                  <td
                    className={`border px-3 py-3 text-right whitespace-nowrap ${totals.loiNhuan >= 0 ? "text-green-600" : "text-red-600"}`}
                  >
                    {canViewAllDoanhThu
                      ? `${formatMoney(totals.loiNhuan)} VNĐ`
                      : "0 VNĐ"}
                  </td>

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
