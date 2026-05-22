import { useState, useEffect, useRef } from "react";
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

const formatOilNumber = (value = "") => {
  if (value === "") return "";

  const num = Number(value) / 1000;

  if (isNaN(num)) return "";

  return num.toLocaleString("vi-VN", {
    minimumFractionDigits: 3,
    maximumFractionDigits: 3,
  });
};

const toNumber = (v) => {
  if (!v) return 0;

  // giữ nguyên dạng chia 1000 nhưng KHÔNG làm tròn
  return parseInt(v, 10) / 1000;
};

function AutoCompleteInput({
  value,
  onChange,
  options,
  placeholder = "",
  inputMode = "text",
}) {
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
    <div className="relative w-full overflow-visible">
      <input
        type="text"
        inputMode={inputMode}
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
        onBlur={() => setTimeout(() => setShow(false), 500)}
        className="w-full border rounded-xl p-3 text-base"
        style={{ fontSize: "18px" }}
      />

      {show && filtered.length > 0 && (
        <div className="absolute left-0 top-full z-[9999] bg-white border rounded-xl shadow-lg mt-1 w-full max-h-56 overflow-y-auto touch-manipulation">
          {filtered.map((o, i) => (
            <div
              key={i}
              onTouchStart={() => {
                onChange(o.text);
                setShow(false);
              }}
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
    imageOil: [],
  });

  // 🔹 4 danh sách gợi ý
  const [drivers, setDrivers] = useState([]);
  const [vehicles, setVehicles] = useState([]);

  // 🔹 Lấy danh sách gợi ý
  useEffect(() => {
    const fetchData = async () => {
      try {
        const [driverRes, vehicleRes] = await Promise.all([
          axios.get(`${API}/drivers/names/list`),
          axios.get(`${API}/vehicles/names/list`),
        ]);

        setDrivers(driverRes.data.data || driverRes.data || []);
        setVehicles(vehicleRes.data.data || vehicleRes.data || []);
      } catch (err) {
        console.error("API ERROR:", err.response?.data || err.message);
      }
    };

    fetchData();
  }, []);

  const [loading, setLoading] = useState(false);
  const [showCloseShift, setShowCloseShift] = useState(false);

  const fileRefNormal = useRef(null);
  const fileRefClose = useRef(null);

  const [imagesNormal, setImagesNormal] = useState([]);
  const [imagesClose, setImagesClose] = useState([]);

  const [focusField, setFocusField] = useState(null);

  const driverNames = drivers.map((d) => d.name || d.tenLaiXe || d);

  const vehiclePlates = vehicles.map((v) => v.plateNumber || v.bienSoXe || v);

  // =========================
  // HANDLE CHANGE
  // =========================
  const handleChange = (e) => {
    const { name, value } = e.target;

    // 3 ô dầu
    if (["soLit", "tongSoDauMay1", "tongSoDauMay2"].includes(name)) {
      const digits = value.replace(/[^\d]/g, "");

      return setForm((prev) => ({
        ...prev,
        [name]: digits,
      }));
    }

    setForm((prev) => ({
      ...prev,
      [name]: name === "mayDo" ? Number(value) : value,
    }));
  };

  const handleImageChange = (e, type) => {
    const rawFiles = Array.from(e.target.files || []);

    const files = rawFiles.map(
      (file) =>
        new File([file], file.name, {
          type: file.type,
          lastModified: file.lastModified,
        })
    );

    if (!showCloseShift && type === "normal") {
      setImagesNormal(files);
      e.target.value = "";
      fileRefNormal.current && (fileRefNormal.current.value = "");
    }

    if (showCloseShift && type === "close") {
      setImagesClose(files);
      e.target.value = "";
      fileRefClose.current && (fileRefClose.current.value = "");
    }
  };

  // =========================
  // SUBMIT
  // =========================
  const handleSubmit = async (e) => {
    e.preventDefault();

    // =========================
    // VALIDATE
    // =========================

    // Nếu KHÔNG phải chốt ca
    if (!showCloseShift) {
      if (!form.bienSoXe?.trim()) {
        return alert("Chưa nhập biển số xe");
      }

      if (!form.tenLaiXe?.trim()) {
        return alert("Chưa nhập tên lái xe");
      }

      if (!form.soLit) {
        return alert("Chưa nhập số lít");
      }
    }

    // Nếu là CHỐT CA
    if (showCloseShift) {
      if (!form.tongSoDauMay1) {
        return alert("Chưa nhập tổng dầu máy 1");
      }

      if (!form.tongSoDauMay2) {
        return alert("Chưa nhập tổng dầu máy 2");
      }
    }

    try {
      setLoading(true);

      const formData = new FormData();

      formData.append("ngay", form.ngay);
      formData.append("ca", form.ca);
      formData.append("mayDo", form.mayDo);

      formData.append("bienSoXe", showCloseShift ? "" : form.bienSoXe);

      formData.append("tenLaiXe", showCloseShift ? "" : form.tenLaiXe);

      formData.append("soLit", showCloseShift ? 0 : toNumber(form.soLit));

      formData.append(
        "tongSoDauMay1",
        form.tongSoDauMay1 ? toNumber(form.tongSoDauMay1) : 0
      );

      formData.append(
        "tongSoDauMay2",
        form.tongSoDauMay2 ? toNumber(form.tongSoDauMay2) : 0
      );

      // append ảnh
      const imgs = showCloseShift ? imagesClose : imagesNormal;

      imgs.forEach((img) => {
        formData.append("imageOil", img);
      });

      await axios.post(`${API}/oil`, formData, {
        headers: {
          "Content-Type": "multipart/form-data",
        },
      });

      alert(showCloseShift ? "Chốt ca thành công!" : "Lưu bơm dầu thành công!");

      // reset form
      setForm((prev) => ({
        ...prev,
        bienSoXe: "",
        tenLaiXe: "",
        soLit: "",
        tongSoDauMay1: "",
        tongSoDauMay2: "",
      }));

      // reset ảnh
      setImagesNormal([]);
      setImagesClose([]);

      // reset file input
      if (fileRefNormal.current) fileRefNormal.current.value = "";
      if (fileRefClose.current) fileRefClose.current.value = "";
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
            onClick={() => {
              setShowCloseShift((prev) => {
                const next = !prev;

                setForm((f) => ({
                  ...f,
                  mayDo: next ? 3 : 1,
                }));

                return next;
              });
            }}
            className={`px-4 py-2 rounded-xl text-xm font-bold whitespace-nowrap ${
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
            <label className="block text-xm font-medium mb-1">Ngày</label>

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
                  Ca {item}
                </button>
              ))}
            </div>
          </div>

          {!showCloseShift && (
            <>
              {/* MÁY */}
              <div>
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
                      Máy đổ {item}
                    </button>
                  ))}
                </div>
              </div>
              {/* BIỂN SỐ */}
              <div>
                <label className="block text-xm font-medium mb-1">
                  Biển số xe
                </label>

                <AutoCompleteInput
                  value={form.bienSoXe}
                  options={vehiclePlates}
                  placeholder="Nhập biển số xe"
                  inputMode="numeric"
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
                <label className="block text-xm font-medium mb-1">
                  Tên lái xe
                </label>

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
                <label className="block text-xm font-medium mb-1">Số lít</label>

                <input
                  type="text"
                  inputMode="numeric"
                  name="soLit"
                  value={
                    focusField === "soLit"
                      ? form.soLit
                      : formatOilNumber(form.soLit)
                  }
                  onChange={handleChange}
                  onFocus={() => setFocusField("soLit")}
                  onBlur={() => setFocusField(null)}
                  placeholder="Nhập số lít"
                  className="w-full border rounded-xl p-4 text-xl font-bold"
                />

                {/* ẢNH */}
                <div className="mt-4">
                  <label className="block text-xm font-medium mb-1">
                    Ảnh bơm dầu (tối đa 1 ảnh)
                  </label>

                  <input
                    ref={fileRefNormal}
                    type="file"
                    accept="image/*"
                    capture="environment"
                    multiple={false}
                    onChange={(e) => handleImageChange(e, "normal")}
                    className="w-full border rounded-xl p-3 bg-white"
                  />

                  {imagesNormal.length > 0 && (
                    <div className="grid grid-cols-1 gap-2 mt-3">
                      {imagesNormal.map((img, index) => (
                        <div
                          key={index}
                          className="relative border rounded-xl overflow-hidden"
                        >
                          <img
                            src={URL.createObjectURL(img)}
                            className="w-full aspect-[3/4] object-cover"
                          />

                          <button
                            type="button"
                            onClick={() => {
                              setImagesNormal([]);
                              if (fileRefNormal.current)
                                fileRefNormal.current.value = "";
                            }}
                            className="absolute top-1 right-1 bg-red-500 text-white w-7 h-7 rounded-full"
                          >
                            ×
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </>
          )}

          {showCloseShift && (
            <>
              {/* TỔNG MÁY 1 */}
              <div>
                <label className="block text-sm font-medium mb-1">
                  Tổng số dầu máy 1
                </label>

                <input
                  type="text"
                  inputMode="numeric"
                  name="tongSoDauMay1"
                  value={
                    focusField === "tongSoDauMay1"
                      ? form.tongSoDauMay1
                      : formatOilNumber(form.tongSoDauMay1)
                  }
                  onChange={handleChange}
                  onFocus={() => setFocusField("tongSoDauMay1")}
                  onBlur={() => setFocusField(null)}
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
                  inputMode="numeric"
                  name="tongSoDauMay2"
                  value={
                    focusField === "tongSoDauMay2"
                      ? form.tongSoDauMay2
                      : formatOilNumber(form.tongSoDauMay2)
                  }
                  onChange={handleChange}
                  onFocus={() => setFocusField("tongSoDauMay2")}
                  onBlur={() => setFocusField(null)}
                  placeholder="Nhập tổng máy 2"
                  className="w-full border rounded-xl p-3 text-base"
                />
              </div>

              {/* ẢNH CHỐT CA */}
              <div className="mt-4">
                <label className="block text-sm font-medium mb-1">
                  Ảnh chốt ca (tối đa 2 ảnh)
                </label>

                <input
                  ref={fileRefClose}
                  type="file"
                  accept="image/*"
                  capture="environment"
                  multiple
                  onChange={(e) => handleImageChange(e, "close")}
                  className="w-full border rounded-xl p-3 bg-white"
                />

                {imagesClose.length > 0 && (
                  <div className="grid grid-cols-2 gap-2 mt-3">
                    {imagesClose.map((img, index) => (
                      <div
                        key={index}
                        className="relative border rounded-xl overflow-hidden"
                      >
                        <img
                          src={URL.createObjectURL(img)}
                          className="w-full aspect-[3/4] object-cover"
                        />

                        <button
                          type="button"
                          onClick={() => {
                            setImagesClose((prev) => {
                              const next = prev.filter((_, i) => i !== index);
                              if (next.length === 0 && fileRefClose.current) {
                                fileRefClose.current.value = "";
                              }
                              return next;
                            });
                          }}
                          className="absolute top-1 right-1 bg-red-500 text-white w-7 h-7 rounded-full"
                        >
                          ×
                        </button>
                      </div>
                    ))}
                  </div>
                )}
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
