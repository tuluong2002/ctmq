import { useState, useEffect } from "react";
import maQR from "../../images/maQR.jpg";
import API from "../../api";
import axios from "axios";

const columns = [
  "Biển số xe",
  "Tên khách hàng",
  "Giấy tờ (Có/Không)",
  "Nơi đi",
  "Nơi đến",
  "Trọng lượng hàng",
  "Số điểm",
  "2 chiều & lưu ca (Ghi rõ số lượng hàng trả về)",
  "Ăn",
  "Tăng ca",
  "Bốc xếp",
  "Vé",
  "Tiền chuyến (2+3+4+5 nếu có)",
  "Chi phí khác (Ghi rõ)",
];

const normalize = (str = "") =>
  str
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");

const scoreMatch = (input, target) => {
  input = normalize(input);
  target = normalize(target);

  if (!input) return 0;
  if (target.includes(input)) return 100 - (target.length - input.length);

  // fuzzy: kiểm tra thứ tự ký tự
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

const numberToWordsVN = (num) => {
  if (!num || num === 0) return "Không đồng";

  const units = [
    "",
    "một",
    "hai",
    "ba",
    "bốn",
    "năm",
    "sáu",
    "bảy",
    "tám",
    "chín",
  ];
  const tens = [
    "",
    "mười",
    "hai mươi",
    "ba mươi",
    "bốn mươi",
    "năm mươi",
    "sáu mươi",
    "bảy mươi",
    "tám mươi",
    "chín mươi",
  ];

  const readTwoDigits = (n) => {
    if (n < 10) return units[n];
    if (n < 20) return "mười " + units[n % 10];
    return tens[Math.floor(n / 10)] + (n % 10 ? " " + units[n % 10] : "");
  };

  const readThreeDigits = (n) => {
    let str = "";
    const h = Math.floor(n / 100);
    const r = n % 100;

    if (h > 0) str += units[h] + " trăm";
    if (r > 0) str += (str ? " " : "") + readTwoDigits(r);

    return str;
  };

  if (num < 1000) return readThreeDigits(num) + " đồng";

  if (num < 1_000_000) {
    const thousand = Math.floor(num / 1000);
    const rest = num % 1000;
    return (
      readThreeDigits(thousand) +
      " nghìn" +
      (rest ? " " + readThreeDigits(rest) : "") +
      " đồng"
    );
  }

  // 🔥 TRIỆU
  const million = Math.floor(num / 1_000_000);
  const rest = num % 1_000_000;
  const thousand = Math.floor(rest / 1000);
  const remain = rest % 1000;

  let result = readThreeDigits(million) + " triệu";
  if (thousand) result += " " + readThreeDigits(thousand) + " nghìn";
  if (remain) result += " " + readThreeDigits(remain);

  return result + " đồng";
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
    .slice(0, 8);

  return (
    <div className="relative w-full">
      <input
        type="text"
        value={value}
        placeholder={placeholder}
        onChange={(e) => {
          onChange(e.target.value);
          setShow(true);
        }}
        onBlur={() => setTimeout(() => setShow(false), 150)}
        className="border rounded px-2 py-1 w-full"
      />

      {show && filtered.length > 0 && (
        <div className="absolute z-20 bg-white border w-full rounded shadow max-h-48 overflow-auto">
          {filtered.map((o, i) => (
            <div
              key={i}
              className="px-2 py-1 hover:bg-blue-100 cursor-pointer text-sm"
              onClick={() => {
                onChange(o.text);
                setShow(false);
              }}
            >
              {o.text}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default function AddUserScheduleModal({ open, onClose, user }) {
  if (!open) return null;

  const [errors, setErrors] = useState({
    tenLaiXe: false,
    ngayDi: false,
    ngayVe: false,
    tongTienLichTrinh: false,
    rows: [],
  });

  const [isSubmitting, setIsSubmitting] = useState(false);

  const [rows, setRows] = useState([
    { id: Date.now(), values: Array(columns.length).fill("") },
  ]);
  const [driverInfo, setDriverInfo] = useState({
    tenLaiXe: "",
    ngayDi: "", // Sửa đổi: Thêm trường ngày đi
    ngayVe: "", // Sửa đổi: Thêm trường ngày về
  });
  const [tongTienLichTrinh, setTongTienLichTrinh] = useState("");
  const [laiXeThuKhachList, setLaiXeThuKhachList] = useState([""]);
  const [phuongAnList, setPhuongAnList] = useState([""]);

  // 🔹 4 danh sách gợi ý
  const [drivers, setDrivers] = useState([]);
  const [customers, setCustomers] = useState([]);
  const [vehicles, setVehicles] = useState([]);
  const [addressSuggestions, setAddressSuggestions] = useState([]);

  // 🔹 Lấy danh sách gợi ý
  useEffect(() => {
    const fetchData = async () => {
      const [driverRes, customerRes, vehicleRes, addressRes] =
        await Promise.all([
          axios.get(`${API}/drivers/names/list`),
          axios.get(`${API}/customers`),
          axios.get(`${API}/vehicles/names/list`),
          axios.get(`${API}/address/all`),
        ]);
      setDrivers(driverRes.data);
      setCustomers(customerRes.data);
      setVehicles(vehicleRes.data);
      setAddressSuggestions(addressRes.data.data || []);
    };
    fetchData();
  }, []);

  const driverNames = drivers.map((d) => d.name);
  const customerNames = customers.map((c) => c.name);
  const vehiclePlates = vehicles.map((v) => v.plateNumber);
  const addressList = addressSuggestions.map((a) => a.diaChi);

  const handleDriverInfoChange = (field, value) => {
    setDriverInfo((prev) => ({ ...prev, [field]: value }));
  };

  const handleInputChange = (rowId, colIndex, value) => {
    setRows((prev) =>
      prev.map((row) =>
        row.id === rowId
          ? {
              ...row,
              values: row.values.map((v, i) => (i === colIndex ? value : v)),
            }
          : row,
      ),
    );
  };

  const addRow = () => {
    setRows([
      ...rows,
      { id: Date.now(), values: Array(columns.length).fill("") },
    ]);
    setLaiXeThuKhachList([...laiXeThuKhachList, ""]);
    setPhuongAnList([...phuongAnList, ""]);
  };

  const deleteLastRow = () => {
    if (rows.length > 1) {
      setRows((prev) => prev.slice(0, -1));
      setLaiXeThuKhachList((prev) => prev.slice(0, -1));
      setPhuongAnList((prev) => prev.slice(0, -1));
    }
  };

  const handleSubmit = async () => {
    setIsSubmitting(true);

    const newErrors = {
      userId: user?._id,
      tenLaiXe: !driverInfo.tenLaiXe.trim(),
      ngayDi: !driverInfo.ngayDi,
      ngayVe: !driverInfo.ngayVe,
      tongTienLichTrinh: !tongTienLichTrinh,
      rows: rows.map((row) => {
        const requiredIndices = [0, 1, 2, 3, 4, 5, 6, 7]; // Biển số -> 2 chiều
        return requiredIndices.map((i) => !row.values[i].trim());
      }),
    };

    const hasErrors =
      newErrors.tenLaiXe ||
      newErrors.ngayDi ||
      newErrors.ngayVe ||
      newErrors.tongTienLichTrinh ||
      newErrors.rows.some((row) => row.includes(true));

    setErrors(newErrors);

    if (hasErrors) {
      alert("Vui lòng điền đầy đủ các trường bắt buộc!");
      setIsSubmitting(false); // Cho phép bấm lại
      return;
    }

    try {
      const payload = {
        userId: user?._id,
        tenLaiXe: String(driverInfo.tenLaiXe || ""),
        ngayDi: driverInfo.ngayDi,
        ngayVe: driverInfo.ngayVe,
        tongTienLichTrinh: String(tongTienLichTrinh || ""),
        rows: rows.map((row, index) => ({
          values: row.values.map((val) => String(val)),
          laiXeThuKhach: String(laiXeThuKhachList[index] || ""),
          phuongAn: String(phuongAnList[index] || ""),
        })),
      };

      console.log("Dữ liệu gửi đi:", payload);
      await axios.post(`${API}/user-schedules`, payload);
      alert("Thêm lịch trình thành công!");
      onClose(); // đóng modal
    } catch (error) {
      console.error("Có lỗi xảy ra khi gửi dữ liệu:", error);
      alert("Có lỗi xảy ra khi gửi dữ liệu.");
      setIsSubmitting(false); // Cho phép bấm lại khi lỗi
    }
  };

  return (
    <div className="fixed inset-0 z-[9999] bg-black/50 flex items-center justify-center">
      <div className="bg-white w-[95vw] h-[95vh] rounded-lg overflow-auto">
        <div className="sticky top-0 bg-white border-b p-4 flex justify-between items-center">
          <h2 className="font-bold text-xl">Thêm lịch trình</h2>

          <button
            onClick={onClose}
            className="px-3 py-1 bg-red-500 text-white rounded"
          >
            Đóng
          </button>
        </div>

        <div className="p-4 max-w-full mx-auto">
          {/* Thông tin lái xe */}
          <div className="mb-6 grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
            <div>
              <label className="block mb-1 font-semibold">Tên lái xe:</label>
              <AutoCompleteInput
                value={driverInfo.tenLaiXe}
                options={driverNames}
                placeholder="Bắt buộc điền"
                onChange={(val) => handleDriverInfoChange("tenLaiXe", val)}
              />
            </div>
          </div>

          <div className="mb-6 flex flex-wrap gap-4">
            {/* Ngày đi */}
            <div className="flex-1 min-w-[120px]">
              <label className="block mb-1 font-semibold">Ngày đi:</label>
              <input
                type="datetime-local"
                className={`border rounded px-2 py-1 w-full ${
                  errors.ngayDi ? "border-red-500" : "border-gray-400"
                }`}
                value={driverInfo.ngayDi}
                onChange={(e) =>
                  handleDriverInfoChange("ngayDi", e.target.value)
                }
                onClick={(e) => e.target.showPicker()}
              />
            </div>

            {/* Ngày về */}
            <div className="flex-1 min-w-[120px]">
              <label className="block mb-1 font-semibold">Ngày về:</label>
              <input
                type="datetime-local"
                className={`border rounded px-2 py-1 w-full ${
                  errors.ngayDi ? "border-red-500" : "border-gray-400"
                }`}
                value={driverInfo.ngayVe}
                onChange={(e) =>
                  handleDriverInfoChange("ngayVe", e.target.value)
                }
                onClick={(e) => e.target.showPicker()}
              />
            </div>
          </div>

          {/* Danh sách chuyến */}
          {rows.map((row, index) => (
            <div
              key={row.id}
              className="flex flex-col md:flex-row items-start gap-6 border border-gray-300 p-4 rounded-md mb-4"
            >
              <label className="block font-medium">Chuyến {index + 1}:</label>
              {/* Các input thông tin chuyến */}
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2 flex-1">
                {columns.map((col, i) => {
                  // Ẩn cột 9 ("Ăn") và 10 ("Tăng ca") từ chuyến thứ 2 trở đi
                  if (index > 0 && (i === 8 || i === 9)) {
                    return null;
                  }

                  const hasError = errors.rows?.[index]?.[i];

                  return (
                    <div key={i} className="flex items-center gap-2 w-full">
                      <label className="text-sm font-medium w-[160px] shrink-0">
                        {col}:
                      </label>
                      {[0, 1, 3, 4].includes(i) ? (
                        <AutoCompleteInput
                          value={row.values[i]}
                          options={
                            i === 0
                              ? vehiclePlates
                              : i === 1
                                ? customerNames
                                : addressList
                          }
                          placeholder={
                            [0, 1, 3, 4].includes(i) ? "Bắt buộc điền" : ""
                          }
                          onChange={(val) => handleInputChange(row.id, i, val)}
                        />
                      ) : (
                        <input
                          type="text"
                          placeholder={
                            [0, 1, 2, 3, 4, 5, 6, 7].includes(i)
                              ? "Bắt buộc điền"
                              : ""
                          }
                          value={row.values[i]}
                          onChange={(e) =>
                            handleInputChange(row.id, i, e.target.value)
                          }
                          className={`border rounded px-2 py-1 w-full ${
                            hasError ? "border-red-500" : "border-gray-300"
                          }`}
                        />
                      )}
                    </div>
                  );
                })}
              </div>

              {/* Phần phương án + lái xe thu khách */}
              <div className="w-full md:w-64 space-y-3">
                <div>
                  <label className="block font-medium">Lái xe thu khách:</label>
                  <input
                    type="text"
                    className="border border-gray-300 rounded px-2 py-1 w-full"
                    value={laiXeThuKhachList[index]}
                    onChange={(e) => {
                      const updated = [...laiXeThuKhachList];
                      updated[index] = e.target.value;
                      setLaiXeThuKhachList(updated);
                    }}
                    placeholder="Nhập tiền thu khách"
                  />
                </div>

                {/* Phương án chỉ xuất hiện nếu có nhập "Lái xe thu khách" */}
                {laiXeThuKhachList[index] &&
                  laiXeThuKhachList[index] !== "0" &&
                  Number(laiXeThuKhachList[index]) !== 0 && (
                    <div>
                      <label className="block font-medium">Phương án:</label>
                      <label className="flex items-center">
                        <input
                          type="radio"
                          name={`phuongAn-${index}`}
                          value="daChuyenKhoan"
                          checked={phuongAnList[index] === "daChuyenKhoan"}
                          onChange={(e) => {
                            const updated = [...phuongAnList];
                            updated[index] = e.target.value;
                            setPhuongAnList(updated);
                          }}
                          className="mr-2"
                        />
                        Đã chuyển khoản cho sếp
                      </label>
                      <label className="flex items-center">
                        <input
                          type="radio"
                          name={`phuongAn-${index}`}
                          value="truVaoTongLichTrinh"
                          checked={
                            phuongAnList[index] === "truVaoTongLichTrinh"
                          }
                          onChange={(e) => {
                            const updated = [...phuongAnList];
                            updated[index] = e.target.value;
                            setPhuongAnList(updated);
                          }}
                          className="mr-2"
                        />
                        Trừ thanh toán lịch trình
                      </label>
                    </div>
                  )}
              </div>
            </div>
          ))}

          {/* Nút thêm/xóa dòng */}
          <div className="mt-6 flex gap-4 flex-wrap">
            <button
              onClick={addRow}
              className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded shadow"
            >
              Thêm chuyến
            </button>
            <button
              onClick={deleteLastRow}
              className="bg-red-600 hover:bg-yellow-700 text-white px-4 py-2 rounded shadow"
            >
              Xóa chuyến cuối
            </button>
          </div>

          <div className="mt-5">
            <p className="text-gray-700 font-semibold text-sm italic">
              Nếu chuyển khoản thì chuyển vào STK sau: 1212 3656 1750 11 -
              Techcombank - Đoàn Văn Thiệp
            </p>
            <p className="text-gray-700 font-semibold text-sm italic">
              Hoặc quét mã QR sau:
            </p>
            <img src={maQR} alt="Ảnh trong src" className="w-40 h-auto ml-10" />
          </div>

          {/* Tổng tiền lịch trình */}
          <div className="mt-8 max-w-xs">
            <label className="block mb-1 font-semibold">
              Tổng tiền lịch trình:
            </label>
            <p className="text-gray-700 italic font-semibold text-sm">
              (Lưu ý: chỉ ghi số, ví dụ 100.000 thì chỉ ghi 100)
            </p>
            <input
              type="text"
              inputMode="numeric"
              placeholder="Bắt buộc điền (tối đa 5 chữ số)"
              className={`border rounded px-2 py-1 w-full ${
                errors.tongTienLichTrinh ? "border-red-500" : "border-gray-400"
              }`}
              value={tongTienLichTrinh}
              onChange={(e) => {
                let val = e.target.value.replace(/\D/g, ""); // ❌ chỉ cho số
                if (val.length > 5) val = val.slice(0, 5); // ❌ max 5 số
                setTongTienLichTrinh(val);
              }}
            />
            {tongTienLichTrinh && (
              <p className="text-red-600 font-semibold mt-1">
                {numberToWordsVN(Number(tongTienLichTrinh) * 1000)}
              </p>
            )}
          </div>

          {/* Nút gửi */}
          <div className="mt-6">
            <button
              onClick={handleSubmit}
              disabled={isSubmitting}
              className={`bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 rounded shadow ${
                isSubmitting ? "opacity-50 cursor-not-allowed" : ""
              }`}
            >
              {isSubmitting ? "Đang gửi..." : "Thêm lịch trình"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
