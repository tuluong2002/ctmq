import { useEffect, useMemo, useState } from "react";

export default function DeNghiThanhToanModal({
  open,
  editing,
  month,
  user,
  nccList = [],
  onClose,
  onSubmit,
}) {
  const [form, setForm] = useState({
    ngayDeNghi: "",
    nguoiDeNghi: "",
    maSoThue: "",
    nhaCungCap: "",
    stkNganHang: "",
    noiDungCK: "",
    hoaDonSo: "",
    nhomChiPhi: "",
    ghiChu: "",
    soTienTruocThue: "",
    thue: "",
    tongTien: "",
  });

  const [showNccSuggestions, setShowNccSuggestions] = useState(false);

  /* =========================================================
     FORMAT TIỀN
  ========================================================= */

  const formatMoney = (value) => {
    if (value === null || value === undefined || value === "") {
      return "";
    }

    return Number(value).toLocaleString("vi-VN");
  };

  const parseMoney = (value) => {
    if (!value) return 0;

    return Number(String(value).replace(/\./g, "").replace(/,/g, "")) || 0;
  };

  /* =========================================================
     NGÀY HÔM NAY
  ========================================================= */

  const getToday = () => {
    const now = new Date();

    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, "0");
    const day = String(now.getDate()).padStart(2, "0");

    return `${year}-${month}-${day}`;
  };

  /* =========================================================
     NGƯỜI ĐỀ NGHỊ
  ========================================================= */

  const getUserName = () => {
    return user?.fullname || user?.username || "";
  };

  /* =========================================================
     KHỞI TẠO FORM
  ========================================================= */

  useEffect(() => {
    if (!open) return;

    setShowNccSuggestions(false);

    if (editing) {
      // =====================================================
      // SỬA
      // Giữ nguyên ngày + người đề nghị cũ
      // =====================================================

      setForm({
        ngayDeNghi: editing.ngayDeNghi
          ? new Date(editing.ngayDeNghi).toISOString().split("T")[0]
          : "",

        nguoiDeNghi: editing.nguoiDeNghi || "",

        maSoThue: editing.maSoThue || "",

        nhaCungCap: editing.nhaCungCap || "",

        stkNganHang: editing.stkNganHang || "",

        noiDungCK: editing.noiDungCK || "",

        hoaDonSo: editing.hoaDonSo || "",

        nhomChiPhi: editing.nhomChiPhi || "",

        ghiChu: editing.ghiChu || "",

        soTienTruocThue: editing.soTienTruocThue ?? "",

        thue: editing.thue ?? "",

        tongTien: editing.tongTien ?? "",
      });
    } else {
      // =====================================================
      // THÊM MỚI
      // Ngày = hôm nay
      // Người đề nghị = user.fullname || user.username
      // =====================================================

      setForm({
        ngayDeNghi: getToday(),

        nguoiDeNghi: getUserName(),

        maSoThue: "",

        nhaCungCap: "",

        stkNganHang: "",

        noiDungCK: "",

        hoaDonSo: "",

        nhomChiPhi: "",

        ghiChu: "",

        soTienTruocThue: "",

        thue: "",

        tongTien: "",
      });
    }
  }, [open, editing, user]);

  /* =========================================================
     DANH SÁCH NCC GỢI Ý
     
     Gợi ý theo tenNguoiBan
  ========================================================= */

  const filteredNccList = useMemo(() => {
    const keyword = String(form.nhaCungCap || "")
      .trim()
      .toLowerCase();

    if (!keyword) {
      return nccList;
    }

    return nccList.filter((item) =>
      String(item.tenNguoiBan || "")
        .toLowerCase()
        .includes(keyword),
    );
  }, [nccList, form.nhaCungCap]);

  /* =========================================================
     CHỌN NHÀ CUNG CẤP
     
     Tự động điền:
     - MST
     - STK
     - Nhóm chi phí = chiTietChiPhi
  ========================================================= */

  const handleSelectNcc = (item) => {
    setForm((prev) => ({
      ...prev,

      nhaCungCap: item.tenNguoiBan || "",

      maSoThue: item.mst || "",

      stkNganHang: item.stkNganHang || "",

      nhomChiPhi: item.chiTietChiPhi || "",
    }));

    setShowNccSuggestions(false);
  };

  /* =========================================================
     CHANGE
  ========================================================= */

  const handleChange = (field, value) => {
    setForm((prev) => ({
      ...prev,
      [field]: value,
    }));
  };

  /* =========================================================
     CHANGE NHÀ CUNG CẤP
  ========================================================= */

  const handleNccChange = (value) => {
    setForm((prev) => ({
      ...prev,
      nhaCungCap: value,
    }));

    setShowNccSuggestions(true);
  };

  /* =========================================================
     CHANGE TIỀN
  ========================================================= */

  const handleMoneyChange = (field, value) => {
    const number = parseMoney(value);

    setForm((prev) => {
      const next = {
        ...prev,
        [field]: number,
      };

      next.tongTien =
        (Number(next.soTienTruocThue) || 0) + (Number(next.thue) || 0);

      return next;
    });
  };

  /* =========================================================
     SUBMIT
  ========================================================= */

  const handleSubmit = (e) => {
    e.preventDefault();

    if (!form.ngayDeNghi) {
      alert("Vui lòng nhập ngày đề nghị");
      return;
    }

    if (!form.nguoiDeNghi.trim()) {
      alert("Không xác định được người đề nghị");
      return;
    }

    const payload = {
      ...form,

      soTienTruocThue: Number(form.soTienTruocThue) || 0,

      thue: Number(form.thue) || 0,

      tongTien: Number(form.tongTien) || 0,
    };

    onSubmit(payload);
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 bg-black/40 z-[100] flex items-center justify-center p-4">
      <form
        onSubmit={handleSubmit}
        className="bg-white rounded-lg shadow-xl w-full max-w-5xl max-h-[90vh] overflow-auto"
      >
        {/* =====================================================
            HEADER
        ===================================================== */}

        <div className="sticky top-0 bg-white border-b px-5 py-3 flex justify-between items-center z-20">
          <div>
            <h2 className="font-bold text-base">
              {editing
                ? `Sửa phiếu ${editing.maPhieu}`
                : "Thêm phiếu đề nghị thanh toán"}
            </h2>

            {editing && (
              <div className="text-gray-500 mt-1">
                Mã phiếu: {editing.maPhieu}
              </div>
            )}
          </div>

          <button
            type="button"
            onClick={onClose}
            className="text-xl text-gray-500 hover:text-black"
          >
            ×
          </button>
        </div>

        {/* =====================================================
            FORM
        ===================================================== */}

        <div className="p-5 grid grid-cols-2 gap-4">
          {/* =================================================
              NGÀY ĐỀ NGHỊ
          ================================================= */}

          <Field label="Ngày đề nghị *">
            <input
              type="date"
              value={form.ngayDeNghi}
              readOnly
              disabled
              className="input bg-gray-100 cursor-not-allowed"
            />
          </Field>

          {/* =================================================
              NGƯỜI ĐỀ NGHỊ
          ================================================= */}

          <Field label="Người đề nghị *">
            <input
              value={form.nguoiDeNghi}
              readOnly
              disabled
              className="input bg-gray-100 cursor-not-allowed"
            />
          </Field>

          {/* =================================================
              NHÀ CUNG CẤP
          ================================================= */}

          <Field label="Nhà cung cấp">
            <div className="relative">
              <input
                value={form.nhaCungCap}
                onChange={(e) => handleNccChange(e.target.value)}
                onFocus={() => setShowNccSuggestions(true)}
                onBlur={() => {
                  setTimeout(() => {
                    setShowNccSuggestions(false);
                  }, 200);
                }}
                className="input"
                placeholder="Nhập tên nhà cung cấp..."
                autoComplete="off"
              />

              {/* ===========================================
                  DANH SÁCH GỢI Ý NCC
              =========================================== */}

              {showNccSuggestions && filteredNccList.length > 0 && (
                <div className="absolute left-0 right-0 top-full mt-1 bg-white border rounded-md shadow-lg z-[50] max-h-60 overflow-auto">
                  {filteredNccList.map((item, index) => (
                    <button
                      key={item._id || item.stt || index}
                      type="button"
                      onMouseDown={(e) => {
                        e.preventDefault();
                        handleSelectNcc(item);
                      }}
                      className="w-full text-left px-3 py-2 hover:bg-blue-50 border-b last:border-b-0"
                    >
                      <div className="font-medium">{item.tenNguoiBan}</div>

                      <div className="text-gray-500 text-[11px] mt-1">
                        MST: {item.mst || "—"}
                        {" | "}
                        STK: {item.stkNganHang || "—"}
                      </div>

                      <div className="text-gray-500 text-[11px]">
                        Chi phí: {item.chiTietChiPhi || "—"}
                      </div>
                    </button>
                  ))}
                </div>
              )}

              {showNccSuggestions &&
                form.nhaCungCap &&
                filteredNccList.length === 0 && (
                  <div className="absolute left-0 right-0 top-full mt-1 bg-white border rounded-md shadow-lg z-[50] px-3 py-2 text-gray-500">
                    Không tìm thấy nhà cung cấp
                  </div>
                )}
            </div>
          </Field>

          {/* =================================================
              MÃ SỐ THUẾ
          ================================================= */}

          <Field label="Mã số thuế">
            <input
              value={form.maSoThue}
              onChange={(e) => handleChange("maSoThue", e.target.value)}
              className="input"
              placeholder="Nhập mã số thuế"
            />
          </Field>

          {/* =================================================
              STK
          ================================================= */}

          <Field label="STK ngân hàng">
            <input
              value={form.stkNganHang}
              onChange={(e) => handleChange("stkNganHang", e.target.value)}
              className="input"
              placeholder="Nhập số tài khoản"
            />
          </Field>

          {/* =================================================
              HÓA ĐƠN
          ================================================= */}

          <Field label="Hóa đơn số">
            <input
              value={form.hoaDonSo}
              onChange={(e) => handleChange("hoaDonSo", e.target.value)}
              className="input"
              placeholder="Nhập số hóa đơn"
            />
          </Field>

          {/* =================================================
              NHÓM CHI PHÍ
          ================================================= */}

          <Field label="Nhóm chi phí">
            <input
              value={form.nhomChiPhi}
              onChange={(e) => handleChange("nhomChiPhi", e.target.value)}
              className="input"
              placeholder="Nhập nhóm chi phí"
            />
          </Field>

          {/* =================================================
             TỔNG TIỀN
           ================================================= */}

          <Field label="Tổng tiền sau thuế">
            <input
              value={formatMoney(form.tongTien)}
              readOnly
              disabled
              className="input text-right bg-gray-100 font-bold cursor-not-allowed"
            />
          </Field>

          {/* =================================================
              TRƯỚC THUẾ
          ================================================= */}

          <Field label="Số tiền đề nghị trước thuế">
            <input
              inputMode="numeric"
              value={formatMoney(form.soTienTruocThue)}
              onChange={(e) =>
                handleMoneyChange("soTienTruocThue", e.target.value)
              }
              className="input text-right"
              placeholder="0"
            />
          </Field>

          {/* =================================================
              THUẾ
          ================================================= */}

          <Field label="Thuế">
            <input
              inputMode="numeric"
              value={formatMoney(form.thue)}
              onChange={(e) => handleMoneyChange("thue", e.target.value)}
              className="input text-right"
              placeholder="0"
            />
          </Field>

          {/* =================================================
              NỘI DUNG CK
          ================================================= */}

          <div className="col-span-2">
            <Field label="Nội dung CK">
              <textarea
                rows={3}
                value={form.noiDungCK}
                onChange={(e) => handleChange("noiDungCK", e.target.value)}
                className="input resize-none"
                placeholder="Nhập nội dung chuyển khoản"
              />
            </Field>
          </div>

          {/* =================================================
              GHI CHÚ
          ================================================= */}

          <div className="col-span-2">
            <Field label="Ghi chú">
              <textarea
                rows={3}
                value={form.ghiChu}
                onChange={(e) => handleChange("ghiChu", e.target.value)}
                className="input resize-none"
                placeholder="Nhập ghi chú"
              />
            </Field>
          </div>
        </div>

        {/* =====================================================
            FOOTER
        ===================================================== */}

        <div className="sticky bottom-0 bg-white border-t px-5 py-3 flex justify-end gap-2">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 border rounded hover:bg-gray-100"
          >
            Hủy
          </button>

          <button
            type="submit"
            className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
          >
            {editing ? "Cập nhật" : "Lưu phiếu"}
          </button>
        </div>
      </form>

      {/* =====================================================
          STYLE
      ===================================================== */}

      <style>{`
        .input {
          width: 100%;
          border: 1px solid #d1d5db;
          border-radius: 6px;
          padding: 8px 10px;
          outline: none;
          background: white;
        }

        .input:focus {
          border-color: #2563eb;
          box-shadow: 0 0 0 1px #2563eb;
        }

        .input:disabled {
          color: #4b5563;
          opacity: 1;
        }
      `}</style>
    </div>
  );
}

/* =========================================================
   FIELD
========================================================= */

function Field({ label, children }) {
  return (
    <div>
      <label className="block font-medium mb-1">{label}</label>

      {children}
    </div>
  );
}
