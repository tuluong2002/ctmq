import { useEffect, useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import axios from "axios";
import API from "../../api";

const formatDateInput = (date) => {
  const d = new Date(date);

  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");

  return `${year}-${month}-${day}`;
};

export default function ManageOil() {
  const [date, setDate] = useState(formatDateInput(new Date()));
  const [loading, setLoading] = useState(false);
  const [records, setRecords] = useState([]);

  const navigate = useNavigate();

  // thêm state này ở đầu component
  const [previewImage, setPreviewImage] = useState(null);

  const fetchData = async (selectedDate = date) => {
    try {
      setLoading(true);

      const res = await axios.get(`${API}/oil/by-date?date=${selectedDate}`);

      setRecords(res.data || []);
    } catch (err) {
      console.error(err);
      alert("Lỗi tải danh sách");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const totalLit = records.reduce(
    (sum, item) => sum + Number(item.soLit || 0),
    0,
  );

  const location = useLocation();
  const isActive = (path) => location.pathname === path;

  // 👉 Hàm chuyển sang trang quản lý lái xe
  const handleGoToDrivers = () => {
    navigate("/manage-driver", { state: { user } });
  };

  const handleGoToCustomers = () => {
    navigate("/manage-customer", { state: { user } });
  };

  const handleGoToVehicles = () => {
    navigate("/manage-vehicle", { state: { user } });
  };

  const handleGoToTrips = () => {
    navigate("/manage-trip", { state: { user } });
  };

  const handleGoToAllTrips = () => {
    navigate("/manage-all-trip", { state: { user } });
  };

  const handleGoToAllCustomers = () => {
    navigate("/customer-debt", { state: { user } });
  };

  const handleGoToCustomer26 = () => {
    navigate("/customer-debt-26", { state: { user } });
  };
  const handleGoToVouchers = () =>
    navigate("/voucher-list", { state: { user } });

  const handleGoToContract = () => {
    navigate("/contract", { state: { user } });
  };

  const handleGoToTCB = () => {
    navigate("/tcb-person", { state: { user } });
  };

  return (
    <div
      style={{
        padding: 12,
        background: "#f5f5f5",
        minHeight: "100vh",
      }}
    >
      <div className="flex gap-2 items-center mb-4 text-xs">
        <button
          onClick={() => navigate("/ke-toan")}
          className="px-3 py-1 rounded text-white bg-blue-500"
        >
          Trang chính
        </button>

        <button
          onClick={handleGoToDrivers}
          className={`px-3 py-1 rounded text-white 
      ${isActive("/manage-driver") ? "bg-green-600" : "bg-blue-500"}
    `}
        >
          Danh sách lái xe
        </button>

        <button
          onClick={handleGoToCustomers}
          className={`px-3 py-1 rounded text-white 
      ${isActive("/manage-customer") ? "bg-green-600" : "bg-blue-500"}
    `}
        >
          Danh sách khách hàng
        </button>

        <button
          onClick={handleGoToVehicles}
          className={`px-3 py-1 rounded text-white 
      ${isActive("/manage-vehicle") ? "bg-green-600" : "bg-blue-500"}
    `}
        >
          Danh sách xe
        </button>

        <button
          onClick={handleGoToTrips}
          className={`px-3 py-1 rounded text-white 
      ${isActive("/manage-trip") ? "bg-green-600" : "bg-blue-500"}
    `}
        >
          Danh sách chuyến phụ trách
        </button>

        <button
          onClick={() => {
            if (!currentUser?.permissions?.includes("edit_trip")) {
              alert("Bạn không có quyền truy cập!");
              return;
            }
            handleGoToAllTrips();
          }}
          className={`px-3 py-1 rounded text-white 
      ${isActive("/manage-all-trip") ? "bg-green-600" : "bg-blue-500"}
    `}
        >
          Tất cả các chuyến
        </button>

        <button
          onClick={handleGoToAllCustomers}
          className={`px-3 py-1 rounded text-white 
      ${isActive("/customer-debt") ? "bg-green-600" : "bg-blue-500"}
    `}
        >
          Công nợ KH
        </button>

        <button
          onClick={handleGoToCustomer26}
          className={`px-3 py-1 rounded text-white 
      ${isActive("/customer-debt-26") ? "bg-green-600" : "bg-blue-500"}
    `}
        >
          Công nợ khách lẻ
        </button>
        <button
          onClick={handleGoToVouchers}
          className={`px-3 py-1 rounded text-white ${
            isActive("/voucher-list") ? "bg-green-600" : "bg-blue-500"
          }`}
        >
          Sổ phiếu chi
        </button>
        <button
          onClick={handleGoToContract}
          className={`px-3 py-1 rounded text-white ${
            isActive("/contract") ? "bg-green-600" : "bg-blue-500"
          }`}
        >
          Hợp đồng vận chuyển
        </button>
        <button
          onClick={handleGoToTCB}
          className={`px-3 py-1 rounded text-white ${
            isActive("/tcb-person") ? "bg-green-600" : "bg-blue-500"
          }`}
        >
          TCB cá nhân
        </button>
      </div>
      {/* Header */}
      <div
        style={{
          background: "#fff",
          padding: 12,
          borderRadius: 12,
          marginBottom: 12,
          boxShadow: "0 2px 8px rgba(0,0,0,0.08)",
        }}
      >
        <h2
          style={{
            margin: 0,
            marginBottom: 12,
            fontSize: 24,
          }}
        >
          Trạm dầu Ngọc Long
        </h2>

        <div
          style={{
            display: "flex",
            gap: 8,
            marginBottom: 10,
            alignItems: "center",
          }}
        >
          <input
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            style={{
              width: "15%",
              minWidth: 80,
              padding: 10,
              borderRadius: 8,
              border: "1px solid #ccc",
              fontSize: 16,
            }}
            onClick={(e) => e.target.showPicker()}
          />

          <button
            onClick={() => fetchData(date)}
            style={{
              padding: "10px 18px",
              border: "none",
              borderRadius: 8,
              background: "#1677ff",
              color: "#fff",
              fontWeight: "bold",
              cursor: "pointer",
              whiteSpace: "nowrap",
            }}
          >
            Xem
          </button>
        </div>

        <div
          style={{
            display: "flex",
            gap: 20,
            flexWrap: "wrap",
            fontWeight: "bold",
          }}
        >
          <div>
            Tổng số lần bơm:{" "}
            {records.filter((item) => Number(item.mayDo) !== 3).length}
          </div>

          <div style={{ color: "green" }}>
            Tổng số lít: {totalLit.toLocaleString("vi-VN")}
          </div>
        </div>
      </div>

      {/* Loading */}
      {loading && (
        <div
          style={{
            textAlign: "center",
            marginTop: 20,
          }}
        >
          Đang tải...
        </div>
      )}

      {/* Empty */}
      {!loading && records.length === 0 && (
        <div
          style={{
            textAlign: "center",
            marginTop: 20,
            color: "#666",
          }}
        >
          Không có dữ liệu
        </div>
      )}

      {/* Table */}
      {!loading && records.length > 0 && (
        <div
          style={{
            background: "#fff",
            borderRadius: 12,
            overflow: "visible",
            boxShadow: "0 2px 8px rgba(0,0,0,0.08)",
          }}
        >
          <div
            style={{
              overflowX: "auto",
              overflowY: "visible",
            }}
          >
            <table
              style={{
                width: "100%",
                minWidth: 1100,
                borderCollapse: "collapse",
              }}
            >
              <thead>
                <tr
                  style={{
                    background: "#1677ff",
                    color: "#fff",
                  }}
                >
                  {[
                    "CA",
                    "MÁY",
                    "BIỂN SỐ XE",
                    "TÊN LÁI XE",
                    "SỐ LÍT",
                    "TỔNG DẦU MÁY 1",
                    "TỔNG DẦU MÁY 2",
                    "ẢNH ĐÍNH KÈM",
                  ].map((title) => (
                    <th
                      key={title}
                      style={{
                        padding: 12,
                        border: "1px solid #ddd",
                        textAlign: "center",
                        whiteSpace: "nowrap",
                        fontSize: 14,
                      }}
                    >
                      {title}
                    </th>
                  ))}
                </tr>
              </thead>

              <tbody>
                {records.map((item, index) => (
                  <tr
                    key={item._id}
                    style={{
                      background: index % 2 === 0 ? "#fff" : "#fafafa",
                    }}
                  >
                    {/* Ca */}
                    <td
                      style={{
                        padding: 10,
                        border: "1px solid #ddd",
                        textAlign: "center",
                        fontWeight: "bold",
                      }}
                    >
                      {item.ca || ""}
                    </td>
                    {/* Máy */}
                    <td
                      style={{
                        padding: 10,
                        border: "1px solid #ddd",
                        textAlign: "center",
                        fontWeight: "bold",
                        color: Number(item.mayDo) === 3 ? "red" : "#000",
                      }}
                    >
                      {Number(item.mayDo) === 3 ? "Chốt ca" : item.mayDo}
                    </td>
                    {/* BSX */}
                    <td
                      style={{
                        padding: 10,
                        border: "1px solid #ddd",
                        textAlign: "center",
                        fontWeight: "bold",
                      }}
                    >
                      {item.bsx || ""}
                    </td>
                    {/* Tên lái xe */}
                    <td
                      style={{
                        padding: 10,
                        border: "1px solid #ddd",
                        minWidth: 120,
                      }}
                    >
                      {item.tenLaiXe || ""}
                    </td>
                    {/* Số lít */}
                    <td
                      style={{
                        padding: 10,
                        border: "1px solid #ddd",
                        textAlign: "right",
                        color: "green",
                        fontWeight: "bold",
                      }}
                    >
                      {Number(item.soLit || 0) !== 0
                        ? Number(item.soLit).toLocaleString("vi-VN", {
                            minimumFractionDigits: 3,
                            maximumFractionDigits: 3,
                          })
                        : ""}
                    </td>
                    {/* Tổng 1 */}
                    <td
                      style={{
                        padding: 10,
                        border: "1px solid #ddd",
                        textAlign: "right",
                        color: "red",
                        fontWeight: "bold",
                      }}
                    >
                      {Number(item.tongSoDauMay1 || 0) !== 0
                        ? Number(item.tongSoDauMay1).toLocaleString("vi-VN", {
                            minimumFractionDigits: 3,
                            maximumFractionDigits: 3,
                          })
                        : ""}
                    </td>
                    {/* Tổng 2 */}
                    <td
                      style={{
                        padding: 10,
                        border: "1px solid #ddd",
                        textAlign: "right",
                        color: "red",
                        fontWeight: "bold",
                      }}
                    >
                      {Number(item.tongSoDauMay2 || 0) !== 0
                        ? Number(item.tongSoDauMay2).toLocaleString("vi-VN", {
                            minimumFractionDigits: 3,
                            maximumFractionDigits: 3,
                          })
                        : ""}
                    </td>
                    {/* Ảnh */}
                    <td
                      style={{
                        padding: 10,
                        border: "1px solid #ddd",
                        minWidth: 340,
                      }}
                    >
                      <div
                        style={{
                          display: "flex",
                          gap: 8,
                          overflowX: "auto",
                          justifyContent: "center",
                          alignItems: "center",
                        }}
                      >
                        {Array.isArray(item.imageOil) &&
                        item.imageOil.length > 0 ? (
                          item.imageOil.map((img, imgIndex) => (
                            <img
                              key={imgIndex}
                              src={img}
                              alt=""
                              onMouseEnter={() => setPreviewImage(img)}
                              onMouseLeave={() => setPreviewImage(null)}
                              style={{
                                width: 50,
                                height: 30,
                                objectFit: "cover",
                                borderRadius: 8,
                                border: "1px solid #ddd",
                                cursor: "pointer",
                                flexShrink: 0,
                                background: "#fff",
                              }}
                            />
                          ))
                        ) : (
                          <span
                            style={{
                              color: "#999",
                              fontSize: 13,
                            }}
                          >
                            Không có ảnh
                          </span>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {previewImage && (
        <img
          src={previewImage}
          alt=""
          style={{
            position: "fixed",
            top: "50%",
            left: "70%", // nằm bên trái cột ảnh / gần cột tổng 2
            transform: "translateY(-50%)",
            width: 500,
            maxHeight: "85vh",
            objectFit: "contain",
            borderRadius: 12,
            border: "3px solid #1677ff",
            background: "#fff",
            padding: 4,
            boxShadow: "0 10px 30px rgba(0,0,0,0.35)",
            zIndex: 999999,
            pointerEvents: "none",
          }}
        />
      )}
    </div>
  );
}
