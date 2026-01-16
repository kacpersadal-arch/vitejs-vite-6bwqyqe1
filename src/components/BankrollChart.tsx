import React, { useMemo } from 'react';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Area,
  AreaChart,
} from 'recharts';
import { type Bet } from '../db';

interface Props {
  bets: Bet[];
}

export function BankrollChart({ bets }: Props) {
  // --- PRZETWARZANIE DANYCH ---
  const data = useMemo(() => {
    // 1. Sortujemy zakłady od najstarszego (chronologicznie)
    const sortedBets = [...bets].sort(
      (a, b) => a.date.getTime() - b.date.getTime()
    );

    // 2. Tworzymy punkty na wykresie (Skumulowany Zysk)
    let currentProfit = 0;
    const chartData = sortedBets
      .filter((b) => b.status === 'won' || b.status === 'lost') // Bierzemy tylko rozliczone
      .map((bet) => {
        const profit =
          bet.status === 'won' ? bet.potentialReturn - bet.stake : -bet.stake;

        currentProfit += profit;

        return {
          date: new Date(bet.date).toLocaleDateString('pl-PL', {
            day: '2-digit',
            month: '2-digit',
          }),
          fullDate: new Date(bet.date).toLocaleDateString(),
          value: parseFloat(currentProfit.toFixed(2)),
          stake: bet.stake,
        };
      });

    // Dodajemy punkt startowy (0 PLN) na początku, jeśli są jakieś dane
    if (chartData.length > 0) {
      return [
        { date: 'Start', fullDate: 'Początek', value: 0, stake: 0 },
        ...chartData,
      ];
    }
    return [];
  }, [bets]);

  if (data.length === 0) {
    return (
      <div className="h-64 flex items-center justify-center text-gray-500 bg-dark-800 rounded-xl border border-dark-700">
        Brak rozliczonych zakładów do wyświetlenia wykresu.
      </div>
    );
  }

  // Ustalamy kolor linii (Zielony jak zysk, Czerwony jak strata)
  const isPositive = data[data.length - 1].value >= 0;
  const strokeColor = isPositive ? '#10b981' : '#ef4444'; // neon-green lub neon-red
  const fillColor = isPositive
    ? 'rgba(16, 185, 129, 0.1)'
    : 'rgba(239, 68, 68, 0.1)';

  return (
    <div className="bg-dark-800 p-6 rounded-xl border border-dark-700 shadow-lg animate-fade-in">
      <h3 className="text-gray-400 text-sm uppercase tracking-wider mb-4">
        Trend Zysku (All-Time)
      </h3>

      <div className="h-64 w-full">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={data}>
            <defs>
              <linearGradient id="colorValue" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor={strokeColor} stopOpacity={0.3} />
                <stop offset="95%" stopColor={strokeColor} stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid
              strokeDasharray="3 3"
              stroke="#334155"
              opacity={0.5}
            />
            <XAxis
              dataKey="date"
              stroke="#94a3b8"
              fontSize={12}
              tickMargin={10}
            />
            <YAxis
              stroke="#94a3b8"
              fontSize={12}
              tickFormatter={(value) => `${value} zł`}
            />
            <Tooltip
              contentStyle={{
                backgroundColor: '#1e293b',
                borderColor: '#334155',
                color: '#fff',
              }}
              itemStyle={{ color: strokeColor }}
              formatter={(value: number) => [`${value} PLN`, 'Bilans']}
              labelStyle={{ color: '#94a3b8', marginBottom: '5px' }}
            />
            <Area
              type="monotone"
              dataKey="value"
              stroke={strokeColor}
              strokeWidth={3}
              fill="url(#colorValue)"
              activeDot={{ r: 6, fill: '#fff', stroke: strokeColor }}
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
