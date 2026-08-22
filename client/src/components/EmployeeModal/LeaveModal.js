// LeaveModal.jsx

import React, { useEffect, useMemo, useRef, useState } from "react";
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
  const handlePersonChange = (person) => {
    setForm((prev) => ({
      ...prev,
      nguoiId: person.id,
      tenNguoi: person.name,
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
              {mode === "create" ? "THÊM NGÀY NGHỈ" : "SỬA NGÀY NGHỈ"}
            </h2>
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
            {mode === "edit" ? (
              // =================================================
              // SỬA: KHÔNG CHO THAY ĐỔI NGƯỜI
              // =================================================
              <input
                type="text"
                value={form.tenNguoi || ""}
                disabled
                className={`${inputClass} bg-gray-100 text-gray-500 cursor-not-allowed`}
              />
            ) : (
              // =================================================
              // THÊM: INPUT + DANH SÁCH GỢI Ý
              // =================================================
              <PersonAutocomplete
                people={people}
                loadingPeople={loadingPeople}
                value={form.tenNguoi || ""}
                selectedId={form.nguoiId}
                onSelect={handlePersonChange}
                inputClass={inputClass}
                setForm={setForm}
              />
            )}
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
// AUTOCOMPLETE NHÂN VIÊN / LÁI XE
// =====================================================
const PersonAutocomplete = ({
  people,
  loadingPeople,
  value,
  selectedId,
  onSelect,
  inputClass,
  setForm,
}) => {
  const [search, setSearch] = useState(value || "");
  const [open, setOpen] = useState(false);

  const wrapperRef = useRef(null);

  // =====================================================
  // ĐỒNG BỘ KHI FORM THAY ĐỔI
  // =====================================================
  useEffect(() => {
    setSearch(value || "");
  }, [value]);

  // =====================================================
  // CLICK RA NGOÀI
  // =====================================================
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (wrapperRef.current && !wrapperRef.current.contains(event.target)) {
        setOpen(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  // =====================================================
  // LỌC DANH SÁCH
  // =====================================================
  const filteredPeople = useMemo(() => {
    const keyword = search.trim().toLowerCase();

    if (!keyword) {
      return people;
    }

    return people.filter((person) =>
      String(person.name || "")
        .toLowerCase()
        .includes(keyword),
    );
  }, [people, search]);

  // =====================================================
  // NHẬP TÊN
  // =====================================================
  const handleChange = (e) => {
    const text = e.target.value;

    setSearch(text);
    setOpen(true);

    // Khi sửa/xóa text thì bỏ ID cũ
    setForm((prev) => ({
      ...prev,
      nguoiId: "",
      tenNguoi: text,
    }));
  };

  // =====================================================
  // CHỌN NGƯỜI
  // =====================================================
  const handleSelect = (person) => {
    setSearch(person.name || "");
    setOpen(false);

    onSelect(person);
  };

  return (
    <div ref={wrapperRef} className="relative">
      <input
        type="text"
        value={search}
        onChange={handleChange}
        onFocus={() => setOpen(true)}
        disabled={loadingPeople}
        autoComplete="off"
        placeholder={
          loadingPeople ? "Đang tải..." : "Nhập tên nhân viên / lái xe..."
        }
        className={inputClass}
      />

      {/* =====================================================
          DANH SÁCH GỢI Ý
      ===================================================== */}
      {open && !loadingPeople && (
        <div className="absolute z-[200] left-0 right-0 mt-1 bg-white border border-gray-300 rounded-lg shadow-xl max-h-60 overflow-y-auto">
          {filteredPeople.length > 0 ? (
            filteredPeople.map((person) => {
              const isSelected = String(person.id) === String(selectedId);

              return (
                <button
                  key={person.id}
                  type="button"
                  onClick={() => handleSelect(person)}
                  className={`block w-full text-left px-3 py-2.5 text-sm transition ${
                    isSelected
                      ? "bg-blue-50 text-blue-700 font-semibold"
                      : "text-gray-700 hover:bg-gray-100"
                  }`}
                >
                  {person.name}
                </button>
              );
            })
          ) : (
            <div className="px-3 py-3 text-sm text-gray-500">
              Không tìm thấy "{search}"
            </div>
          )}
        </div>
      )}
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
