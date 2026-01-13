import { Route, Routes, Navigate } from "react-router-dom";
import { Header } from "./components/Header";
import { Footer } from "./components/Footer";
import { BrandProvider } from "./runtime/brand";
import { WalletProvider } from "./runtime/wallet";
import { AccountProvider } from "./runtime/account";
import { LandingPage } from "./pages/LandingPage";
import { ChainDashboard } from "./pages/ChainDashboard";
import { DepositPage } from "./pages/DepositPage";
import { WithdrawPage } from "./pages/WithdrawPage";
import { FinalizePage } from "./pages/FinalizePage";
import { ActivityPage } from "./pages/ActivityPage";
import { SINGLE_CHAIN_KEY } from "./utils/env";

const SingleChainRedirect = ({ to }: { to: string }) => {
  if (SINGLE_CHAIN_KEY) {
    return <Navigate to={`/chain/${SINGLE_CHAIN_KEY}${to}`} replace />;
  }
  return <Navigate to="/" replace />;
};

export default function App() {
  return (
    <BrandProvider>
      <WalletProvider>
        <AccountProvider>
          <div className="app">
            <Header />
            <Routes>
              <Route path="/" element={<LandingPage />} />
              <Route path="/chain/:chainKey" element={<ChainDashboard />} />
              <Route path="/chain/:chainKey/deposit" element={<DepositPage />} />
              <Route path="/chain/:chainKey/withdraw" element={<WithdrawPage />} />
              <Route path="/chain/:chainKey/finalize" element={<FinalizePage />} />
              <Route path="/chain/:chainKey/activity" element={<ActivityPage />} />
              <Route path="/activity" element={<SingleChainRedirect to="/activity" />} />
              <Route path="/finalize" element={<SingleChainRedirect to="/finalize" />} />
            </Routes>
            <Footer />
          </div>
        </AccountProvider>
      </WalletProvider>
    </BrandProvider>
  );
}
