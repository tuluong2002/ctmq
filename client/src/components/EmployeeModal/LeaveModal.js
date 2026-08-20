// LeaveModal.jsx

import React from "react";
import { FiX } from "react-icons/fi";

const LeaveModal = ({
  mode = "create",
  form,
  setForm,
  people,
  loadingPeople,
  onClose,
  onSave,
}) => {
  // =====================================================
  // CLASS DÙNG CHUNG CHO INPUT
  // =====================================================
  const inputClass =
    "w-full border border-gray-300 rounded-lg px-3 py-2 bg-white text-gray-800 outline-none transition focus:border-blue-500 focus:ring-1 focus:ring-blue-500";

  // =====================================================
  // CHỌN NHÂN VIÊN / LÁI XE
  // =====================================================
  const handlePersonChange = (id) => {
    const person = people.find((item) => String(item.id) === String(id));

    setForm((prev) => ({
      ...prev,
      nguoiId: id,
      tenNguoi: person?.name || "",
    }));
  };

  // =====================================================
  // CHỌN LOẠI NGHỈ
  // =====================================================
  const handleLeaveTypeChange = (value) => {
    setForm((prev) => ({
      ...prev,
      loaiNghi: value,
      soGioNghi: "",
    }));
  };

  // =====================================================
  // TÍNH SỐ NGÀY NGHỈ
  // =====================================================
  const soNgayNghi =
    form.loaiNghi === "ALL_DAY" ? 1 : form.loaiNghi === "HALF_DAY" ? 0.5 : 0;

  // =====================================================
  // TÍNH SỐ GIỜ NGHỈ
  // =====================================================
  const soGioNghi =
    form.loaiNghi === "LATE" || form.loaiNghi === "EARLY"
      ? Number(form.soGioNghi || 0)
      : 0;

  return (
    <div className="fixed inset-0 z-[100] bg-black/40 flex items-center justify-center p-4">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-xl max-h-[90vh] overflow-y-auto">
        {/* =====================================================
            HEADER
        ===================================================== */}
        <div className="flex items-center justify-between px-5 py-4 border-b">
          <div>
            <h2 className="text-lg font-bold text-gray-800">
              {mode === "create" ? "Thêm ngày nghỉ" : "Sửa ngày nghỉ"}
            </h2>

            <p className="text-xs text-gray-500 mt-1">Quản lý nghỉ của NV/LX</p>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-2 rounded-lg hover:bg-gray-100 transition"
          >
            <FiX size={20} />
          </button>
        </div>

        {/* =====================================================
            BODY
        ===================================================== */}
        <div className="p-5 space-y-4">
          {/* =====================================================
              NGÀY
          ===================================================== */}
          <FormField label="Ngày tháng">
            <input
              type="date"
              value={form.ngayThang}
              onChange={(e) =>
                setForm((prev) => ({
                  ...prev,
                  ngayThang: e.target.value,
                }))
              }
              onClick={(e) => e.target.showPicker()}
              className={inputClass}
            />
          </FormField>

          {/* =====================================================
              NHÂN VIÊN / LÁI XE
          ===================================================== */}
          <FormField label="Tên nhân viên / lái xe">
            <select
              value={form.nguoiId}
              onChange={(e) => handlePersonChange(e.target.value)}
              className={inputClass}
            >
              <option value="">
                {loadingPeople
                  ? "Đang tải..."
                  : "-- Chọn nhân viên / lái xe --"}
              </option>

              {people.map((person) => (
                <option key={person.id} value={person.id}>
                  {person.name}
                </option>
              ))}
            </select>
          </FormField>

          {/* =====================================================
              LOẠI NGHỈ
          ===================================================== */}
          <FormField label="Loại nghỉ">
            <select
              value={form.loaiNghi}
              onChange={(e) => handleLeaveTypeChange(e.target.value)}
              className={inputClass}
            >
              <option value="ALL_DAY">Cả ngày</option>
              <option value="HALF_DAY">1/2 ngày</option>
              <option value="LATE">Đi muộn</option>
              <option value="EARLY">Về sớm</option>
            </select>
          </FormField>

          {/* =====================================================
              SỐ GIỜ NGHỈ
          ===================================================== */}
          {(form.loaiNghi === "LATE" || form.loaiNghi === "EARLY") && (
            <FormField label="Số giờ nghỉ">
              <input
                type="number"
                min="0"
                step="0.5"
                value={form.soGioNghi}
                onChange={(e) =>
                  setForm((prev) => ({
                    ...prev,
                    soGioNghi: e.target.value,
                  }))
                }
                placeholder="Ví dụ: 2"
                className={inputClass}
              />
            </FormField>
          )}

          {/* =====================================================
              PREVIEW
          ===================================================== */}
          <div className="grid grid-cols-2 gap-3">
            <div className="bg-gray-50 border border-gray-300 rounded-lg p-3">
              <div className="text-xs text-gray-500">Số ngày nghỉ</div>

              <div className="font-bold text-gray-800 mt-1">{soNgayNghi}</div>
            </div>

            <div className="bg-gray-50 border border-gray-300 rounded-lg p-3">
              <div className="text-xs text-gray-500">Số giờ nghỉ</div>

              <div className="font-bold text-gray-800 mt-1">{soGioNghi}</div>
            </div>
          </div>

          {/* =====================================================
              LÝ DO
          ===================================================== */}
          <FormField label="Lý do nghỉ / Ghi chú">
            <textarea
              rows={4}
              value={form.lyDo}
              onChange={(e) =>
                setForm((prev) => ({
                  ...prev,
                  lyDo: e.target.value,
                }))
              }
              placeholder="Nhập lý do hoặc ghi chú..."
              className={`${inputClass} resize-none`}
            />
          </FormField>
        </div>

        {/* =====================================================
            FOOTER
        ===================================================== */}
        <div className="flex justify-end gap-2 px-5 py-4 border-t bg-gray-50">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-lg border border-gray-300 bg-white hover:bg-gray-100 transition"
          >
            Hủy
          </button>

          <button
            type="button"
            onClick={onSave}
            className="px-5 py-2 rounded-lg bg-blue-600 text-white hover:bg-blue-700 transition"
          >
            {mode === "create" ? "Thêm" : "Lưu thay đổi"}
          </button>
        </div>
      </div>
    </div>
  );
};

// =====================================================
// FORM FIELD
// =====================================================
const FormField = ({ label, children }) => {
  return (
    <div>
      <label className="block text-sm font-medium text-gray-700 mb-1.5">
        {label}
      </label>

      {children}
    </div>
  );
};

export default LeaveModal;
