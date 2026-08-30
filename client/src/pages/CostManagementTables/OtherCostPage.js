import { useEffect, useState, useRef } from "react";
import axios from "axios";
import API from "../../api";

export default function OtherCostPage() {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(false);

  const [importing, setImporting] = useState(false);
  const [importTotal, setImportTotal] = useState(0);
  const [importDone, setImportDone] = useState(0);

  const token = localStorage.getItem("token");
  const baseUrl = `${API}/other-cost`;

  const fileInputRef = useRef(null);
  const [importFile, setImportFile] = useState(null);

  // =====================================================
  // THÁNG / NĂM
  // MẶC ĐỊNH THÁNG HIỆN TẠI
  // =====================================================

  const getCurrentMonth = () => {
    const now = new Date();

    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(
      2,
      "0"
    )}`;
  };

  const [monthFilter, setMonthFilter] = useState(getCurrentMonth());

  // =====================================================
  // FETCH DATA
  // =====================================================

  const fetchData = async () => {
    setLoading(true);

    try {
      const res = await axios.get(baseUrl, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
        params: {
          month: monthFilter,
        },
      });

      setData(res.data || []);
    } catch (err) {
      console.error("Lỗi lấy dữ liệu chi phí khác:", err);

      alert(
        err.response?.data?.message ||
          err.message ||
          "Không thể lấy dữ liệu chi phí khác"
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!monthFilter) return;

    fetchData();

    setImporting(false);
    setImportTotal(0);
    setImportDone(0);
  }, [monthFilter]);

  // =====================================================
  // CHỌN FILE
  // =====================================================

  const handleSelectFile = (e) => {
    const file = e.target.files?.[0];

    if (!file) return;

    setImportFile(file);
  };

  // =====================================================
  // IMPORT EXCEL
  // =====================================================

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

      setImportTotal(res.data.totalValid || 0);
      setImportDone(res.data.inserted || 0);

      // Sau khi import xong lấy lại dữ liệu theo tháng đang chọn
      await fetchData();

      const failed = res.data.failed || 0;

      if (failed > 0) {
        alert(
          `Import hoàn tất.\n\n` +
            `Thành công: ${res.data.inserted || 0} dòng\n` +
            `Lỗi: ${failed} dòng`
        );
      } else {
        alert(`Import thành công ${res.data.inserted || 0} dòng.`);
      }
    } catch (err) {
      console.error("Lỗi import:", err);

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
  // CẬP NHẬT CHI PHÍ KHÁC VÀO DOANH THU TỔNG
  // =====================================================

  const handleUpdateChiPhiKhac = async () => {
    if (!monthFilter) {
      alert("Chưa chọn tháng");
      return;
    }

    const [year, month] = monthFilter.split("-");

    const confirmUpdate = window.confirm(
      `Bạn có chắc muốn cập nhật CHI PHÍ KHÁC vào DoanhThuTong của tháng ${month}/${year}?`
    );

    if (!confirmUpdate) return;

    try {
      setLoading(true);

      const res = await axios.put(
        `${baseUrl}/update-chi-phi-khac`,
        {
          month: monthFilter,
        },
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      alert(
        `Đã cập nhật chi phí khác tháng ${month}/${year}.\n\n` +
          `Mã lợi nhuận: ${res.data.maLoiNhuan}\n` +
          `Chi phí khác: ${formatMoney(res.data.chiPhiKhac)} VNĐ`
      );
    } catch (err) {
      console.error("Lỗi cập nhật chi phí khác:", err);

      alert(
        err.response?.data?.message ||
          err.message ||
          "Cập nhật chi phí khác thất bại"
      );
    } finally {
      setLoading(false);
    }
  };

  // =====================================================
  // XOÁ THEO THÁNG / NĂM
  // =====================================================

  const handleDeleteByMonth = async () => {
    if (!monthFilter) {
      alert("Chưa chọn tháng");
      return;
    }

    const [year, month] = monthFilter.split("-");

    const confirmDelete = window.confirm(
      `Bạn có chắc muốn xóa TOÀN BỘ chi phí khác của tháng ${month}/${year}?`
    );

    if (!confirmDelete) return;

    try {
      const res = await axios.delete(`${baseUrl}/remove-by-month-year`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
        data: {
          month: Number(month),
          year: Number(year),
        },
      });

      alert(
        `Đã xóa ${
          res.data.deletedCount || 0
        } dòng chi phí khác của tháng ${month}/${year}.`
      );

      await fetchData();
    } catch (err) {
      console.error("Lỗi xóa theo tháng:", err);

      alert(
        err.response?.data?.message ||
          err.message ||
          "Xóa dữ liệu theo tháng thất bại"
      );
    }
  };

  // =====================================================
  // FORMAT MONEY
  // =====================================================

  const formatMoney = (value) => {
    return Number(value || 0).toLocaleString("vi-VN");
  };

  // =====================================================
  // FORMAT DATE
  // =====================================================

  const formatDate = (value) => {
    if (!value) return "";

    const date = new Date(value);

    if (Number.isNaN(date.getTime())) {
      return "";
    }

    return date.toLocaleDateString("vi-VN");
  };

  // =====================================================
  // TOOLBAR
  // =====================================================

  const Toolbar = () => (
    <div className="flex gap-2 mb-3 items-center flex-wrap">
      {/* THÁNG / NĂM */}

      <div className="flex items-center gap-1">
        <span className="text-sm font-medium">Tháng:</span>

        <input
          type="month"
          value={monthFilter}
          onChange={(e) => setMonthFilter(e.target.value)}
          className="border px-2 py-1 rounded"
        />
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
        className="border px-2 py-1 rounded bg-white hover:bg-gray-50"
      >
        {importFile ? "Đã chọn file" : "Chọn file"}
      </button>

      {/* TÊN FILE */}

      {importFile && (
        <span className="text-xs max-w-[300px] truncate">
          {importFile.name}
        </span>
      )}

      {/* IMPORT */}

      <button
        onClick={handleImport}
        disabled={!importFile || importing}
        className="bg-blue-600 text-white px-3 py-1 rounded disabled:opacity-50"
      >
        {importing ? "Đang import..." : "Import"}
      </button>

      {/* XOÁ THEO THÁNG */}

      <button
        onClick={handleDeleteByMonth}
        disabled={!monthFilter || loading || importing}
        className="bg-red-600 text-white px-3 py-1 rounded disabled:opacity-50"
      >
        Xóa theo tháng
      </button>

      {/* TRẠNG THÁI */}

      {importing && <span className="text-blue-600 text-sm">Đang nhập...</span>}

      {!importing && importTotal > 0 && (
        <span className="text-green-700 text-xs">
          Đã nhập {importDone}/{importTotal} dòng hợp lệ
        </span>
      )}

      {/* CẬP NHẬT CHI PHÍ KHÁC */}

      <button
        onClick={handleUpdateChiPhiKhac}
        disabled={!monthFilter || loading || importing}
        className="bg-green-600 text-white px-3 py-1 rounded disabled:opacity-50"
      >
        Cập nhật vào doanh thu
      </button>
    </div>
  );

  // =====================================================
  // TABLE
  // =====================================================

  const renderTable = () => {
    const totalMoney = data.reduce(
      (sum, r) => sum + Number(r.grandTotal || 0),
      0
    );

    return (
      <>
        {/* SUMMARY */}

        <div className="flex justify-between items-center mb-2 text-sm">
          <div>
            Tổng số dòng: <b>{data.length}</b>
          </div>

          <div>
            Tổng cộng: <b className="text-red-600">{formatMoney(totalMoney)}</b>{" "}
            VNĐ
          </div>
        </div>

        {/* TABLE */}

        <div className="border rounded-lg overflow-auto max-h-[70vh] shadow-sm">
          <table className="min-w-[2400px] w-full table-auto border-separate border-spacing-0 text-xs">
            <thead className="sticky top-0 bg-blue-600 z-20">
              <tr>
                {[
                  "MÃ CHI PHÍ",
                  "MÃ SỐ THUẾ",
                  "ĐƠN VỊ NHÀ CUNG CẤP",
                  "NGÀY PHÁT SINH",
                  "CHI TIẾT CHI PHÍ",
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
                    className="border px-2 py-2 font-semibold text-white whitespace-nowrap text-center"
                  >
                    {h}
                  </th>
                ))}
              </tr>
            </thead>

            <tbody>
              {data.map((r) => (
                <tr
                  key={r._id}
                  className="even:bg-gray-50 hover:bg-blue-50 text-xs"
                >
                  {/* MÃ CHI PHÍ */}

                  <td className="border px-2 py-1 font-semibold text-blue-700 whitespace-nowrap">
                    {r.costCode}
                  </td>

                  {/* MÃ SỐ THUẾ */}

                  <td className="border px-2 py-1 whitespace-nowrap">
                    {r.taxCode}
                  </td>

                  {/* ĐƠN VỊ NHÀ CUNG CẤP */}

                  <td className="border px-2 py-1">{r.supplierUnit}</td>

                  {/* NGÀY PHÁT SINH */}

                  <td className="border px-2 py-1 whitespace-nowrap text-center">
                    {formatDate(r.costDate)}
                  </td>

                  {/* CHI TIẾT CHI PHÍ */}

                  <td className="border px-2 py-1">{r.costDetails}</td>

                  {/* THÀNH TIỀN */}

                  <td className="border px-2 py-1 text-right font-semibold">
                    {formatMoney(r.amount)}
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

                  <td className="border px-2 py-1 whitespace-nowrap text-center">
                    {formatDate(r.paymentDate)}
                  </td>
                </tr>
              ))}

              {/* KHÔNG CÓ DATA */}

              {!loading && data.length === 0 && (
                <tr>
                  <td
                    colSpan={13}
                    className="border px-2 py-8 text-center text-gray-500"
                  >
                    Không có dữ liệu chi phí khác trong tháng này
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
  // RENDER
  // =====================================================

  return (
    <div className="p-4">
      <Toolbar />

      {loading && (
        <p className="text-sm text-gray-500 mb-2">Đang tải dữ liệu...</p>
      )}

      {renderTable()}
    </div>
  );
}
