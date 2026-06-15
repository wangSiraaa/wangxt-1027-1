import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import Layout from './components/Layout';
import Home from './pages/Home';
import Login from './pages/Login';
import ResidentSelect from './pages/ResidentSelect';
import TeamApproval from './pages/TeamApproval';
import AdminStats from './pages/AdminStats';
import RenewalReminder from './pages/RenewalReminder';
import ServiceLedger from './pages/ServiceLedger';
import TeamTransfer from './pages/TeamTransfer';
import RuleExplain from './pages/RuleExplain';
import NotFound from './components/NotFound';

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route path="/" element={<Layout />}>
          <Route index element={<Home />} />
          <Route path="resident-select" element={<ResidentSelect />} />
          <Route path="team-approval" element={<TeamApproval />} />
          <Route path="admin-stats" element={<AdminStats />} />
          <Route path="renewal-reminder" element={<RenewalReminder />} />
          <Route path="service-ledger" element={<ServiceLedger />} />
          <Route path="team-transfer" element={<TeamTransfer />} />
          <Route path="rule-explain" element={<RuleExplain />} />
          <Route path="*" element={<NotFound />} />
        </Route>
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
