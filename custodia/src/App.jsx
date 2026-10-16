import { BrowserRouter, Routes, Route } from "react-router-dom";
import { Toaster } from "@/components/ui/sonner";
import { CustodiaProvider } from "@/lib/custodia";
import Landing from "@/pages/Landing";
import Dashboard from "@/pages/Dashboard";
import Court from "@/pages/Court";
import Intermediary from "@/pages/Intermediary";
import Victim from "@/pages/Victim";

export default function App() {
  return (
    <BrowserRouter>
      <CustodiaProvider>
        <Routes>
          <Route path="/" element={<Landing />} />
          <Route path="/dashboard" element={<Dashboard />} />
          <Route path="/court" element={<Court />} />
          <Route path="/intermediary" element={<Intermediary />} />
          <Route path="/victim" element={<Victim />} />
        </Routes>
        <Toaster position="bottom-right" richColors />
      </CustodiaProvider>
    </BrowserRouter>
  );
}
