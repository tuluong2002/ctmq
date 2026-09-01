import React from "react";

export default function ExcelTemplatePage() {
  const templates = [
    {
      name: "Mẫu nhập chi phí nhiên liệu Vĩnh Khúc - Đổ ngoài",
      description: "File Excel mẫu để nhập dữ liệu chi phí nhiên liệu Vĩnh Khúc và Đổ ngoài.",
      file: "/excel-templates/nhien_lieu_Vinh_Khuc.xlsx",
    },
    {
      name: "Mẫu nhập chi phí nhiên liệu Ngọc Long",
      description: "File Excel mẫu để nhập dữ liệu chi phí nhiên liệu Ngọc Long.",
      file: "/excel-templates/nhien_lieu_Ngoc_Long.xlsx",
    },
    {
      name: "Mẫu nhập chi phí sửa xe",
      description: "File Excel mẫu để nhập dữ liệu chi phí sửa chữa xe.",
      file: "/excel-templates/sua_xe.xlsx",
    },
    {
      name: "Mẫu nhập chi phí khác",
      description: "File Excel mẫu để nhập các khoản chi phí khác.",
      file: "/excel-templates/chi_phi_khac.xlsx",
    },
    {
      name: "Mẫu nhập lương",
      description: "File Excel mẫu để nhập chi phí lương.",
      file: "/excel-templates/chi-phi-luong.xlsx",
    },
    {
      name: "Mẫu nhập Epass tháng",
      description: "File Excel mẫu để nhập chi phí Epass theo tháng.",
      file: "/excel-templates/epass-thang.xlsx",
    },
    {
      name: "Mẫu nhập Epass lượt",
      description: "File Excel mẫu để nhập chi phí Epass theo lượt.",
      file: "/excel-templates/epass-luot.xlsx",
    },
    {
      name: "Mẫu nhập ETC",
      description: "File Excel mẫu để nhập chi phí ETC.",
      file: "/excel-templates/etc.xlsx",
    },
    {
      name: "Mẫu nhập đăng kiểm - đăng ký - bảo hiểm",
      description:
        "File Excel mẫu để nhập chi phí đăng ký, đăng kiểm và bảo hiểm xe.",
      file: "/excel-templates/xe-phap-ly.xlsx",
    },
    {
      name: "Mẫu thanh toán lịch trình",
      description: "File Excel mẫu để nhập dữ liệu thanh toán lịch trình.",
      file: "/excel-templates/thanh-toan-lich-trinh.xlsx",
    },
  ];

  const handleDownload = (template) => {
    const link = document.createElement("a");
    link.href = template.file;
    link.download = template.file.split("/").pop();

    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="w-full">
      {/* HEADER */}
      <div className="mb-4">
        <h1 className="text-lg font-bold text-gray-700">FORM MẪU EXCEL</h1>

        <p className="text-gray-500 mt-1">
          Tải xuống các file Excel mẫu để sử dụng khi nhập dữ liệu.
        </p>
      </div>

      {/* DANH SÁCH FORM */}
      <div className="bg-white border rounded shadow-sm overflow-hidden">
        <table className="w-full text-xs">
          <thead>
            <tr className="bg-blue-600 text-white">
              <th className="border px-3 py-2 w-12 text-center">STT</th>

              <th className="border px-3 py-2 text-left">Tên form mẫu</th>

              <th className="border px-3 py-2 text-left">Mô tả</th>

              <th className="border px-3 py-2 w-32 text-center">Thao tác</th>
            </tr>
          </thead>

          <tbody>
            {templates.map((template, index) => (
              <tr key={template.file} className="hover:bg-gray-50">
                <td className="border px-3 py-3 text-center">{index + 1}</td>

                <td className="border px-3 py-3 font-medium">
                  {template.name}
                </td>

                <td className="border px-3 py-3 text-gray-500">
                  {template.description}
                </td>

                <td className="border px-3 py-3 text-center">
                  <button
                    onClick={() => handleDownload(template)}
                    className="
                      bg-green-600
                      hover:bg-green-700
                      text-white
                      px-3
                      py-2
                      rounded
                      text-xs
                    "
                  >
                    ↓ Tải xuống
                  </button>
                </td>
              </tr>
            ))}

            {templates.length === 0 && (
              <tr>
                <td
                  colSpan={4}
                  className="border px-3 py-8 text-center text-gray-400"
                >
                  Chưa có form mẫu Excel
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
