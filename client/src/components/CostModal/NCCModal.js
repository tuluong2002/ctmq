import React, { useEffect, useState } from "react";
import axios from "axios";
import API from "../../api";

export default function NCCModal({
  open,
  mode = "add",
  data,
  userList,
  onClose,
  onSuccess,
}) {
  const [form, setForm] = useState({
    stt: "",
    mst: "",
    tenNguoiBan: "",
    stkNganHang: "",
    hangMuc: "",
    chiTietChiPhi: "",
    nguoiPhuTrach: "",
    xuatTu: "",
    ghiChu: "",
  });

  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!open) return;

    if (mode === "edit" && data) {
      setForm({
        stt: data.stt || "",
        mst: data.mst || "",
        tenNguoiBan: data.tenNguoiBan || "",
        stkNganHang: data.stkNganHang || "",
        hangMuc: data.hangMuc || "",
        chiTietChiPhi: data.chiTietChiPhi || "",
        nguoiPhuTrach: data.nguoiPhuTrach || "",
        xuatTu: data.xuatTu || "",
        ghiChu: data.ghiChu || "",
      });
    } else {
      setForm({
        stt: "",
        mst: "",
        tenNguoiBan: "",
        stkNganHang: "",
        hangMuc: "",
        chiTietChiPhi: "",
        nguoiPhuTrach: "",
        xuatTu: "",
        ghiChu: "",
      });
    }
  }, [open, mode, data]);

  if (!open) return null;

  const handleChange = (e) => {
    const { name, value } = e.target;

    setForm((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!form.stt.trim()) {
      alert("Vui lòng nhập STT");
      return;
    }

    if (!form.tenNguoiBan.trim()) {
      alert("Vui lòng nhập tên người bán/người xuất hàng");
      return;
    }

    try {
      setSaving(true);

      let res;

      if (mode === "edit") {
        res = await axios.put(
          `${API}/ncc/${encodeURIComponent(form.stt.trim())}`,
          {
            mst: form.mst,
            tenNguoiBan: form.tenNguoiBan,
            stkNganHang: form.stkNganHang,
            hangMuc: form.hangMuc,
            chiTietChiPhi: form.chiTietChiPhi,
            nguoiPhuTrach: form.nguoiPhuTrach,
            xuatTu: form.xuatTu,
            ghiChu: form.ghiChu,
          },
        );
      } else {
        res = await axios.post(`${API}/ncc`, form);
      }

      alert(
        res.data?.message ||
          (mode === "edit" ? "Cập nhật NCC thành công" : "Thêm NCC thành công"),
      );

      onSuccess?.(res.data?.data);
      onClose?.();
    } catch (error) {
      console.error("Lỗi lưu NCC:", error);

      alert(
        error.response?.data?.message ||
          (mode === "edit" ? "Cập nhật NCC thất bại" : "Thêm NCC thất bại"),
      );
    } finally {
      setSaving(false);
    }
  };

  const inputClass =
    "w-full border border-gray-300 rounded px-3 py-2 outline-none focus:ring-2 focus:ring-blue-500";

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="w-full max-w-4xl rounded-lg bg-white shadow-xl">
        {/* HEADER */}
        <div className="flex items-center justify-between border-b px-5 py-4">
          <h2 className="text-lg font-semibold">
            {mode === "edit" ? "Sửa NCC" : "Thêm NCC"}
          </h2>

          <button
            type="button"
            onClick={onClose}
            disabled={saving}
            className="text-xl text-gray-500 hover:text-black disabled:opacity-50"
          >
            ×
          </button>
        </div>

        {/* FORM */}
        <form onSubmit={handleSubmit}>
          <div className="grid grid-cols-1 gap-4 p-5 md:grid-cols-2">
            {/* STT */}
            <div>
              <label className="mb-1 block text-sm font-medium">
                STT <span className="text-red-500">*</span>
              </label>

              <input
                name="stt"
                value={form.stt}
                onChange={handleChange}
                disabled={mode === "edit"}
                className={`${inputClass} ${
                  mode === "edit" ? "bg-gray-100" : ""
                }`}
                placeholder="Ví dụ: NCC1"
              />
            </div>

            {/* MST */}
            <div>
              <label className="mb-1 block text-sm font-medium">
                MST người bán/MST người xuất hàng
              </label>

              <input
                name="mst"
                value={form.mst}
                onChange={handleChange}
                className={inputClass}
              />
            </div>

            {/* TÊN */}
            <div className="md:col-span-2">
              <label className="mb-1 block text-sm font-medium">
                Tên người bán/Tên người xuất hàng{" "}
                <span className="text-red-500">*</span>
              </label>

              <input
                name="tenNguoiBan"
                value={form.tenNguoiBan}
                onChange={handleChange}
                className={inputClass}
              />
            </div>

            {/* STK */}
            <div>
              <label className="mb-1 block text-sm font-medium">
                STK NGÂN HÀNG
              </label>

              <input
                name="stkNganHang"
                value={form.stkNganHang}
                onChange={handleChange}
                className={inputClass}
              />
            </div>

            {/* HẠNG MỤC */}
            <div>
              <label className="mb-1 block text-sm font-medium">HẠNG MỤC</label>

              <input
                name="hangMuc"
                value={form.hangMuc}
                onChange={handleChange}
                className={inputClass}
              />
            </div>

            {/* CHI TIẾT */}
            <div className="md:col-span-2">
              <label className="mb-1 block text-sm font-medium">
                CHI TIẾT CHI PHÍ
              </label>

              <input
                name="chiTietChiPhi"
                value={form.chiTietChiPhi}
                onChange={handleChange}
                className={inputClass}
              />
            </div>

            {/* NGƯỜI PHỤ TRÁCH */}
            <div>
              <label className="mb-1 block text-sm font-medium">
                NGƯỜI PHỤ TRÁCH
              </label>

              <select
                name="nguoiPhuTrach"
                value={form.nguoiPhuTrach}
                onChange={handleChange}
                className={inputClass}
              >
                <option value="">-- Chọn người phụ trách --</option>

                {Array.isArray(userList) &&
                  userList.map((user) => {
                    const fullname = String(user.fullname || "").trim();

                    if (!fullname) return null;

                    return (
                      <option
                        key={user._id || user.username || fullname}
                        value={fullname}
                      >
                        {fullname}
                      </option>
                    );
                  })}
              </select>
            </div>

            {/* XUẤT TỪ */}
            <div>
              <label className="mb-1 block text-sm font-medium">XUẤT TỪ</label>

              <input
                name="xuatTu"
                value={form.xuatTu}
                onChange={handleChange}
                className={inputClass}
              />
            </div>

            {/* GHI CHÚ */}
            <div className="md:col-span-2">
              <label className="mb-1 block text-sm font-medium">GHI CHÚ</label>

              <textarea
                name="ghiChu"
                value={form.ghiChu}
                onChange={handleChange}
                rows={3}
                className={inputClass}
              />
            </div>
          </div>

          {/* FOOTER */}
          <div className="flex justify-end gap-2 border-t px-5 py-4">
            <button
              type="button"
              onClick={onClose}
              disabled={saving}
              className="rounded border bg-white px-4 py-2 hover:bg-gray-100 disabled:opacity-50"
            >
              Hủy
            </button>

            <button
              type="submit"
              disabled={saving}
              className="rounded bg-blue-600 px-4 py-2 text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {saving
                ? "Đang lưu..."
                : mode === "edit"
                  ? "Lưu thay đổi"
                  : "Thêm mới"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
