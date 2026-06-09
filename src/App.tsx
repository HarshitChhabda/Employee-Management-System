import './lib/fetchPolyfill';
import { HashRouter as Router, Routes, Route, useLocation } from 'react-router-dom';
import { MainLayout as Layout } from './core-ui/layout/MainLayout';
import Dashboard from './pages/Dashboard';
import Employees from './pages/Employees';
import Attendance from './pages/Attendance';
import AttendanceCalendarView from './pages/AttendanceCalendarView';
import AttendanceExcel from './pages/AttendanceExcel';
import AttendanceReport from './pages/AttendanceReport';
import PLManagement from './pages/PLManagement';
import Letters from './pages/Letters';
import Resigned from './pages/Resigned';
import EmployeeHistory from './pages/EmployeeHistory';
import MasterSettings from './pages/MasterSettings';
import UserManager from './pages/settings/UserManager';
import PayrollSummary from './pages/PayrollSummary';
import ProtectedRoute from './components/ProtectedRoute';

// Global Contexts
import { ThemeProvider } from './ThemeContext';
import { LanguageProvider } from './lib/LanguageContext';
import { ConnectivityProvider } from './lib/ConnectivityContext';
import ErrorBoundary from './components/ErrorBoundary';
import { ToastProvider } from './components/Toast';

function AnimatedRoutes() {
  const location = useLocation();

  return (
    <Routes location={location} key={location.pathname}>
      <Route path="/" element={<Dashboard />} />
      <Route path="/employees" element={<Employees />} />
      <Route path="/attendance" element={<Attendance />} />
      <Route path="/attendance-calendar" element={<AttendanceCalendarView />} />
      <Route path="/attendance-excel" element={<AttendanceExcel />} />
      <Route path="/attendance-report" element={<AttendanceReport />} />
      <Route path="/pl-management" element={<PLManagement />} />
      <Route path="/letters" element={<Letters />} />
      <Route path="/resigned" element={<Resigned />} />
      <Route path="/audit-log" element={<EmployeeHistory />} />
      <Route path="/settings" element={<MasterSettings />} />
      <Route path="/settings/users" element={<UserManager />} />
      <Route path="/payroll" element={<PayrollSummary />} />
    </Routes>
  );
}

function App() {
  return (
    <ThemeProvider>
      <LanguageProvider>
        <ConnectivityProvider>
          <ErrorBoundary>
            <ToastProvider>
              <Router>
                <ProtectedRoute>
                  <Layout>
                    <AnimatedRoutes />
                  </Layout>
                </ProtectedRoute>
              </Router>
            </ToastProvider>
          </ErrorBoundary>
        </ConnectivityProvider>
      </LanguageProvider>
    </ThemeProvider>
  );
}

export default App;