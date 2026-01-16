import React, { useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db, type Bet } from './db';
import { AddBetModal } from './components/AddBetModal';
import { StatsView } from './components/StatsView';
import { HistoryView } from './components/HistoryView';
import { SettingsView } from './components/SettingsView';
import { BankrollChart } from './components/BankrollChart'; // Importujemy Wykres!

type ViewType = 'dashboard' | 'history' | 'stats' | 'settings';

function App() {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [betToEdit, setBetToEdit] = useState<Bet | null>(null);
  const [currentView, setCurrentView] = useState<ViewType>('dashboard');

  const bets = useLiveQuery(() => db.bets.orderBy('date').reverse().toArray());
  const safeBets = bets || [];

  // --- LOGIKA DASHBOARDU ---
  const now = new Date();
  const currentMonth = now.getMonth();
  const currentYear = now.getFullYear();
  const monthName = now.toLocaleString('pl-PL', { month: 'long' });
  const displayMonth = monthName.charAt(0).toUpperCase() + monthName.slice(1);

  const monthlyBets = safeBets.filter((bet) => {
    const betDate = new Date(bet.date);
    return betDate.getMonth() === currentMonth && betDate.getFullYear() === currentYear;
  });

  const monthlyCount = monthlyBets.length;
  let monthlyProfit = 0;
  let monthlyStakedSettled = 0;

  monthlyBets.forEach((bet) => {
    if (bet.status === 'pending' || bet.status === 'void') return;
    if (bet.status === 'won') {
      monthlyProfit += (bet.potentialReturn - bet.stake);
      monthlyStakedSettled += bet.stake;
    } else if (bet.status === 'lost') {
      monthlyProfit -= bet.stake;
      monthlyStakedSettled += bet.stake;
    }
  });

  const yieldValue = monthlyStakedSettled > 0 ? ((monthlyProfit / monthlyStakedSettled) * 100).toFixed(2) : '0.00';
  const profitColor = monthlyProfit > 0 ? 'text-neon-green' : monthlyProfit < 0 ? 'text-neon-red' : 'text-white';
  const yieldColor = parseFloat(yieldValue) > 0 ? 'text-neon-green' : parseFloat(yieldValue) < 0 ? 'text-neon-red' : 'text-white';

  // --- AKCJE ---
  const openNewBetModal = () => { setBetToEdit(null); setIsModalOpen(true); };
  const handleEdit = (bet: Bet) => { setBetToEdit(bet); setIsModalOpen(true); };
  
  const handleDelete = async (id: number) => {
    if (window.confirm('Czy na pewno chcesz usunąć ten zakład?')) {
      try { await db.bets.delete(id); } catch (error) { console.error('Błąd usuwania:', error); }
    }
  };

  const handleQuickSettle = async (id: number, status: 'won' | 'lost') => {
    try { await db.bets.update(id, { status }); } catch (error) { console.error("Błąd:", error); }
  };

  // --- RENDEROWANIE ---
  const renderContent = () => {
    if (currentView === 'settings') return <SettingsView />;
    if (currentView === 'stats') return <StatsView />;
    if (currentView === 'history') return <HistoryView onEdit={handleEdit} />;

    // WIDOK: DASHBOARD
    const recentBets = safeBets.slice(0, 5);

    return (
      <>
        <header className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-3xl font-bold">Pulpit Główny</h1>
            <p className="text-gray-400 text-sm mt-1">
              Wyniki za: {displayMonth} {currentYear}
            </p>
          </div>
          <button
            onClick={openNewBetModal}
            className="bg-neon-blue hover:bg-blue-600 text-white px-6 py-2 rounded-lg font-medium transition-all shadow-[0_0_15px_rgba(59,130,246,0.5)] active:scale-95"
          >
            + Dodaj Zakład
          </button>
        </header>

        {/* 1. KAFELKI KPI */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <StatCard title={`Liczba Zakładów (${displayMonth})`} value={monthlyCount.toString()} color="text-white" />
          <StatCard title={`Profit / Loss (${displayMonth})`} value={`${monthlyProfit > 0 ? '+' : ''}${monthlyProfit.toFixed(2)} PLN`} color={profitColor} />
          <StatCard title={`Yield / ROI (${displayMonth})`} value={`${yieldValue}%`} color={yieldColor} />
        </div>

        {/* 2. WYKRES (NOWOŚĆ) */}
        <div className="mb-8">
          <BankrollChart bets={safeBets} />
        </div>

        {/* 3. LISTA OSTATNICH */}
        <div className="flex justify-between items-end mb-4">
          <h2 className="text-xl font-bold text-gray-300">Ostatnie 5 Aktywności</h2>
          <button onClick={() => setCurrentView('history')} className="text-sm text-neon-blue hover:text-white transition-colors">
            Zobacz pełną historię →
          </button>
        </div>

        <div className="bg-dark-800 rounded-xl border border-dark-700 overflow-hidden shadow-lg pb-4">
          {recentBets.length === 0 ? (
            <div className="p-8 text-center text-gray-500">Brak danych. Dodaj swój pierwszy zakład!</div>
          ) : (
            <table className="w-full text-left">
              <thead className="bg-dark-900/50 text-gray-400 text-xs uppercase">
                <tr>
                  <th className="p-4">Data</th>
                  <th className="p-4">Bukmacher</th>
                  <th className="p-4 text-right">Stawka</th>
                  <th className="p-4 text-center">Status</th>
                  <th className="p-4 text-right min-w-[140px]">Akcje</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-dark-700">
                {recentBets.map((bet) => (
                  <tr key={bet.id} className="hover:bg-dark-700/50 transition-colors group">
                    <td className="p-4 text-gray-400 text-sm">{new Date(bet.date).toLocaleDateString()}</td>
                    <td className="p-4 text-sm text-white">{bet.bookmaker}</td>
                    <td className="p-4 text-right font-mono text-gray-300">{bet.stake.toFixed(2)}</td>
                    <td className="p-4 text-center">
                       <span className={`text-xs px-2 py-1 rounded-full border ${
                        bet.status === 'pending' ? 'border-yellow-500/30 text-yellow-500' :
                        bet.status === 'won' ? 'border-neon-green/30 text-neon-green' :
                        bet.status === 'lost' ? 'border-red-500/30 text-red-500' : 'border-gray-500/30 text-gray-400'
                      }`}>
                        {bet.status === 'pending' ? 'W GRZE' : bet.status.toUpperCase()}
                      </span>
                    </td>
                    <td className="p-4 text-right">
                      <div className="flex justify-end items-center gap-2 opacity-100 transition-opacity">
                        {bet.status === 'pending' && (
                          <>
                            <button onClick={() => handleQuickSettle(bet.id, 'won')} className="p-1.5 bg-neon-green/10 hover:bg-neon-green/20 text-neon-green rounded border border-neon-green/30">✅</button>
                            <button onClick={() => handleQuickSettle(bet.id, 'lost')} className="p-1.5 bg-neon-red/10 hover:bg-neon-red/20 text-neon-red rounded border border-neon-red/30">❌</button>
                            <div className="w-px h-4 bg-dark-600 mx-1"></div>
                          </>
                        )}
                        <button onClick={() => handleEdit(bet)} className="p-2 hover:bg-dark-600 rounded text-blue-400">✏️</button>
                        <button onClick={() => handleDelete(bet.id)} className="p-2 hover:bg-dark-600 rounded text-red-500">🗑️</button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </>
    );
  };

  return (
    <div className="flex h-screen bg-dark-900 text-white overflow-hidden">
      <aside className="w-64 bg-dark-800 border-r border-dark-700 flex flex-col">
        <div className="p-6 text-2xl font-bold text-neon-purple tracking-wider">BET TRACKER</div>
        <nav className="flex-1 px-4 py-4 space-y-2 flex flex-col">
          <MenuButton active={currentView === 'dashboard'} onClick={() => setCurrentView('dashboard')}>Dashboard</MenuButton>
          <MenuButton active={currentView === 'history'} onClick={() => setCurrentView('history')}>Historia</MenuButton>
          <MenuButton active={currentView === 'stats'} onClick={() => setCurrentView('stats')}>Statystyki</MenuButton>
          <div className="mt-auto pt-4 border-t border-dark-700">
            <MenuButton active={currentView === 'settings'} onClick={() => setCurrentView('settings')}>⚙️ Ustawienia</MenuButton>
          </div>
        </nav>
      </aside>

      <main className="flex-1 overflow-y-auto p-8 relative">
        {renderContent()}
      </main>

      <AddBetModal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} onBetAdded={() => {}} betToEdit={betToEdit} />
    </div>
  );
}

// Helpers
type MenuButtonProps = { children: React.ReactNode; active: boolean; onClick?: () => void };
type StatCardProps = { title: string; value: string; color: string };

function MenuButton({ children, active, onClick }: MenuButtonProps) {
  return (
    <button onClick={onClick} className={`w-full text-left px-4 py-3 rounded-lg transition-colors ${active ? 'bg-dark-700 text-neon-blue font-semibold' : 'text-gray-400 hover:bg-dark-700 hover:text-white'}`}>{children}</button>
  );
}

function StatCard({ title, value, color }: StatCardProps) {
  return (
    <div className="bg-dark-800 p-6 rounded-xl border border-dark-700 hover:border-dark-600 transition-all shadow-lg">
      <h3 className="text-gray-400 text-sm uppercase tracking-wider mb-2">{title}</h3>
      <p className={`text-3xl font-bold ${color}`}>{value}</p>
    </div>
  );
}

export default App;