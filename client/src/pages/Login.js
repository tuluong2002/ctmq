import { useState, useEffect } from "react";
import API from "../api";
import axios from "axios";
import { useNavigate } from "react-router-dom";
import { FaEye, FaEyeSlash } from "react-icons/fa";

export default function Login({ setUser }) {
  const [step, setStep] = useState("question");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const navigate = useNavigate();

  const [rememberMe, setRememberMe] = useState(false);

  const [forgotStep, setForgotStep] = useState("login");
  // login | forgot | reset

  const [email, setEmail] = useState("");
  const [otp, setOtp] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");

  useEffect(() => {
    const remembered = localStorage.getItem("rememberMe");

    if (remembered === "true") {
      const savedUsername = localStorage.getItem("remember_username");
      const savedPassword = localStorage.getItem("remember_password");

      if (savedUsername && savedPassword) {
        setUsername(savedUsername);
        setPassword(savedPassword);
        setRememberMe(true);
      }
    }
  }, []);

  const handleLogin = async () => {
    if (loading) return;

    setLoading(true);
    try {
      const res = await axios.post(`${API}/auth/login`, {
        username,
        password,
      });

      // Lưu token
      localStorage.setItem("token", res.data.accessToken);
      localStorage.setItem("refreshToken", res.data.refreshToken);

      // Lưu user
      localStorage.setItem(
        "user",
        JSON.stringify({
          _id: res.data._id,
          username: res.data.username,
          fullname: res.data.fullname,
          email: res.data.email,
          role: res.data.role,
          phone: res.data.phone,
          avatar: res.data.avatar,
          permissions: res.data.permissions || [],
        }),
      );

      if (setUser) setUser(res.data);

      // ================================
      // ✅ GHI NHỚ ĐĂNG NHẬP
      // ================================
      if (rememberMe) {
        localStorage.setItem("rememberMe", "true");
        localStorage.setItem("remember_username", username);
        localStorage.setItem("remember_password", password);
      } else {
        localStorage.removeItem("rememberMe");
        localStorage.removeItem("remember_username");
        localStorage.removeItem("remember_password");
      }

      // Điều hướng
      if (res.data.role === "admin") {
        navigate("/admin");
      } else if (res.data.role === "dieuVan") {
        navigate("/dieu-van");
      } else if (res.data.role === "keToan") {
        navigate("/ke-toan");
      } else {
        alert("Không xác định được vai trò người dùng!");
      }
    } catch (err) {
      console.error("❌ Login error:", err.response?.data || err.message);
      alert(err.response?.data?.message || "Đăng nhập thất bại");
    } finally {
      setLoading(false);
    }
  };

  const handleSendOTP = async () => {
    if (loading) return;

    setLoading(true);
    setErrorMsg("");

    try {
      const res = await axios.post(`${API}/auth/forgot-password`, { email });

      alert("Đã gửi OTP qua email");
      setForgotStep("reset");
    } catch (err) {
      console.error("❌ SEND OTP ERROR:", err.response?.data);

      setErrorMsg(err.response?.data?.message || "Gửi OTP thất bại");
    } finally {
      setLoading(false);
    }
  };

  const handleResetPassword = async () => {
    if (loading) return;

    setLoading(true);
    setErrorMsg("");

    try {
      await axios.post(`${API}/auth/reset-password`, {
        email,
        otp,
        newPassword,
      });

      alert("Đổi mật khẩu thành công");
      setForgotStep("login");
    } catch (err) {
      console.error("❌ RESET PASSWORD ERROR:", err.response?.data);

      setErrorMsg(err.response?.data?.message || "Reset mật khẩu thất bại");
    } finally {
      setLoading(false);
    }
  };

  // Giao diện bước hỏi
  if (step === "question") {
    return (
      <div
        className="min-h-screen flex flex-col items-center justify-center bg-cover bg-no-repeat"
        style={{
          backgroundImage: "url('/bg-login.png')",
          backgroundPosition: "center -60px",
        }}
      >
        <div className="bg-white shadow-xl rounded-2xl px-8 py-10 w-full max-w-sm text-center overflow-hidden">
          <div className="flex flex-col gap-4">
            <button
              onClick={() => navigate("/driver")}
              className="bg-green-600 hover:bg-green-700 text-white font-medium px-6 py-3 rounded-lg transition"
            >
              Nhập lịch trình lái xe
            </button>

            <button
              onClick={() => setStep("login")}
              className="bg-blue-600 hover:bg-blue-700 text-white font-medium px-6 py-3 rounded-lg transition"
            >
              Quản lý dữ liệu
            </button>

            <button
              onClick={() => {
                window.location.href = "/oil";
              }}
              className="bg-orange-500 hover:bg-orange-600 text-white font-medium px-6 py-3 rounded-lg shadow-lg transition"
            >
              Nhập số liệu dầu ( Ngọc Long )
            </button>
          </div>
        </div>

        {/* CSS animation */}
        <style>
          {`
          @keyframes catRun {
            0% {
              left: -40px;
            }
            100% {
              left: 100%;
            }
          }
        `}
        </style>
      </div>
    );
  }

  // Giao diện đăng nhập
  return (
    <div
      className="min-h-screen flex flex-col items-center justify-center bg-cover bg-no-repeat"
      style={{
        backgroundImage: "url('/bg-login.png')",
        backgroundPosition: "center -60px",
      }}
    >
      <div className="bg-white shadow-xl rounded-2xl px-8 py-10 w-full max-w-sm">
        <h2 className="text-2xl font-semibold text-center mb-8 text-gray-700">
          🔐 Đăng nhập hệ thống
        </h2>

        {forgotStep === "login" && (
          <form
            onSubmit={(e) => {
              e.preventDefault();
              handleLogin();
            }}
            className="flex flex-col gap-4"
          >
            <input
              className="border border-gray-300 rounded-lg px-4 py-2 focus:ring-2 focus:ring-blue-400 focus:outline-none"
              placeholder="Tài khoản"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
            />

            <div className="relative">
              <input
                type={showPassword ? "text" : "password"}
                className="border border-gray-300 rounded-lg px-4 py-2 pr-11 w-full focus:ring-2 focus:ring-blue-400 focus:outline-none"
                placeholder="Mật khẩu"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />

              <button
                type="button"
                onClick={() => setShowPassword((prev) => !prev)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700"
                aria-label={showPassword ? "Ẩn mật khẩu" : "Hiện mật khẩu"}
              >
                {showPassword ? <FaEyeSlash size={20} /> : <FaEye size={20} />}
              </button>
            </div>

            <div className="flex items-center gap-2 text-sm text-gray-600">
              <input
                type="checkbox"
                id="rememberMe"
                checked={rememberMe}
                onChange={(e) => setRememberMe(e.target.checked)}
                className="w-4 h-4"
              />
              <label htmlFor="rememberMe" className="cursor-pointer">
                Ghi nhớ đăng nhập
              </label>

              <p
                onClick={() => setForgotStep("forgot")}
                className="text-sm text-blue-600 text-center ml-auto cursor-pointer hover:underline"
              >
                Quên mật khẩu?
              </p>
            </div>

            <button
              type="submit"
              disabled={loading}
              className={`mt-2 text-white font-medium py-2 rounded-lg transition
    ${
      loading
        ? "bg-gray-400 cursor-not-allowed"
        : "bg-blue-600 hover:bg-blue-700"
    }
  `}
            >
              {loading ? "Đang đăng nhập..." : "Đăng nhập"}
            </button>
          </form>
        )}

        {forgotStep === "forgot" && (
          <div className="flex flex-col gap-4">
            <h3 className="text-lg font-semibold text-center">
              🔑 Quên mật khẩu
            </h3>

            <input
              className="border rounded-lg px-4 py-2"
              placeholder="Email nhận OTP"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />

            <button
              disabled={loading}
              onClick={handleSendOTP}
              className={`py-2 rounded-lg text-white
    ${
      loading
        ? "bg-gray-400 cursor-not-allowed"
        : "bg-blue-600 hover:bg-blue-700"
    }
  `}
            >
              {loading ? "Đang gửi..." : "Gửi OTP"}
            </button>

            <p
              onClick={() => setForgotStep("login")}
              className="text-sm text-center text-gray-500 cursor-pointer"
            >
              ← Quay lại đăng nhập
            </p>
          </div>
        )}

        {forgotStep === "reset" && (
          <div className="flex flex-col gap-4">
            <h3 className="text-lg font-semibold text-center">
              🔐 Đặt lại mật khẩu
            </h3>

            <input
              className="border rounded-lg px-4 py-2"
              placeholder="OTP"
              value={otp}
              onChange={(e) => setOtp(e.target.value)}
            />

            <input
              type="password"
              className="border rounded-lg px-4 py-2"
              placeholder="Mật khẩu mới"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
            />

            <button
              disabled={loading}
              onClick={handleResetPassword}
              className={`py-2 rounded-lg text-white
    ${
      loading
        ? "bg-gray-400 cursor-not-allowed"
        : "bg-green-600 hover:bg-green-700"
    }
  `}
            >
              {loading ? "Đang xử lý..." : "Xác nhận"}
            </button>
          </div>
        )}

        {errorMsg && (
          <div className="bg-red-100 text-red-700 text-sm px-4 py-2 rounded-lg">
            ❌ {errorMsg}
          </div>
        )}

        <p className="text-center text-sm text-gray-500 mt-6">
          © 2025 Công ty Minh Quân. All rights reserved.
        </p>
      </div>

      {/* NÚT NGOÀI BOX */}
      <button
        onClick={() => {
          setStep("question");
          setForgotStep("login");
        }}
        className="mt-6 bg-green-500 hover:bg-green-600 text-white font-medium px-8 py-3 rounded-lg shadow-lg transition text-sm"
      >
        ← Quay lại trang trước
      </button>
    </div>
  );
}
