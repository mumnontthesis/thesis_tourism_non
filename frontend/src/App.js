import { BrowserRouter, Routes, Route } from "react-router-dom";
import { LoginForm } from "./components/login-form";
import { RegisterForm } from "./components/register-form";
import RegisterFormEntrepreneur from "./components/register-form-entre";
import Homepage from "./Homepage";
import AdminDashboard from "./Adminpage/AdminDashboard";
import { BusinessDashboard } from "./components/business-dashboard";
import { GogoPage } from "./components/go-go";
import { PlaceDetailPage } from "./components/place-detail-page";
import { TripDetailPage } from "./components/trip-detail-page";
import CreateTrip from "./components/create-trip";
import { AllTripPage } from "./components/alltrip";
import { AllPlacesPage } from "./components/all-places";
import { AppAlertProvider } from "./lib/app-alert";

function App() {
  return (
    <AppAlertProvider>
      <BrowserRouter>
      <Routes>
        <Route path="/" element={<Homepage />} />
        <Route path="/login" element={<LoginForm />} />
        <Route path="/register" element={<RegisterForm />} />
        <Route path="/register-entrepreneur" element={<RegisterFormEntrepreneur />} />
        <Route path="/admin" element={<AdminDashboard />} />
        <Route path="/business-dashboard" element={<BusinessDashboard />} />
        <Route path="/navigation" element={<GogoPage />} />
        <Route path="/create-trip" element={<CreateTrip />} />
        <Route path="/all-trip" element={<AllTripPage />} />
        <Route path="/all-places" element={<AllPlacesPage />} />
        <Route path="/place/:placeId" element={<PlaceDetailPage />} />
        <Route path="/trip/:recommendId" element={<TripDetailPage />} />
      </Routes>
    </BrowserRouter>
    </AppAlertProvider>
  );
}

export default App;