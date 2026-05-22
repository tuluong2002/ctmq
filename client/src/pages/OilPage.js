import { useState, useEffect } from "react";
import axios from "axios";
import API from "../api";

const normalize = (str = "") =>
  String(str)
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/đ/g, "d");

const scoreMatch = (input, target) => {
  input = normalize(input);
  target = normalize(target);

  if (!input) return 0;

  if (target.includes(input)) {
    return 100 - (target.length - input.length);
  }

  let score = 0;
  let ti = 0;

  for (let i = 0; i < input.length; i++) {
    const idx = target.indexOf(input[i], ti);

    if (idx === -1) return 0;

    score += 5;
    ti = idx + 1;
  }

  return score;
};

function AutoCompleteInput({ value, onChange, options, placeholder = "" }) {
  const [show, setShow] = useState(false);

  const filtered = options
    .map((opt) => ({
      text: opt,
      score: scoreMatch(value, opt),
    }))
    .filter((o) => o.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, 10);

  return (
    <div className="relative w-full">
      <input
        type="text"
        value={value}
        placeholder={placeholder}
        autoComplete="off"
        autoCorrect="off"
        spellCheck={false}
        onChange={(e) => {
          onChange(e.target.value);
          setShow(true);
        }}
        onFocus={() => setShow(true)}
        onBlur={() => setTimeout(() => setShow(false), 200)}
        className="w-full border rounded-xl p-3 text-base"
      />

      {show && filtered.length > 0 && (
        <div className="absolute z-30 bg-white border rounded-xl shadow-lg mt-1 w-full max-h-56 overflow-y-auto">
          {filtered.map((o, i) => (
            <div
              key={i}
              onMouseDown={(e) => {
                e.preventDefault();
                onChange(o.text);
                setShow(false);
              }}
              className="px-3 py-3 border-b last:border-b-0 cursor-pointer active:bg-gray-100"
            >
              {o.text}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

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
  const [showCloseShift, setShowCloseShift] = useState(false);

  // 🔹 4 danh sách gợi ý
  const [drivers, setDrivers] = useState([]);
  const [vehicles, setVehicles] = useState([]);

  // 🔹 Lấy danh sách gợi ý
  useEffect(() => {
    const fetchData = async () => {
      const [driverRes, vehicleRes] = await Promise.all([
        axios.get(`${API}/drivers/names/list`),
        axios.get(`${API}/vehicles/names/list`),
      ]);
      setDrivers(driverRes.data);
      setVehicles(vehicleRes.data);
    };
    fetchData();
  }, []);

  const driverNames = drivers.map((d) => d.name || d.tenLaiXe || d);

  const vehiclePlates = vehicles.map((v) => v.plateNumber || v.bienSoXe || v);

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
        <div className="flex items-center justify-between mb-5 gap-3">
          <h1 className="text-2xl font-bold">CÂY DẦU NGỌC LONG</h1>

          <button
            type="button"
            onClick={() => setShowCloseShift((prev) => !prev)}
            className={`px-4 py-2 rounded-xl text-sm font-bold whitespace-nowrap ${
              showCloseShift
                ? "bg-gray-500 text-white"
                : "bg-red-500 text-white"
            }`}
          >
            {showCloseShift ? "Ẩn chốt ca" : "Chốt ca"}
          </button>
        </div>

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
            <label className="block text-sm font-medium mb-2">Ca</label>

            <div className="grid grid-cols-2 gap-2">
              {["Sáng", "Chiều"].map((item) => (
                <button
                  key={item}
                  type="button"
                  onClick={() =>
                    setForm((prev) => ({
                      ...prev,
                      ca: item,
                    }))
                  }
                  className={`rounded-xl py-3 font-semibold border transition ${
                    form.ca === item
                      ? "bg-green-600 text-white border-blue-600"
                      : "bg-white border-gray-300"
                  }`}
                >
                  {item}
                </button>
              ))}
            </div>
          </div>

          {/* MÁY */}
          <div>
            <label className="block text-sm font-medium mb-2">Máy đổ</label>

            <div className="grid grid-cols-2 gap-2">
              {[1, 2].map((item) => (
                <button
                  key={item}
                  type="button"
                  onClick={() =>
                    setForm((prev) => ({
                      ...prev,
                      mayDo: item,
                    }))
                  }
                  className={`rounded-xl py-3 font-semibold border transition ${
                    form.mayDo === item
                      ? "bg-green-600 text-white border-green-600"
                      : "bg-white border-gray-300"
                  }`}
                >
                  Máy {item}
                </button>
              ))}
            </div>
          </div>

          {/* BIỂN SỐ */}
          <div>
            <label className="block text-sm font-medium mb-1">Biển số xe</label>

            <AutoCompleteInput
              value={form.bienSoXe}
              options={vehiclePlates}
              placeholder="Nhập biển số xe"
              onChange={(val) =>
                setForm((prev) => ({
                  ...prev,
                  bienSoXe: val,
                }))
              }
            />
          </div>

          {/* LÁI XE */}
          <div>
            <label className="block text-sm font-medium mb-1">Tên lái xe</label>

            <AutoCompleteInput
              value={form.tenLaiXe}
              options={driverNames}
              placeholder="Nhập tên lái xe"
              onChange={(val) =>
                setForm((prev) => ({
                  ...prev,
                  tenLaiXe: val,
                }))
              }
            />
          </div>

          {/* SỐ LÍT */}
          <div>
            <label className="block text-sm font-medium mb-1">Số lít</label>

            <input
              type="text"
              inputMode="decimal"
              name="soLit"
              value={form.soLit}
              onChange={handleChange}
              placeholder="Nhập số lít"
              className="w-full border rounded-xl p-4 text-xl font-bold"
            />
          </div>

          {showCloseShift && (
            <>
              {/* TỔNG MÁY 1 */}
              <div>
                <label className="block text-sm font-medium mb-1">
                  Tổng số dầu máy 1
                </label>

                <input
                  type="text"
                  inputMode="decimal"
                  name="tongSoDauMay1"
                  value={form.tongSoDauMay1}
                  onChange={handleChange}
                  placeholder="Nhập tổng máy 1"
                  className="w-full border rounded-xl p-3 text-base"
                />
              </div>

              {/* TỔNG MÁY 2 */}
              <div>
                <label className="block text-sm font-medium mb-1">
                  Tổng số dầu máy 2
                </label>

                <input
                  type="text"
                  inputMode="decimal"
                  name="tongSoDauMay2"
                  value={form.tongSoDauMay2}
                  onChange={handleChange}
                  placeholder="Nhập tổng máy 2"
                  className="w-full border rounded-xl p-3 text-base"
                />
              </div>
            </>
          )}

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
