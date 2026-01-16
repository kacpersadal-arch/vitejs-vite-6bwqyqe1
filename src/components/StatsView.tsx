import React, { useState, useMemo } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db, type Bet } from '../db';

export function StatsView() {
  // 1. POBIERAMY CAŁĄ HISTORIĘ
  const allBets = useLiveQuery(() => db.bets.toArray()) || [];

  // --- STANY FILTRÓW (Domyślnie "Wszystko") ---
  const [selectedMonth, setSelectedMonth] = useState<string>('all'); // Format: "YYYY-MM"
  const [selectedBookmaker, setSelectedBookmaker] = useState<string>('all');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');

  // 2. GENEROWANIE OPCJI DO LIST ROZWIJANYCH (Dynamicznie z bazy)
  const filterOptions = useMemo(() => {
    const months = new Set<string>();
    const bookmakers = new Set<string>();
    const categories = new Set<string>();

    allBets.forEach((bet) => {
      const d = new Date(bet.date);
      // Klucz miesiąca to np. "2026-01" (dzięki temu łatwo sortować)
      const monthKey = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(
        2,
        '0'
      )}`;

      months.add(monthKey);
      bookmakers.add(bet.bookmaker);
      categories.add(bet.category);
    });

    // Sortujemy miesiące od najnowszych, resztę alfabetycznie
    return {
      months: Array.from(months).sort().reverse(),
      bookmakers: Array.from(bookmakers).sort(),
      categories: Array.from(categories).sort(),
    };
  }, [allBets]);

  // 3. FILTROWANIE I LICZENIE STATYSTYK
  const stats = useMemo(() => {
    // Krok A: Filtrowanie zakładów
    const filteredBets = allBets.filter((bet) => {
      const d = new Date(bet.date);
      const monthKey = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(
        2,
        '0'
      )}`;

      // Jeśli wybrano konkretny filtr, a zakład nie pasuje -> odrzuć go
      if (selectedMonth !== 'all' && monthKey !== selectedMonth) return false;
      if (selectedBookmaker !== 'all' && bet.bookmaker !== selectedBookmaker)
        return false;
      if (selectedCategory !== 'all' && bet.category !== selectedCategory)
        return false;

      return true;
    });

    // Krok B: Matematyka na przefiltrowanych danych
    let totalStaked = 0;
    let totalProfit = 0;
    let wins = 0;
    let settledCount = 0;

    // Mapy do grupowania (żeby pokazać tabelki na dole)
    const byCategory = new Map<
      string,
      { staked: number; profit: number; count: number }
    >();
    const byBookmaker = new Map<
      string,
      { staked: number; profit: number; count: number }
    >();

    const updateMap = (
      map: Map<string, any>,
      key: string,
      bet: Bet,
      profit: number
    ) => {
      const current = map.get(key) || { staked: 0, profit: 0, count: 0 };
      map.set(key, {
        staked: current.staked + bet.stake,
        profit: current.profit + profit,
        count: current.count + 1,
      });
    };

    filteredBets.forEach((bet) => {
      // Ignorujemy zakłady nierozliczone lub zwroty
      if (bet.status === 'pending' || bet.status === 'void') return;

      const isWin = bet.status === 'won';
      const profit = isWin ? bet.potentialReturn - bet.stake : -bet.stake;

      totalStaked += bet.stake;
      totalProfit += profit;
      settledCount++;
      if (isWin) wins++;

      // Aktualizacja szczegółów
      updateMap(byCategory, bet.category, bet, profit);
      updateMap(byBookmaker, bet.bookmaker, bet, profit);
    });

    // Wyniki końcowe
    const yieldValue = totalStaked > 0 ? (totalProfit / totalStaked) * 100 : 0;
    const winRate = settledCount > 0 ? (wins / settledCount) * 100 : 0;

    // Przygotowanie tabelek (zamiana Map na Tablice + Sortowanie wg Zysku)
    const categoryStats = Array.from(byCategory.entries())
      .map(([name, data]) => ({
        name,
        ...data,
        yield: data.staked > 0 ? (data.profit / data.staked) * 100 : 0,
      }))
      .sort((a, b) => b.profit - a.profit);

    const bookmakerStats = Array.from(byBookmaker.entries())
      .map(([name, data]) => ({
        name,
        ...data,
        yield: data.staked > 0 ? (data.profit / data.staked) * 100 : 0,
      }))
      .sort((a, b) => b.profit - a.profit);

    return {
      count: filteredBets.length, // Wszystkie (też pending)
      settledCount, // Tylko rozliczone
      totalStaked,
      totalProfit,
      yieldValue,
      winRate,
      categoryStats,
      bookmakerStats,
    };
  }, [allBets, selectedMonth, selectedBookmaker, selectedCategory]);

  // --- FUNKCJE POMOCNICZE (Wygląd) ---

  // Zamienia "2026-01" na "Styczeń 2026"
  const formatMonthLabel = (yyyyMM: string) => {
    const [year, month] = yyyyMM.split('-');
    const date = new Date(parseInt(year), parseInt(month) - 1);
    const name = date.toLocaleString('pl-PL', { month: 'long' });
    return `${name.charAt(0).toUpperCase() + name.slice(1)} ${year}`;
  };

  const getProfitColor = (val: number) =>
    val > 0 ? 'text-neon-green' : val < 0 ? 'text-neon-red' : 'text-gray-400';

  const resetFilters = () => {
    setSelectedMonth('all');
    setSelectedBookmaker('all');
    setSelectedCategory('all');
  };

  return (
    <div className="space-y-8 animate-fade-in">
      {/* 1. PANEL FILTRÓW */}
      <div className="bg-dark-800 p-6 rounded-xl border border-dark-700 shadow-lg">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-2xl font-bold text-white">Filtrowanie Wyników</h2>
          {(selectedMonth !== 'all' ||
            selectedBookmaker !== 'all' ||
            selectedCategory !== 'all') && (
            <button
              onClick={resetFilters}
              className="text-xs text-neon-blue hover:text-white underline"
            >
              Wyczyść filtry
            </button>
          )}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* A. WYBÓR MIESIĄCA */}
          <div className="flex flex-col">
            <label className="text-gray-400 text-xs mb-2 ml-1">
              Konkretny Miesiąc
            </label>
            <select
              value={selectedMonth}
              onChange={(e) => setSelectedMonth(e.target.value)}
              className="bg-dark-900 border border-dark-700 text-white text-sm rounded-lg p-3 focus:border-neon-blue outline-none"
            >
              <option value="all">Cała historia</option>
              {filterOptions.months.map((m) => (
                <option key={m} value={m}>
                  {formatMonthLabel(m)}
                </option>
              ))}
            </select>
          </div>

          {/* B. WYBÓR BUKMACHERA */}
          <div className="flex flex-col">
            <label className="text-gray-400 text-xs mb-2 ml-1">Bukmacher</label>
            <select
              value={selectedBookmaker}
              onChange={(e) => setSelectedBookmaker(e.target.value)}
              className="bg-dark-900 border border-dark-700 text-white text-sm rounded-lg p-3 focus:border-neon-blue outline-none"
            >
              <option value="all">Wszyscy</option>
              {filterOptions.bookmakers.map((b) => (
                <option key={b} value={b}>
                  {b}
                </option>
              ))}
            </select>
          </div>

          {/* C. WYBÓR DYSCYPLINY */}
          <div className="flex flex-col">
            <label className="text-gray-400 text-xs mb-2 ml-1">
              Dyscyplina
            </label>
            <select
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              className="bg-dark-900 border border-dark-700 text-white text-sm rounded-lg p-3 focus:border-neon-blue outline-none"
            >
              <option value="all">Wszystkie</option>
              {filterOptions.categories.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* 2. KAFELKI KPI (Zależne od filtrów) */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <KPICard
          title="Zysk Netto"
          value={`${
            stats.totalProfit > 0 ? '+' : ''
          }${stats.totalProfit.toFixed(2)} PLN`}
          color={getProfitColor(stats.totalProfit)}
        />
        <KPICard
          title="Yield (ROI)"
          value={`${stats.yieldValue.toFixed(2)}%`}
          color={getProfitColor(stats.yieldValue)}
        />
        <KPICard
          title="Skuteczność"
          value={`${stats.winRate.toFixed(1)}%`}
          color="text-neon-purple"
          sub={`Wygrane: ${
            stats.settledCount > 0
              ? Math.round((stats.winRate / 100) * stats.settledCount)
              : 0
          }`}
        />
        <KPICard
          title="Obrót"
          value={`${stats.totalStaked.toFixed(2)} PLN`}
          color="text-white"
          sub={`${stats.count} zakładów`}
        />
      </div>

      {/* 3. SZCZEGÓŁOWE TABELE */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <AnalysisTable title="Wg Kategorii" data={stats.categoryStats} />
        <AnalysisTable title="Wg Bukmachera" data={stats.bookmakerStats} />
      </div>
    </div>
  );
}

// --- KOMPONENTY UI ---

function KPICard({
  title,
  value,
  color,
  sub,
}: {
  title: string;
  value: string;
  color: string;
  sub?: string;
}) {
  return (
    <div className="bg-dark-800 p-5 rounded-xl border border-dark-700 shadow-lg">
      <p className="text-gray-500 text-xs uppercase tracking-wider mb-1">
        {title}
      </p>
      <p className={`text-2xl font-bold ${color}`}>{value}</p>
      {sub && <p className="text-dark-700 text-xs mt-1 font-mono">{sub}</p>}
    </div>
  );
}

function AnalysisTable({ title, data }: { title: string; data: any[] }) {
  return (
    <div className="bg-dark-800 rounded-xl border border-dark-700 overflow-hidden flex flex-col h-full shadow-lg">
      <div className="p-4 border-b border-dark-700 bg-dark-900/50">
        <h3 className="font-bold text-gray-200">{title}</h3>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-sm text-left">
          <thead className="text-gray-500 bg-dark-900/30 text-xs uppercase sticky top-0">
            <tr>
              <th className="px-4 py-3">Nazwa</th>
              <th className="px-4 py-3 text-right">Yield</th>
              <th className="px-4 py-3 text-right">Zysk</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-dark-700">
            {data.length === 0 ? (
              <tr>
                <td colSpan={3} className="p-4 text-center text-gray-500">
                  Brak danych
                </td>
              </tr>
            ) : (
              data.map((item) => (
                <tr
                  key={item.name}
                  className="hover:bg-dark-700/50 transition-colors"
                >
                  <td className="px-4 py-3 font-medium text-gray-300">
                    {item.name}{' '}
                    <span className="text-xs text-gray-600 ml-1">
                      ({item.count})
                    </span>
                  </td>
                  <td
                    className={`px-4 py-3 text-right font-bold ${
                      item.yield > 0
                        ? 'text-neon-green'
                        : item.yield < 0
                        ? 'text-neon-red'
                        : 'text-gray-500'
                    }`}
                  >
                    {item.yield.toFixed(1)}%
                  </td>
                  <td
                    className={`px-4 py-3 text-right font-bold ${
                      item.profit > 0
                        ? 'text-neon-green'
                        : item.profit < 0
                        ? 'text-neon-red'
                        : 'text-gray-500'
                    }`}
                  >
                    {item.profit.toFixed(2)}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
