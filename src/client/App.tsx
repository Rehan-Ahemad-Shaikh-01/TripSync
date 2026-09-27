import React from 'react';
import { TripProvider, useTrip } from './context/TripContext.js';
import { Header } from './components/Header.js';
import { TripDashboard } from './screens/TripDashboard.js';
import { DigitalTwinScreen } from './screens/DigitalTwinScreen.js';
import { CostItemEditor } from './screens/CostItemEditor.js';
import { PersonalView } from './screens/PersonalView.js';
import { SettleUpScreen } from './screens/SettleUpScreen.js';
import { AIParserScreen } from './screens/AIParserScreen.js';
import { AuditTrailModal } from './components/AuditTrailModal.js';
import { RecordPaymentModal } from './components/RecordPaymentModal.js';
import { MemberManagementModal } from './components/MemberManagementModal.js';

const MainLayout: React.FC = () => {
  const { activeScreen, loading, error } = useTrip();

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
        <div className="text-center space-y-3">
          <div className="w-10 h-10 border-3 border-indigo-600 border-t-transparent rounded-full animate-spin mx-auto" />
          <p className="text-xs font-bold text-slate-500">Deriving ledger state &amp; calculating shares...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
        <div className="card p-8 max-w-md text-center bg-white border border-slate-200">
          <h2 className="text-base font-bold text-rose-600 mb-2">Connection Error</h2>
          <p className="text-xs text-slate-600 mb-4">{error}</p>
          <button
            onClick={() => window.location.reload()}
            className="btn btn-primary btn-sm"
          >
            Retry Connection
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col selection:bg-indigo-500 selection:text-white">
      <Header />

      <main className="flex-1">
        {activeScreen === 'dashboard' && <TripDashboard key="dashboard" />}
        {activeScreen === 'digital_twin' && <DigitalTwinScreen key="digital_twin" />}
        {activeScreen === 'item_editor' && <CostItemEditor key="item_editor" />}
        {activeScreen === 'personal' && <PersonalView key="personal" />}
        {activeScreen === 'settle' && <SettleUpScreen key="settle" />}
        {activeScreen === 'ai_parser' && <AIParserScreen key="ai_parser" />}
      </main>

      {/* Global Modals */}
      <AuditTrailModal />
      <RecordPaymentModal />
      <MemberManagementModal />
    </div>
  );
};

export const App: React.FC = () => {
  return (
    <TripProvider>
      <MainLayout />
    </TripProvider>
  );
};

export default App;
;
