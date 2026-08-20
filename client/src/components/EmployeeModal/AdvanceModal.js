// AdvanceModal.jsx

import React from "react";
import { FiX } from "react-icons/fi";

// =====================================================
// FORMAT TIỀN
// =====================================================
const formatMoney = (value) => {
  const number = Number(value || 0);

  if (!Number.isFinite(number)) {
    return "0";
  }

  return new Intl.NumberFormat("vi-VN").format(number);
};

// =====================================================
// PARSE TIỀN
// =====================================================
const parseMoney = (value) => {
  if (value === null || value === undefined) {
    return 0;
  }

  return Number(String(value).replace(/[^\d]/g, "")) || 0;
};

// =====================================================
// TEXT PHƯƠNG ÁN XỬ LÝ
// =====================================================
const getAdvanceMethodText = (type, otherText = "") => {
  switch (type) {
    case "SALARY":
      return "Trừ lương";

    case "TRIP_PAYMENT":
      return "Trừ thanh toán lịch trình";

    case "OTHER":
      return otherText ? `Khác: ${otherText}` : "Khác";

    default:
      return "—";
  }
};

const AdvanceModal = ({
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
  // CHỌN PHƯƠNG ÁN XỬ LÝ
  // =====================================================
  const handleMethodChange = (value) => {
    setForm((prev) => ({
      ...prev,
      phuongAnXuLy: value,
      noiDungKhac: value === "OTHER" ? prev.noiDungKhac : "",
    }));
  };

  // =====================================================
  // SỐ TIỀN
  // =====================================================
  const amount = parseMoney(form.soTienUng);

  return (
    <div className="fixed inset-0 z-[100] bg-black/40 flex items-center justify-center p-4">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-xl max-h-[90vh] overflow-y-auto">
        {/* =====================================================
            HEADER
        ===================================================== */}
        <div className="flex items-center justify-between px-5 py-4 border-b">
          <div>
            <h2 className="text-lg font-bold text-gray-800">
              {mode === "create" ? "Thêm khoản ứng" : "Sửa khoản ứng"}
            </h2>

            <p className="text-xs text-gray-500 mt-1">Quản lý ứng tiền NV/LX</p>
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
              SỐ TIỀN
          ===================================================== */}
          <FormField label="Số tiền ứng">
            <div className="relative">
              <input
                type="text"
                inputMode="numeric"
                value={formatMoney(amount)}
                onChange={(e) =>
                  setForm((prev) => ({
                    ...prev,
                    soTienUng: parseMoney(e.target.value),
                  }))
                }
                placeholder="1,000,000"
                className={`${inputClass} pr-12 text-right font-medium`}
              />

              <span className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 text-sm">
                VNĐ
              </span>
            </div>
          </FormField>

          {/* =====================================================
              LÝ DO
          ===================================================== */}
          <FormField label="Lý do ứng / Ghi chú">
            <textarea
              rows={3}
              value={form.lyDo}
              onChange={(e) =>
                setForm((prev) => ({
                  ...prev,
                  lyDo: e.target.value,
                }))
              }
              placeholder="Nhập lý do ứng..."
              className={`${inputClass} resize-none`}
            />
          </FormField>

          {/* =====================================================
              PHƯƠNG ÁN
          ===================================================== */}
          <FormField label="Phương án xử lý">
            <select
              value={form.phuongAnXuLy}
              onChange={(e) => handleMethodChange(e.target.value)}
              className={inputClass}
            >
              <option value="SALARY">Trừ lương</option>

              <option value="TRIP_PAYMENT">Trừ thanh toán lịch trình</option>

              <option value="OTHER">Khác</option>
            </select>
          </FormField>

          {/* =====================================================
              PHƯƠNG ÁN KHÁC
          ===================================================== */}
          {form.phuongAnXuLy === "OTHER" && (
            <FormField label="Nội dung phương án khác">
              <textarea
                rows={3}
                value={form.noiDungKhac}
                onChange={(e) =>
                  setForm((prev) => ({
                    ...prev,
                    noiDungKhac: e.target.value,
                  }))
                }
                placeholder="Nhập nội dung xử lý..."
                className={`${inputClass} resize-none`}
              />
            </FormField>
          )}

          {/* =====================================================
              PREVIEW
          ===================================================== */}
          <div className="bg-gray-50 border border-gray-300 rounded-lg p-4">
            <div className="text-xs text-gray-500">Số tiền ứng</div>

            <div className="text-xl font-bold text-gray-800 mt-1">
              {formatMoney(amount)} VNĐ
            </div>

            <div className="text-xs text-gray-500 mt-2">Phương án xử lý</div>

            <div className="font-medium text-gray-800 mt-1">
              {getAdvanceMethodText(form.phuongAnXuLy, form.noiDungKhac)}
            </div>
          </div>
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

export default AdvanceModal;
