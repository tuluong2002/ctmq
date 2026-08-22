import { useState, useEffect } from "react";
import axios from "axios";
import API from "../api";

export default function TripListModal({
  customer,
  onClose,
  onPaymentTypeChanged,
}) {
  const [trips, setTrips] = useState([]);
  const [loading, setLoading] = useState(false);
  const token = localStorage.getItem("token");

  const debtCode = customer?.debtCode;

  const loadTrips = async () => {
    if (!debtCode) {
      setTrips([]);
      return;
    }

    setLoading(true);
    try {
      const res = await axios.get(
        `${API}/payment-history/debt-period/${debtCode}`,
        { headers: { Authorization: `Bearer ${token}` } },
      );

      setTrips(res.data.trips || []);
      console.log("Trips:", res.data.trips);
    } catch (err) {
      console.error("Lỗi load trips", err);
      setTrips([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadTrips();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [debtCode]);

  const [addTripCode, setAddTripCode] = useState("");
  const [adding, setAdding] = useState(false);
  const [recalculating, setRecalculating] = useState(false);

  const handleRecalculate = async () => {
    if (!debtCode) {
      alert("Không có mã công nợ");
      return;
    }

    const confirmed = window.confirm(
      `Bạn có chắc muốn tính lại tiền của kỳ ${debtCode}?`,
    );

    if (!confirmed) return;

    setRecalculating(true);

    try {
      const res = await axios.post(
        `${API}/payment-history/debt-period/${debtCode}/recalculate`,
        {},
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        },
      );

      await loadTrips();

      // 🔄 reload bảng công nợ bên ngoài
      await onPaymentTypeChanged?.();

      const money = res.data?.money;

      alert(
        `Đã tính lại công nợ ${debtCode}\n\n` +
          `Tổng tiền: ${Number(
            money?.totalAmount || 0,
          ).toLocaleString()} VNĐ\n` +
          `Đã thanh toán: ${Number(
            money?.paidAmount || 0,
          ).toLocaleString()} VNĐ\n` +
          `Còn lại: ${Number(
            money?.remainAmount || 0,
          ).toLocaleString()} VNĐ\n` +
          `Số chuyến: ${money?.tripCount || 0}`,
      );
    } catch (err) {
      console.error("❌ Lỗi tính lại công nợ:", err);

      alert(err?.response?.data?.error || "Không thể tính lại công nợ");
    } finally {
      setRecalculating(false);
    }
  };

  const handleAddTrip = async () => {
    if (!addTripCode || !debtCode) return;

    // ✅ tách danh sách mã chuyến
    const codes = addTripCode
      .split(/[\s,]+/) // space, xuống dòng, dấu phẩy
      .map((c) => c.trim().toUpperCase())
      .filter(Boolean);

    if (codes.length === 0) return;

    setAdding(true);

    const errors = [];

    try {
      for (const code of codes) {
        try {
          await axios.post(
            `${API}/payment-history/debt-period/${debtCode}/add-trip`,
            { maChuyen: code },
            { headers: { Authorization: `Bearer ${token}` } },
          );
        } catch (err) {
          console.error("❌ Lỗi thêm chuyến:", code, err);
          errors.push(code);
        }
      }

      setAddTripCode("");
      await loadTrips();

      if (errors.length > 0) {
        alert(`Một số chuyến không thêm được:\n${errors.join(", ")}`);
      }
    } finally {
      setAdding(false);
    }
  };

  const handleRemoveTrip = async (maChuyen) => {
    try {
      await axios.delete(
        `${API}/payment-history/debt-period/${debtCode}/remove-trip/${maChuyen}`,
        { headers: { Authorization: `Bearer ${token}` } },
      );

      setTrips((prev) => prev.filter((t) => t.maChuyen !== maChuyen));
    } catch (err) {
      console.error(err);
      alert(err?.response?.data?.error || "Không xoá được chuyến");
    }
  };

  const pick = (bs, base) => {
    const bsVal = parseFloat(bs);
    if (!isNaN(bsVal) && bsVal !== 0) return bsVal;
    return parseFloat(base) || 0;
  };

  const updatePaymentType = async (maChuyen, type) => {
    const oldTrip = trips.find((t) => t.maChuyen === maChuyen);
    const oldType = oldTrip?.paymentType;

    // optimistic update
    setTrips((prev) =>
      prev.map((t) =>
        t.maChuyen === maChuyen ? { ...t, paymentType: type } : t,
      ),
    );

    try {
      await axios.patch(
        `${API}/payment-history/trip/${maChuyen}/toggle-payment-type`,
        { paymentType: type },
        { headers: { Authorization: `Bearer ${token}` } },
      );
    } catch (err) {
      console.error(err);

      // rollback
      setTrips((prev) =>
        prev.map((t) =>
          t.maChuyen === maChuyen ? { ...t, paymentType: oldType } : t,
        ),
      );

      alert("Không đổi được hình thức thanh toán");
    }
  };

  const bulkUpdatePaymentType = async (type) => {
    setTrips((prev) => prev.map((t) => ({ ...t, paymentType: type })));

    try {
      await Promise.all(
        trips.map((t) =>
          axios.patch(
            `${API}/payment-history/trip/${t.maChuyen}/toggle-payment-type`,
            { paymentType: type },
            { headers: { Authorization: `Bearer ${token}` } },
          ),
        ),
      );
    } catch (err) {
      console.error(err);
      alert("Có lỗi khi cập nhật hàng loạt");
      await loadTrips();
    }
  };

  const handleClose = async () => {
    try {
      // 🔥 reload lại bảng công nợ / chuyến ở page cha
      await onPaymentTypeChanged?.();
    } finally {
      onClose();
    }
  };

  const totalAll = trips.reduce((acc, t) => {
    const tongTien =
      pick(t.cuocPhiBS) +
      pick(t.bocXepBS) +
      pick(t.veBS) +
      pick(t.hangVeBS) +
      pick(t.luuCaBS) +
      pick(t.cpKhacBS) +
      pick(t.themDiem);
    return acc + tongTien;
  }, 0);

  const remainAll = trips.reduce((acc, t) => {
    const tongTien =
      pick(t.cuocPhiBS) +
      pick(t.bocXepBS) +
      pick(t.veBS) +
      pick(t.hangVeBS) +
      pick(t.luuCaBS) +
      pick(t.cpKhacBS) +
      pick(t.themDiem);
    const paid = parseFloat(t.daThanhToan) || 0;
    return acc + (tongTien - paid);
  }, 0);

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 text-[10px]">
      <div className="bg-white rounded-xl w-[95vw] max-w-[1400px] max-h-[90vh] p-5 flex flex-col">
        <div className="flex justify-between items-center mb-3">
          <h2 className="text-xl font-semibold">
            Danh sách chuyến — KH {customer?.maKH} ({customer?.debtCode})
          </h2>

          <button onClick={handleClose} className="text-red-500 font-semibold">
            ✕
          </button>
        </div>

        <div className="flex gap-2 mb-3 items-center">
          <input
            value={addTripCode}
            onChange={(e) => setAddTripCode(e.target.value)}
            placeholder="Nhập nhiều mã chuyến, cách nhau bằng dấu cách hoặc dấu phẩy"
            className="border px-2 py-1 rounded w-[350px]"
          />

          <button
            onClick={handleAddTrip}
            disabled={adding}
            className="bg-blue-600 text-white px-3 py-1 rounded"
          >
            {adding ? "Đang thêm..." : "Thêm chuyến"}
          </button>

          <button
            onClick={handleRecalculate}
            disabled={recalculating || !debtCode}
            className="bg-orange-500 hover:bg-orange-600 disabled:bg-gray-400 text-white px-3 py-1 rounded font-medium"
          >
            {recalculating ? "Đang tính lại..." : "🔄 Tính lại công nợ"}
          </button>
        </div>

        <div
          className="overflow-auto border rounded-lg"
          style={{ maxHeight: "70vh" }}
        >
          {loading ? (
            <div className="p-4">Đang tải...</div>
          ) : !debtCode ? (
            <div className="p-4 text-gray-500">
              Không có mã khách để hiện chuyến.
            </div>
          ) : trips.length === 0 ? (
            <div className="p-4 text-gray-500">Không có chuyến cho mã này.</div>
          ) : (
            <table className="w-full text-xs min-w-[1500px]">
              <thead className="sticky top-0 bg-gray-100">
                <tr>
                  <th className="p-2 border">Tên lái xe</th>
                  <th className="p-2 border">Mã KH</th>
                  <th className="p-2 border">Khách hàng</th>
                  <th className="p-2 border">Diễn giải</th>
                  <th className="p-2 border">Ngày đóng</th>
                  <th className="p-2 border">Ngày giao</th>
                  <th className="p-2 border">Đóng hàng</th>
                  <th className="p-2 border">Giao hàng</th>
                  <th className="p-2 border">Điểm</th>
                  <th className="p-2 border">Trọng lượng</th>
                  <th className="p-2 border">Biển số xe</th>
                  <th className="p-2 border">Mã chuyến</th>
                  <th className="p-2 border">Tổng tiền</th>
                  <th className="p-2 border text-center">
                    <input
                      type="checkbox"
                      checked={
                        trips.length > 0 &&
                        trips.every((t) => t.paymentType === "INVOICE")
                      }
                      onChange={() => bulkUpdatePaymentType("INVOICE")}
                    />
                    <div>Hoá đơn</div>
                  </th>

                  <th className="p-2 border text-center">
                    <input
                      type="checkbox"
                      checked={
                        trips.length > 0 &&
                        trips.every((t) => t.paymentType === "CASH")
                      }
                      onChange={() => bulkUpdatePaymentType("CASH")}
                    />
                    <div>Tiền mặt</div>
                  </th>

                  <th className="p-2 border text-center">
                    <input
                      type="checkbox"
                      checked={
                        trips.length > 0 &&
                        trips.every((t) => t.paymentType === "OTHER")
                      }
                      onChange={() => bulkUpdatePaymentType("OTHER")}
                    />
                    <div>Khác</div>
                  </th>

                  <th className="p-2 border">Đã thanh toán</th>
                  <th className="p-2 border">Còn lại</th>
                  <th className="p-2 border">Trạng thái</th>
                  <th className="p-2 border text-center">Thao tác</th>
                </tr>
              </thead>
              <tbody>
                {trips.map((t) => {
                  const tongTien =
                    pick(t.cuocPhiBS) +
                    pick(t.bocXepBS) +
                    pick(t.veBS) +
                    pick(t.hangVeBS) +
                    pick(t.luuCaBS) +
                    pick(t.cpKhacBS) +
                    pick(t.themDiem);

                  const paid = parseFloat(t.daThanhToan);
                  const remain = tongTien - paid;

                  return (
                    <tr key={t._id}>
                      <td className="p-2 border">{t.tenLaiXe}</td>
                      <td className="p-2 border">{t.maKH}</td>
                      <td className="p-2 border">{t.khachHang}</td>
                      <td className="p-2 border">{t.dienGiai}</td>
                      <td className="p-2 border">
                        {t.ngayBocHang
                          ? new Date(t.ngayBocHang).toLocaleDateString("vi-VN")
                          : ""}
                      </td>
                      <td className="p-2 border">
                        {t.ngayGiaoHang
                          ? new Date(t.ngayGiaoHang).toLocaleDateString("vi-VN")
                          : ""}
                      </td>
                      <td className="p-2 border">{t.diemXepHang}</td>
                      <td className="p-2 border">{t.diemDoHang}</td>
                      <td className="p-2 border">{t.soDiem}</td>
                      <td className="p-2 border">{t.trongLuong}</td>
                      <td className="p-2 border">{t.bienSoXe}</td>
                      <td className="p-2 border">{t.maChuyen}</td>
                      <td className="p-2 border font-semibold text-blue-600">
                        {tongTien.toLocaleString()}
                      </td>
                      {/* INVOICE */}
                      <td className="p-2 border text-center">
                        <input
                          type="checkbox"
                          checked={t.paymentType === "INVOICE"}
                          onChange={() =>
                            updatePaymentType(t.maChuyen, "INVOICE")
                          }
                        />
                      </td>

                      {/* CASH */}
                      <td className="p-2 border text-center">
                        <input
                          type="checkbox"
                          checked={t.paymentType === "CASH"}
                          onChange={() => updatePaymentType(t.maChuyen, "CASH")}
                        />
                      </td>

                      {/* OTHER */}
                      <td className="p-2 border text-center">
                        <input
                          type="checkbox"
                          checked={t.paymentType === "OTHER"}
                          onChange={() =>
                            updatePaymentType(t.maChuyen, "OTHER")
                          }
                        />
                      </td>

                      <td className="p-2 border">{paid.toLocaleString()}</td>

                      <td className="p-2 border font-semibold text-red-600">
                        {remain.toLocaleString()}
                      </td>

                      <td className="p-2 border">
                        {paid >= tongTien ? "Đủ" : "Thiếu"}
                      </td>
                      <td className="p-2 border text-center">
                        <button
                          onClick={() => handleRemoveTrip(t.maChuyen)}
                          className="text-red-600 font-semibold"
                        >
                          Xoá
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>

        <div className="mt-2 font-semibold text-sm flex justify-end gap-4">
          <div>
            Tổng tất cả:{" "}
            <span className="text-blue-600">{totalAll.toLocaleString()}</span>
          </div>
          <div>
            Tổng nợ:{" "}
            <span className="text-red-600">{remainAll.toLocaleString()}</span>
          </div>
        </div>
      </div>
    </div>
  );
}
