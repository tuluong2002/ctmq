import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import axios from "axios";
import API from "../../api";

const formatMoney = (value) => {
  return Number(value || 0).toLocaleString("vi-VN");
};

const formatDate = (value) => {
  if (!value) return "";

  return new Date(value).toLocaleDateString("vi-VN");
};

export default function DeNghiThanhToanPrintPage() {
  const { id } = useParams();

  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  const [watermarkLoaded, setWatermarkLoaded] = useState(false);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const token = localStorage.getItem("token");

        const res = await axios.get(`${API}/de-nghi-thanh-toan/${id}`, {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });

        setData(res.data?.data || null);
      } catch (error) {
        console.error("fetchDeNghiThanhToanPrint:", error);

        alert(
          error.response?.data?.message ||
            "Không thể lấy dữ liệu phiếu đề nghị thanh toán",
        );
      } finally {
        setLoading(false);
      }
    };

    if (id) {
      fetchData();
    }
  }, [id]);

  useEffect(() => {
    const img = new Image();

    img.src = "/watermark.png";

    img.onload = () => {
      setWatermarkLoaded(true);
    };

    img.onerror = () => {
      setWatermarkLoaded(true);
    };
  }, []);

  if (loading) {
    return <div className="p-5 text-center">Đang tải phiếu...</div>;
  }

  if (!data) {
    return (
      <div className="p-5 text-center text-red-600">Không tìm thấy phiếu</div>
    );
  }

  return (
    <>
      <style>{`
        @page {
          size: A4;
          margin: 0;
        }

        html,
        body {
          margin: 0;
          padding: 0;
          background: #e5e7eb;
        }

        * {
          box-sizing: border-box;
        }

        .print-page {
          width: 210mm;
          min-height: 297mm;
          margin: 10px auto;
          background: white;
          padding: 10mm;
          position: relative;
          overflow: hidden;
          font-family: Arial, Helvetica, sans-serif;
          color: #000;
        }

        .print-content {
          position: relative;
          z-index: 10;
        }

        .watermark {
          position: absolute;
          width: 180mm;
          left: 15mm;
          top: 110mm;
          opacity: 0.08;
          z-index: 1;
          pointer-events: none;
        }

        .company-name {
          text-align: center;
          font-size: 15px;
          font-weight: bold;
          margin-bottom: 5px;
        }

        .document-title {
          text-align: center;
          font-size: 18px;
          font-weight: bold;
          margin-bottom: 8px;
        }

        .top-info {
          display: grid;
          grid-template-columns: 1fr 1fr;
          font-size: 12px;
          margin-bottom: 5px;
        }

        .top-info-right {
          text-align: right;
        }

        .section-title {
          border: 1px solid #000;
          background: #f3f4f6;
          font-weight: bold;
          font-size: 12px;
          padding: 5px 7px;
        }

        .info-table {
          width: 100%;
          border-collapse: collapse;
          font-size: 11px;
        }

        .info-table td {
          border: 1px solid #000;
          padding: 5px 6px;
          vertical-align: middle;
        }

        .label {
          font-weight: bold;
          white-space: nowrap;
        }

        .value {
          font-weight: 600;
        }

        .documents {
          border: 1px solid #000;
          border-top: none;
          min-height: 42mm;
          padding: 7px;
          font-size: 11px;
          line-height: 1.8;
        }

        .document-note {
          margin-top: 8px;
          border-top: 1px solid #000;
          padding-top: 7px;
        }

        .approval-table {
          width: 100%;
          border-collapse: collapse;
          table-layout: fixed;
          font-size: 10px;
        }

        .approval-table td {
          border: 1px solid #000;
          vertical-align: top;
        }

        .approval-header {
          height: 9mm;
          text-align: center;
          font-weight: bold;
          padding: 5px;
        }

        .approval-subheader {
          height: 7mm;
          text-align: center;
          font-style: italic;
          padding: 3px;
        }

        .approval-body {
          height: 35mm;
          padding: 7px;
          line-height: 1.8;
        }

        .payment-table {
          width: 100%;
          border-collapse: collapse;
          font-size: 11px;
        }

        .payment-table td {
          border: 1px solid #000;
          padding: 7px;
          vertical-align: middle;
        }

        .payment-label {
          width: 30%;
          font-weight: bold;
        }

        .signature-table {
          width: 100%;
          border-collapse: collapse;
          margin-top: 0;
        }

        .signature-table td {
          border: 1px solid #000;
          height: 38mm;
          text-align: center;
          vertical-align: top;
          padding: 7px;
          font-size: 11px;
          font-weight: bold;
        }

        .signature-space {
          height: 27mm;
        }

        .print-button {
          text-align: center;
          margin: 15px 0;
        }

        @media print {
          html,
          body {
            background: white !important;
          }

          .print-page {
            margin: 0;
            width: 210mm;
            height: 297mm;
            min-height: 297mm;
            padding: 10mm;
          }

          .no-print {
            display: none !important;
          }

          .watermark {
            display: block !important;
          }
        }

        @media screen {
          .watermark {
            display: none;
          }
        }
      `}</style>

      <div className="print-page">
        {/* WATERMARK */}

        {watermarkLoaded && (
          <img src="/watermark.png" alt="" className="watermark" />
        )}

        <div className="print-content">
          {/* =================================================
              HEADER
          ================================================= */}

          <div className="company-name">
            CÔNG TY TNHH THƯƠNG MẠI VÀ DỊCH VỤ MINH QUÂN
          </div>

          <div className="document-title">
            PHIẾU ĐỀ NGHỊ & XÁC NHẬN THANH TOÁN
          </div>

          <div className="top-info">
            <div>
              <b>Số phiếu:</b> {data.maPhieu || ""}
            </div>

            <div className="top-info-right">
              <b>Ngày đề nghị:</b> {formatDate(data.ngayDeNghi)}
            </div>
          </div>

          {/* =================================================
              I. THÔNG TIN ĐỀ NGHỊ THANH TOÁN
          ================================================= */}

          <div className="section-title">I. THÔNG TIN ĐỀ NGHỊ THANH TOÁN</div>

          <table className="info-table">
            <tbody>
              {/* NGƯỜI ĐỀ NGHỊ + MST */}

              <tr>
                <td className="label" style={{ width: "18%" }}>
                  Người đề nghị:
                </td>

                <td className="value" style={{ width: "42%" }}>
                  {data.nguoiDeNghi || ""}
                </td>

                <td className="label" style={{ width: "18%" }}>
                  MÃ SỐ THUẾ:
                </td>

                <td className="value" style={{ width: "22%" }}>
                  {data.maSoThue || ""}
                </td>
              </tr>

              {/* NCC + STK */}

              <tr>
                <td className="label">Nhà cung cấp:</td>

                <td className="value">{data.nhaCungCap || ""}</td>

                <td className="label">STK ngân hàng:</td>

                <td className="value">{data.stkNganHang || ""}</td>
              </tr>

              {/* NỘI DUNG CK + HÓA ĐƠN */}

              <tr>
                <td className="label">Nội dung CK:</td>

                <td className="value">{data.noiDungCK || ""}</td>

                <td className="label">Hóa đơn số:</td>

                <td className="value">{data.hoaDonSo || ""}</td>
              </tr>

              {/* NHÓM CHI PHÍ + GHI CHÚ */}

              <tr>
                <td className="label">Nhóm chi phí:</td>

                <td className="value">{data.nhomChiPhi || ""}</td>

                <td className="label">GHI CHÚ</td>

                <td className="value">{data.ghiChu || ""}</td>
              </tr>

              {/* TIỀN */}

              <tr>
                <td className="label">Số tiền đề nghị:</td>

                <td
                  className="value"
                  style={{
                    padding: 0,
                    background: `
      linear-gradient(
        to right,
        transparent 0%,
        transparent 60%,
        #000000ff 60%,
        #000 calc(60% + 0.5px),
        transparent calc(60% + 0.5px),
        transparent 100%
      )
    `,
                  }}
                >
                  <div
                    style={{
                      display: "grid",
                      gridTemplateColumns: "60% 40%",
                    }}
                  >
                    <div style={{ padding: "6px 8px" }}>
                      {formatMoney(data.soTienTruocThue)} (Trước thuế)
                    </div>

                    <div style={{ padding: "6px 8px" }}>
                      {formatMoney(data.thue)} (Thuế)
                    </div>
                  </div>
                </td>

                <td className="label" style={{ textAlign: "center" }}>
                  TỔNG TIỀN
                </td>

                <td
                  className="value"
                  style={{
                    textAlign: "left",
                    fontSize: "12px",
                  }}
                >
                  {formatMoney(data.tongTien)} (Sau thuế)
                </td>
              </tr>
            </tbody>
          </table>

          {/* =================================================
              II. HỒ SƠ
          ================================================= */}

          <div className="section-title" style={{ marginTop: "5px" }}>
            II. HỒ SƠ / CHỨNG TỪ KÈM THEO
          </div>

          <div className="documents">
            <div>
              ☐ Hóa đơn &nbsp;&nbsp;&nbsp;&nbsp; ☐ Hợp đồng / Đơn hàng
              &nbsp;&nbsp;&nbsp;&nbsp; ☐ Bảng kê chi tiết
              &nbsp;&nbsp;&nbsp;&nbsp; ☐ Biên bản giao nhận / nghiệm thu
            </div>

            <div>
              ☐ Báo giá &nbsp;&nbsp;&nbsp;&nbsp; ☐ Đề nghị của bộ phận / nhân
              viên &nbsp;&nbsp;&nbsp;&nbsp; ☐ Chứng từ khác:
              ........................................................
            </div>

            <div className="document-note">
              ☐ Đủ hồ sơ &nbsp;&nbsp;&nbsp;&nbsp; ☐ Thiếu hồ sơ, cần bổ sung:
              ............................................
            </div>

            <div style={{ marginTop: "6px" }}>
              <b>Ghi chú:</b>
              ..............................................................................................................
            </div>
          </div>

          {/* =================================================
              III. KIỂM TRA & PHÊ DUYỆT
          ================================================= */}

          <div className="section-title" style={{ marginTop: "5px" }}>
            III. KIỂM TRA & PHÊ DUYỆT
          </div>

          <table className="approval-table">
            <tbody>
              <tr>
                <td className="approval-header">NGƯỜI ĐỀ NGHỊ</td>

                <td className="approval-header">KẾ TOÁN KIỂM TRA</td>

                <td className="approval-header">GIÁM ĐỐC</td>

                <td className="approval-header">Ý KIẾN, GHI CHÚ KHÁC</td>
              </tr>

              <tr>
                <td className="approval-subheader">(Ký, ghi rõ họ tên)</td>

                <td className="approval-subheader">(Ký, ghi rõ họ tên)</td>

                <td className="approval-subheader">(Ký, ghi rõ họ tên)</td>

                <td className="approval-subheader">&nbsp;</td>
              </tr>

              <tr>
                <td className="approval-body">
                  <div className="signature-space"></div>
                </td>

                <td
                  style={{
                    padding: 0,
                    verticalAlign: "top",
                  }}
                >
                  <div
                    style={{
                      height: "6mm",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      borderBottom: "1px solid #000",
                      fontStyle: "italic",
                      fontSize: "10px",
                    }}
                  >
                    ☐ Đã kiểm tra hồ sơ
                  </div>

                  <div
                    style={{
                      height: "27mm",
                    }}
                  ></div>
                </td>

                <td
                  style={{
                    padding: 0,
                    verticalAlign: "top",
                  }}
                >
                  <div
                    style={{
                      height: "6mm",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      borderBottom: "1px solid #000",
                      fontStyle: "italic",
                      fontSize: "10px",
                    }}
                  >
                    ☐ DUYỆT ☐ KHÔNG DUYỆT
                  </div>

                  <div
                    style={{
                      height: "27mm",
                    }}
                  ></div>
                </td>

                <td className="approval-body">&nbsp;</td>
              </tr>
            </tbody>
          </table>

          {/* =================================================
              IV. XÁC NHẬN THANH TOÁN
          ================================================= */}

          <div className="section-title" style={{ marginTop: "5px" }}>
            IV. XÁC NHẬN THỰC HIỆN THANH TOÁN
          </div>

          <table className="payment-table">
            <tbody>
              <tr>
                <td className="payment-label">Ngày thanh toán</td>

                <td>&nbsp;</td>
              </tr>

              <tr>
                <td className="payment-label">Hình thức thanh toán</td>

                <td>☐ Chuyển khoản &nbsp;&nbsp;&nbsp;&nbsp; ☐ Tiền mặt</td>
              </tr>

              <tr>
                <td className="payment-label">Tài khoản / nguồn tiền chi</td>

                <td>
                  ☐ VIETCOMBANK CÔNG TY &nbsp;&nbsp;&nbsp;&nbsp; ☐ TECHCOMBANK
                  CÔNG TY
                  <br />☐ TECHCOMBANK CÁ NHÂN &nbsp;&nbsp;&nbsp;&nbsp; ☐ KHÁC:
                  ................................
                </td>
              </tr>
            </tbody>
          </table>

          {/* =================================================
              NGƯỜI THỰC HIỆN
          ================================================= */}

          <table className="signature-table">
            <tbody>
              <tr>
                <td>
                  NGƯỜI THỰC HIỆN THANH TOÁN
                  <br />
                  (Ký, ghi rõ họ tên)
                  <div className="signature-space"></div>
                </td>
              </tr>
            </tbody>
          </table>

          {/* =================================================
              BUTTON IN
          ================================================= */}

          <div className="print-button no-print">
            <button
              onClick={() => window.print()}
              className="
                px-5
                py-2
                bg-green-600
                text-white
                rounded
                hover:bg-green-700
              "
            >
              In phiếu
            </button>
          </div>
        </div>
      </div>
    </>
  );
}
