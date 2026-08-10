import React, { useEffect, useState } from "react";
import { FiCheck, FiSave, FiSearch, FiX } from "react-icons/fi";
import axios from "axios";

import API from "../../api";

const EMPTY_FORM = {
  maChuyen: "",

  keToanPhuTrach: "",
  maKH: "",
  khachHang: "",
  dienGiai: "",

  ngayBocHang: "",
  ngayGiaoHang: "",

  diemXepHang: "",
  diemDoHang: "",
  soDiem: "",
  trongLuong: "",
  bienSoXe: "",

  soTienDieuChinh: "",
  loaiLoi: "",
  ghiChu: "",
  phuongAnXuLy: "",
  ngayXuLy: "",
};

const ScheduleErrorModal = ({ data, onClose, onSaved }) => {
  const isEdit = Boolean(data?._id);

  const [form, setForm] = useState(EMPTY_FORM);

  const [loading, setLoading] = useState(false);

  const [checkingTrip, setCheckingTrip] = useState(false);

  const [tripFound, setTripFound] = useState(false);

  const [showOriginalTrip, setShowOriginalTrip] = useState(false);

  // =========================================================
  // FORMAT DATE
  // =========================================================
  const formatDateInput = (value) => {
    if (!value) return "";

    const date = new Date(value);

    if (Number.isNaN(date.getTime())) {
      return "";
    }

    const year = date.getFullYear();

    const month = String(date.getMonth() + 1).padStart(2, "0");

    const day = String(date.getDate()).padStart(2, "0");

    return `${year}-${month}-${day}`;
  };

  // =========================================================
  // LOAD DATA KHI SỬA
  // =========================================================
  useEffect(() => {
    setShowOriginalTrip(false);

    if (!data) {
      setForm({
        ...EMPTY_FORM,
      });

      setTripFound(false);

      return;
    }

    setForm({
      maChuyen: data.maChuyen || "",
      keToanPhuTrach: data.keToanPhuTrach || "",
      maKH: data.maKH || "",
      khachHang: data.khachHang || "",
      dienGiai: data.dienGiai || "",
      ngayBocHang: formatDateInput(data.ngayBocHang),
      ngayGiaoHang: formatDateInput(data.ngayGiaoHang),
      diemXepHang: data.diemXepHang || "",
      diemDoHang: data.diemDoHang || "",
      soDiem: data.soDiem || "",
      trongLuong: data.trongLuong || "",
      bienSoXe: data.bienSoXe || "",
      soTienDieuChinh: data.soTienDieuChinh ?? "",
      loaiLoi: data.loaiLoi || "",
      ghiChu: data.ghiChu || "",
      phuongAnXuLy: data.phuongAnXuLy || "",
      ngayXuLy: formatDateInput(data.ngayXuLy),
    });

    setTripFound(true);
  }, [data]);

  // =========================================================
  // CHANGE
  // =========================================================
  const handleChange = (e) => {
    const { name, value } = e.target;

    setForm((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  // =========================================================
  // KIỂM TRA MÃ CHUYẾN + LẤY THÔNG TIN CHUYẾN GỐC
  // =========================================================
  const handleCheckTrip = async () => {
    const maChuyen = form.maChuyen.trim();

    if (!maChuyen) {
      alert("Vui lòng nhập mã chuyến");
      return;
    }

    try {
      setCheckingTrip(true);
      setTripFound(false);

      // =====================================================
      // GỌI API KIỂM TRA CHUYẾN GỐC
      // =====================================================
      const response = await axios.get(
        `${API}/schedule-errors/check-trip/${encodeURIComponent(maChuyen)}`,
      );

      const trip = response.data?.data;

      console.log(trip);

      if (!trip) {
        alert(`Không tìm thấy mã chuyến "${maChuyen}"`);

        return;
      }

      // =====================================================
      // LẤY THÔNG TIN CHUYẾN GỐC
      // =====================================================
      setForm((prev) => ({
        ...prev,

        maChuyen: trip.maChuyen || maChuyen,

        keToanPhuTrach: trip.keToanPhuTrach || "",

        maKH: trip.maKH || "",

        khachHang: trip.khachHang || "",

        dienGiai: trip.dienGiai || "",

        ngayBocHang: formatDateInput(trip.ngayBocHang),

        ngayGiaoHang: formatDateInput(trip.ngayGiaoHang),

        diemXepHang: trip.diemXepHang || "",

        diemDoHang: trip.diemDoHang || "",

        soDiem: trip.soDiem || "",

        trongLuong: trip.trongLuong || "",

        bienSoXe: trip.bienSoXe || "",
      }));

      // =====================================================
      // ĐÃ TÌM THẤY CHUYẾN
      // =====================================================
      setTripFound(true);
    } catch (error) {
      console.error("handleCheckTrip error:", error);

      setTripFound(false);

      alert(error.response?.data?.message || "Không thể kiểm tra mã chuyến");
    } finally {
      setCheckingTrip(false);
    }
  };
  // =========================================================
  // SUBMIT
  // =========================================================
  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!form.maChuyen.trim()) {
      alert("Vui lòng nhập mã chuyến");
      return;
    }

    if (!tripFound) {
      alert("Vui lòng kiểm tra mã chuyến trước");
      return;
    }

    if (!form.loaiLoi.trim()) {
      alert("Vui lòng chọn loại lỗi");
      return;
    }

    try {
      setLoading(true);

      const payload = {
        maChuyen: form.maChuyen.trim(),

        soTienDieuChinh:
          form.soTienDieuChinh === "" ? 0 : Number(form.soTienDieuChinh),

        loaiLoi: form.loaiLoi.trim(),

        ghiChu: form.ghiChu.trim(),

        phuongAnXuLy: form.phuongAnXuLy.trim(),

        ngayXuLy: form.ngayXuLy || null,
      };

      if (isEdit) {
        await axios.put(`${API}/schedule-errors/${data._id}`, payload);
      } else {
        await axios.post(`${API}/schedule-errors`, payload);
      }

      alert(
        isEdit
          ? "Sửa thành công"
          : "Thêm thành công",
      );

      onSaved();
    } catch (error) {
      console.error("handleSubmit error:", error);

      alert(error.response?.data?.message || "Không thể lưu");
    } finally {
      setLoading(false);
    }
  };

  // =========================================================
  // READONLY INPUT
  // =========================================================
  const renderReadonly = (label, value, className = "") => {
    return (
      <div className={className}>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          {label}
        </label>

        <input
          type="text"
          value={value || ""}
          readOnly
          className="w-full h-10 px-3 bg-gray-100 border border-gray-300 rounded-lg text-gray-700 outline-none"
        />
      </div>
    );
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 p-4">
      <div className="bg-white w-full max-w-6xl max-h-[95vh] rounded-xl shadow-xl flex flex-col">
        {/* ================================================= */}
        {/* HEADER */}
        {/* ================================================= */}
        <div className="flex items-center justify-between px-5 py-2 border-b border-gray-200">
          <div>
            <h2 className="text-lg font-bold text-gray-800">
              {isEdit ? "SỬA THÔNG TIN SAI SÓT" : "THÊM CHUYẾN SAI SÓT"}
            </h2>

            <p className="text-xs text-gray-500 mt-1">
              {isEdit
                ? "Cập nhật thông tin sai sót"
                : "Nhập mã chuyến để lấy thông tin chuyến gốc"}
            </p>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-2 rounded-lg hover:bg-gray-100 text-gray-600"
          >
            <FiX size={20} />
          </button>
        </div>

        {/* ================================================= */}
        {/* BODY */}
        {/* ================================================= */}
        <form onSubmit={handleSubmit} className="overflow-y-auto p-5">
          {/* ================================================= */}
          {/* MÃ CHUYẾN */}
          {/* ================================================= */}
          <div className="mb-5">
            <label className="block text-sm font-semibold text-gray-700 mb-1">
              Mã chuyến <span className="text-red-500">*</span>
            </label>

            <div className="flex gap-2">
              <input
                type="text"
                name="maChuyen"
                value={form.maChuyen}
                onChange={handleChange}
                disabled={isEdit}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();

                    if (!isEdit) {
                      handleCheckTrip();
                    }
                  }
                }}
                placeholder="Nhập mã chuyến..."
                className={`flex-1 h-10 px-3 border border-gray-300 rounded-lg outline-none focus:ring-2 focus:ring-blue-500 ${
                  isEdit ? "bg-gray-100" : ""
                }`}
              />

              {!isEdit && (
                <button
                  type="button"
                  onClick={handleCheckTrip}
                  disabled={checkingTrip}
                  className="px-4 h-10 inline-flex items-center gap-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
                >
                  {checkingTrip ? (
                    <>
                      <span className="animate-spin">⟳</span>
                      Đang kiểm tra
                    </>
                  ) : (
                    <>
                      <FiSearch />
                      Kiểm tra
                    </>
                  )}
                </button>
              )}
            </div>

            {!isEdit && tripFound && (
              <div className="mt-2 flex items-center gap-2 text-sm text-green-600">
                <FiCheck />
                Đã tìm thấy chuyến
              </div>
            )}
          </div>

          {/* ================================================= */}
          {/* THÔNG TIN CHUYẾN GỐC */}
          {/* ================================================= */}
          <div className="border border-gray-200 rounded-xl p-4 mb-5">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-semibold text-gray-800">
                  THÔNG TIN CHUYẾN GỐC
                </h3>

                <p className="text-xs text-gray-500 mt-1">
                  Thông tin được lấy từ chuyến gốc và không thể chỉnh sửa
                </p>
              </div>

              <button
                type="button"
                onClick={() => setShowOriginalTrip((prev) => !prev)}
                className="inline-flex items-center gap-2 px-3 py-2 text-sm font-medium text-blue-600 border border-blue-200 rounded-lg hover:bg-blue-50"
              >
                {showOriginalTrip ? (
                  <>
                    <FiX size={16} />
                    Ẩn thông tin
                  </>
                ) : (
                  <>
                    <FiSearch size={16} />
                    Hiện thông tin
                  </>
                )}
              </button>
            </div>

            {showOriginalTrip && (
              <div className="mt-4 pt-4 border-t border-gray-200">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                  {renderReadonly("Kế toán phụ trách", form.keToanPhuTrach)}

                  {renderReadonly("Mã KH", form.maKH)}

                  {renderReadonly("Khách hàng", form.khachHang)}

                  {renderReadonly("Biển số xe", form.bienSoXe)}

                  {renderReadonly("Ngày bốc hàng", form.ngayBocHang)}

                  {renderReadonly("Ngày giao hàng", form.ngayGiaoHang)}

                  {renderReadonly("Số điểm", form.soDiem)}

                  {renderReadonly("Trọng lượng", form.trongLuong)}

                  {renderReadonly(
                    "Điểm xếp hàng",
                    form.diemXepHang,
                    "lg:col-span-2",
                  )}

                  {renderReadonly(
                    "Điểm dỡ hàng",
                    form.diemDoHang,
                    "lg:col-span-2",
                  )}

                  {renderReadonly("Diễn giải", form.dienGiai, "lg:col-span-4")}
                </div>
              </div>
            )}
          </div>

          {/* ================================================= */}
          {/* THÔNG TIN SAI SÓT */}
          {/* ================================================= */}
          <div className="border border-gray-200 rounded-xl p-4">
            <h3 className="font-semibold text-gray-800 mb-4">
              THÔNG TIN SAI SÓT
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* TIỀN ĐIỀU CHỈNH */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Số tiền cần điều chỉnh
                </label>

                <input
                  type="text"
                  name="soTienDieuChinh"
                  value={
                    form.soTienDieuChinh === "" || form.soTienDieuChinh === null
                      ? ""
                      : Number(form.soTienDieuChinh).toLocaleString("vi-VN")
                  }
                  onChange={(e) => {
                    let value = e.target.value;

                    // Cho phép số âm
                    const isNegative = value.startsWith("-");

                    // Bỏ tất cả ký tự không phải số
                    value = value.replace(/\D/g, "");

                    if (!value) {
                      setForm((prev) => ({
                        ...prev,
                        soTienDieuChinh: isNegative ? "-" : "",
                      }));
                      return;
                    }

                    const numberValue = Number(value);

                    setForm((prev) => ({
                      ...prev,
                      soTienDieuChinh: isNegative ? -numberValue : numberValue,
                    }));
                  }}
                  placeholder="Ví dụ: -500.000"
                  inputMode="numeric"
                  className="w-full h-10 px-3 border border-gray-300 font-semibold rounded-lg outline-none focus:ring-2 focus:ring-blue-500"
                />

                <p className="text-xs text-gray-500 mt-1">
                  Có thể nhập số âm. Ví dụ: -500.000
                </p>
              </div>

              {/* LOẠI LỖI */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Loại lỗi <span className="text-red-500">*</span>
                </label>

                <select
                  name="loaiLoi"
                  value={form.loaiLoi}
                  onChange={handleChange}
                  className="w-full h-10 px-3 border border-gray-300 rounded-lg outline-none focus:ring-2 focus:ring-blue-500 bg-white"
                >
                  <option value="" disabled>
                    -- Chọn loại lỗi --
                  </option>

                  <option value="SAI CƯỚC">SAI CƯỚC</option>

                  <option value="THIẾU CHI PHÍ">THIẾU CHI PHÍ</option>

                  <option value="THIẾU CHUYẾN">THIẾU CHUYẾN</option>

                  <option value="KHÁC">KHÁC</option>
                </select>
              </div>

              {/* GHI CHÚ */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Mô tả lỗi / Ghi chú thêm
                </label>

                <textarea
                  name="ghiChu"
                  value={form.ghiChu}
                  onChange={handleChange}
                  rows={4}
                  placeholder="Nhập ghi chú..."
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg outline-none resize-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              {/* PHƯƠNG ÁN XỬ LÝ */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Phương án xử lý
                </label>

                <textarea
                  name="phuongAnXuLy"
                  value={form.phuongAnXuLy}
                  onChange={handleChange}
                  rows={4}
                  placeholder="Nhập phương án xử lý..."
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg outline-none resize-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              {/* NGÀY XỬ LÝ */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Ngày xử lý
                </label>

                <input
                  type="date"
                  name="ngayXuLy"
                  value={form.ngayXuLy}
                  onChange={handleChange}
                  onClick={(e) => e.target.showPicker()}
                  className="w-full h-10 px-3 border border-gray-300 rounded-lg outline-none focus:ring-2 focus:ring-blue-500 cursor-pointer"
                />

                <p className="text-xs text-gray-500 mt-1">
                  Nhập ngày xử lý thì trạng thái tự động là "Đã xử lý".
                </p>
              </div>

              {/* TRẠNG THÁI */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Trạng thái
                </label>

                <div className="h-10 flex items-center">
                  {form.ngayXuLy ? (
                    <span className="px-3 py-1.5 rounded-full bg-green-100 text-green-700 text-sm font-semibold">
                      Đã xử lý
                    </span>
                  ) : (
                    <span className="px-3 py-1.5 rounded-full bg-yellow-100 text-yellow-700 text-sm font-semibold">
                      Chưa xử lý
                    </span>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* ================================================= */}
          {/* FOOTER */}
          {/* ================================================= */}
          <div className="flex justify-end gap-2 mt-5">
            <button
              type="button"
              onClick={onClose}
              disabled={loading}
              className="px-5 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50"
            >
              Hủy
            </button>

            <button
              type="submit"
              disabled={loading || !tripFound}
              className="inline-flex items-center gap-2 px-5 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
            >
              <FiSave />

              {loading ? "Đang lưu..." : isEdit ? "Cập nhật" : "Thêm chuyến"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default ScheduleErrorModal;
