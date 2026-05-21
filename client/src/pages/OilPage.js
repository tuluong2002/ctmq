import { useState } from "react";
import axios from "axios";
import API from "../api";

export default function OilCreatePage() {
  const [form, setForm] = useState({
    ngay: new Date().toISOString().split("T")[0],
    ca: "Sáng",
    mayDo: 1,
    bienSoXe: "",
    tenLaiXe: "",
    soLit: "",
    tongSoDauMay1: "",
    tongSoDauMay2: "",
  });

  const [loading, setLoading] = useState(false);

  // =========================
  // HANDLE CHANGE
  // =========================
  const handleChange = (e) => {
    const { name, value } = e.target;

    setForm((prev) => ({
      ...prev,
      [name]: name === "mayDo" ? Number(value) : value,
    }));
  };

  // =========================
  // SUBMIT
  // =========================
  const handleSubmit = async (e) => {
    e.preventDefault();

    try {
      setLoading(true);

      await axios.post(`${API}/oil`, {
        ...form,
        soLit: Number(form.soLit),
      });

      alert("Lưu bơm dầu thành công!");

      setForm((prev) => ({
        ...prev,
        bienSoXe: "",
        tenLaiXe: "",
        soLit: "",
      }));
    } catch (err) {
      console.error(err);

      alert(err?.response?.data?.error || "Lỗi lưu bơm dầu");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-100 p-3">
      <div className="max-w-md mx-auto bg-white rounded-2xl shadow p-4">
        <h1 className="text-2xl font-bold text-center mb-5">Thêm bơm dầu</h1>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* NGÀY */}
          <div>
            <label className="block text-sm font-medium mb-1">Ngày</label>

            <input
              type="date"
              name="ngay"
              value={form.ngay}
              onChange={handleChange}
              className="w-full border rounded-xl p-3 text-base"
            />
          </div>

          {/* CA */}
          <div>
            <label className="block text-sm font-medium mb-1">Ca</label>

            <select
              name="ca"
              value={form.ca}
              onChange={handleChange}
              className="w-full border rounded-xl p-3 text-base"
            >
              <option value="Sáng">Sáng</option>

              <option value="Chiều">Chiều</option>
            </select>
          </div>

          {/* MÁY */}
          <div>
            <label className="block text-sm font-medium mb-1">Máy đổ</label>

            <select
              name="mayDo"
              value={form.mayDo}
              onChange={handleChange}
              className="w-full border rounded-xl p-3 text-base"
            >
              <option value={1}>Máy 1</option>

              <option value={2}>Máy 2</option>
            </select>
          </div>

          {/* BIỂN SỐ */}
          <div>
            <label className="block text-sm font-medium mb-1">Biển số xe</label>

            <input
              type="text"
              name="bienSoXe"
              value={form.bienSoXe}
              onChange={handleChange}
              placeholder="Nhập biển số xe"
              className="w-full border rounded-xl p-3 text-base"
            />
          </div>

          {/* LÁI XE */}
          <div>
            <label className="block text-sm font-medium mb-1">Tên lái xe</label>

            <input
              type="text"
              name="tenLaiXe"
              value={form.tenLaiXe}
              onChange={handleChange}
              placeholder="Nhập tên lái xe"
              className="w-full border rounded-xl p-3 text-base"
            />
          </div>

          {/* SỐ LÍT */}
          <div>
            <label className="block text-sm font-medium mb-1">Số lít</label>

            <input
              type="number"
              inputMode="numeric"
              pattern="[0-9]*"
              name="soLit"
              value={form.soLit}
              onChange={handleChange}
              placeholder="Nhập số lít"
              className="w-full border rounded-xl p-4 text-xl font-bold"
            />
          </div>

          {/* TỔNG MÁY 1 */}
          <div>
            <label className="block text-sm font-medium mb-1">
              Tổng số dầu máy 1
            </label>

            <input
              type="number"
              inputMode="numeric"
              pattern="[0-9]*"
              name="tongSoDauMay1"
              value={form.tongSoDauMay1}
              onChange={handleChange}
              placeholder="Không bắt buộc"
              className="w-full border rounded-xl p-3 text-base"
            />
          </div>

          {/* TỔNG MÁY 2 */}
          <div>
            <label className="block text-sm font-medium mb-1">
              Tổng số dầu máy 2
            </label>

            <input
              type="number"
              inputMode="numeric"
              pattern="[0-9]*"
              name="tongSoDauMay2"
              value={form.tongSoDauMay2}
              onChange={handleChange}
              placeholder="Không bắt buộc"
              className="w-full border rounded-xl p-3 text-base"
            />
          </div>

          {/* BUTTON */}
          <button
            type="submit"
            disabled={loading}
            className="w-full bg-blue-600 text-white rounded-xl py-4 text-lg font-bold active:scale-[0.98]"
          >
            {loading ? "Đang lưu..." : "Lưu bơm dầu"}
          </button>
        </form>
      </div>
    </div>
  );
}
