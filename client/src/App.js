import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { useState, useEffect } from "react";
import "./App.css";
import Login from "./pages/Login";
import AdminPage from "./pages/AdminPage";
import DieuVanPage from "./pages/DieuVanPage";
import KeToanPage from "./pages/KeToanPage";
import PrivateRoute from "./components/PrivateRoute";
import TongHop from "./pages/DieuVanActions/TongHop";
import DriverPage from "./pages/DriverPage";
import ManageDriver from "./pages/KeToanActions/ManageDriver";
import ManageCustomer from "./pages/KeToanActions/ManageCustomer";
import ManageVehicle from "./pages/KeToanActions/ManageVehicle";
import ManageTrip from "./pages/KeToanActions/ManageTrip";
import ManageAllTrip from "./pages/KeToanActions/ManageAllTrip";
import ManageTripAdmin from "./pages/AdminActions/ManageTripAdmin";
import FinalPage from "./pages/FinalPage";
import CustomerDebtPage from "./pages/KeToanActions/CustomerDebtPage";
import CustomerDebt26Page from "./pages/KeToanActions/CustomerDebt26Page";
import VoucherListPage from "./pages/KeToanActions/VoucherListPage";
import ManageDriverDV from "./pages/DieuVanActions/ManageDiverDV";
import ManageCustomerDV from "./pages/DieuVanActions/MaganeCustomerDV";
import ManageVehicleDV from "./pages/DieuVanActions/ManageVehicleDV";
import VoucherPrintPage from "./components/VoucherActions/VoucherPrintPage";
import ScheduleTrashPage from "./pages/DieuVanActions/ScheduleTrashPage";
import CostManagementPage from "./pages/CostManagementPage";
import DepreciationPage from "./pages/CostManagementTables/DepreciationPage";
import EpassMonthPage from "./pages/CostManagementTables/EpassMonthPage";
import EpassTurnPage from "./pages/CostManagementTables/EpassTurnPage";
import EtcCostPage from "./pages/CostManagementTables/EtcCostPage";
import FuelCostPage from "./pages/CostManagementTables/FuelCostPage";
import RepairCostPage from "./pages/CostManagementTables/RepairCostPage";
import OtherCostPage from "./pages/CostManagementTables/OtherCostPage";
import SalaryCostPage from "./pages/CostManagementTables/SalaryCostPage";
import VehicleLegalCostPage from "./pages/CostManagementTables/VehicleLegalCostPage";
import TripPaymentPage from "./pages/CostManagementTables/TripPaymentPage";
import NCCPage from "./pages/CostManagementTables/NCCPage";
import DeNghiThanhToanPage from "./pages/CostManagementTables/DeNghiThanhToanPage";

import DeNghiThanhToanPrintPage from "./components/CostModal/DeNghiThanhToanPrintPage";

import ManageContract from "./pages/KeToanActions/ManageContract";
import ManageTCBperson from "./pages/KeToanActions/ManageTCBperson";
import ManageOil from "./pages/KeToanActions/ManageOil";
import ManageOnlineSchedule from "./pages/KeToanActions/ManageOnlineSchedule";

import ScheduleErrorPage from "./pages/KeToanActions/ScheduleErrorPage";
import VehicleProfitPage from "./pages/KeToanActions/VehicleProfitPage";
import OverdueCustomerDebtPage from "./pages/KeToanActions/OverdueCustomerDebtPage";
import EmployeeLeaveAdvancePage from "./pages/KeToanActions/EmployeeLeaveAdvancePage";
import TripActualCostPage from "./pages/KeToanActions/TripActualCostPage";

import AddressPage from "./pages/AddressPage";
import Customer2Page from "./pages/Customer2Page";

import OilCreatePage from "./pages/OilPage";

function App() {
  const [user, setUser] = useState(null);

  // 🧠 Lấy user từ localStorage khi load trang
  useEffect(() => {
    const savedUser = localStorage.getItem("user");
    if (savedUser) setUser(JSON.parse(savedUser));
  }, []);

  // 🧩 Hàm logout (xoá user và quay về login)
  const handleLogout = () => {
    localStorage.removeItem("user");
    setUser(null);
    window.location.href = "/login";
  };

  return (
    <BrowserRouter>
      <Routes>
        {/* Trang đăng nhập */}
        <Route path="/login" element={<Login setUser={setUser} />} />

        <Route path="/driver" element={<DriverPage />} />
        <Route path="/final" element={<FinalPage />} />

        <Route path="/oil" element={<OilCreatePage />} />

        {/* Admin */}
        <Route
          path="/admin"
          element={
            <PrivateRoute roles={["admin"]}>
              <AdminPage user={user} onLogout={handleLogout} />
            </PrivateRoute>
          }
        />
        <Route
          path="/manage-trip-admin"
          element={
            <PrivateRoute roles={["admin"]}>
              <ManageTripAdmin user={user} onLogout={handleLogout} />
            </PrivateRoute>
          }
        />
        <Route
          path="/customer-debt"
          element={
            <PrivateRoute roles={["keToan"]}>
              <CustomerDebtPage user={user} onLogout={handleLogout} />
            </PrivateRoute>
          }
        />
        <Route
          path="/customer-debt-26"
          element={
            <PrivateRoute roles={["keToan"]}>
              <CustomerDebt26Page user={user} onLogout={handleLogout} />
            </PrivateRoute>
          }
        />
        <Route
          path="/voucher-list"
          element={
            <PrivateRoute roles={["keToan"]}>
              <VoucherListPage user={user} onLogout={handleLogout} />
            </PrivateRoute>
          }
        />
        <Route
          path="/cost-management"
          element={
            <PrivateRoute roles={["keToan"]}>
              <CostManagementPage user={user} onLogout={handleLogout} />
            </PrivateRoute>
          }
        >
          {/* ROUTE CON */}
          <Route index element={<FuelCostPage />} /> {/* mặc định */}
          <Route path="fuel" element={<FuelCostPage />} />
          <Route path="repair" element={<RepairCostPage />} />
          <Route path="other" element={<OtherCostPage />} />
          <Route path="salary" element={<SalaryCostPage />} />
          <Route path="depreciation" element={<DepreciationPage />} />
          <Route path="epass-month" element={<EpassMonthPage />} />
          <Route path="epass-turn" element={<EpassTurnPage />} />
          <Route path="etc" element={<EtcCostPage />} />
          <Route path="vehicle-legal" element={<VehicleLegalCostPage />} />
          <Route path="trip-payment" element={<TripPaymentPage />} />
          <Route path="ncc" element={<NCCPage />} />
          <Route
            path="de-nghi-thanh-toan"
            user={user}
            element={<DeNghiThanhToanPage />}
          />
        </Route>

        <Route
          path="/ke-toan/de-nghi-thanh-toan/:id/print"
          element={
            <PrivateRoute roles={["keToan"]}>
              <DeNghiThanhToanPrintPage user={user} />
            </PrivateRoute>
          }
        />

        <Route
          path="/contract"
          element={
            <PrivateRoute roles={["keToan"]}>
              <ManageContract user={user} onLogout={handleLogout} />
            </PrivateRoute>
          }
        />

        <Route
          path="/tcb-person"
          element={
            <PrivateRoute roles={["keToan"]}>
              <ManageTCBperson user={user} onLogout={handleLogout} />
            </PrivateRoute>
          }
        />

        <Route
          path="/onl-schedules"
          element={
            <PrivateRoute roles={["keToan"]}>
              <ManageOnlineSchedule user={user} onLogout={handleLogout} />
            </PrivateRoute>
          }
        />

        <Route
          path="/address"
          element={
            <PrivateRoute roles={["keToan", "admin"]}>
              <AddressPage user={user} onLogout={handleLogout} />
            </PrivateRoute>
          }
        />

        <Route
          path="/customer2"
          element={
            <PrivateRoute roles={["keToan", "admin"]}>
              <Customer2Page user={user} onLogout={handleLogout} />
            </PrivateRoute>
          }
        />

        <Route
          path="/manage-oil"
          element={
            <PrivateRoute roles={["keToan", "admin"]}>
              <ManageOil user={user} onLogout={handleLogout} />
            </PrivateRoute>
          }
        />

        {/* Điều vận */}
        <Route
          path="/dieu-van"
          element={
            <PrivateRoute roles={["dieuVan"]}>
              <DieuVanPage user={user} onLogout={handleLogout} />
            </PrivateRoute>
          }
        />
        <Route
          path="/tonghop"
          element={
            <PrivateRoute roles={["dieuVan"]}>
              <TongHop user={user} onLogout={handleLogout} />
            </PrivateRoute>
          }
        />
        <Route
          path="/manage-driver-dv"
          element={
            <PrivateRoute roles={["dieuVan"]}>
              <ManageDriverDV user={user} onLogout={handleLogout} />
            </PrivateRoute>
          }
        />
        <Route
          path="/manage-customer-dv"
          element={
            <PrivateRoute roles={["dieuVan"]}>
              <ManageCustomerDV user={user} onLogout={handleLogout} />
            </PrivateRoute>
          }
        />
        <Route
          path="/manage-vehicle-dv"
          element={
            <PrivateRoute roles={["dieuVan"]}>
              <ManageVehicleDV user={user} onLogout={handleLogout} />
            </PrivateRoute>
          }
        />
        <Route
          path="/schedule-trash"
          element={
            <PrivateRoute roles={["dieuVan"]}>
              <ScheduleTrashPage user={user} onLogout={handleLogout} />
            </PrivateRoute>
          }
        />

        {/* Kế toán */}
        <Route
          path="/ke-toan"
          element={
            <PrivateRoute roles={["keToan"]}>
              <KeToanPage user={user} onLogout={handleLogout} />
            </PrivateRoute>
          }
        />

        <Route
          path="/manage-driver"
          element={
            <PrivateRoute roles={["keToan"]}>
              <ManageDriver user={user} />
            </PrivateRoute>
          }
        />
        <Route
          path="/manage-customer"
          element={
            <PrivateRoute roles={["keToan"]}>
              <ManageCustomer user={user} />
            </PrivateRoute>
          }
        />
        <Route
          path="/manage-vehicle"
          element={
            <PrivateRoute roles={["keToan"]}>
              <ManageVehicle user={user} />
            </PrivateRoute>
          }
        />
        <Route
          path="/manage-trip"
          element={
            <PrivateRoute roles={["keToan"]}>
              <ManageTrip user={user} />
            </PrivateRoute>
          }
        />
        <Route
          path="/manage-all-trip"
          element={
            <PrivateRoute roles={["keToan"]}>
              <ManageAllTrip user={user} />
            </PrivateRoute>
          }
        />

        <Route
          path="/schedule-errors"
          element={
            <PrivateRoute roles={["keToan"]}>
              <ScheduleErrorPage user={user} />
            </PrivateRoute>
          }
        />

        <Route
          path="/vehicle-profit"
          element={
            <PrivateRoute roles={["keToan"]}>
              <VehicleProfitPage user={user} />
            </PrivateRoute>
          }
        />

        <Route
          path="/overdue-customer-debt"
          element={
            <PrivateRoute roles={["keToan"]}>
              <OverdueCustomerDebtPage user={user} />
            </PrivateRoute>
          }
        />

        <Route
          path="/employee-leave-advance"
          element={
            <PrivateRoute roles={["keToan"]}>
              <EmployeeLeaveAdvancePage user={user} />
            </PrivateRoute>
          }
        />

        <Route
          path="/trip-actual-cost"
          element={
            <PrivateRoute roles={["keToan"]}>
              <TripActualCostPage user={user} />
            </PrivateRoute>
          }
        />

        <Route
          path="/voucher/:id/print"
          element={
            <PrivateRoute roles={["keToan"]}>
              <VoucherPrintPage user={user} />
            </PrivateRoute>
          }
        />

        {/* Redirect mặc định */}
        <Route path="*" element={<Navigate to="/login" />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
