import React, { useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db, type Bet } from '../db';

interface Props {
  onEdit: (bet: Bet) => void;
}

export function HistoryView({ onEdit }: Props) {
  // Pobieramy wszystkie zakłady (posortowane od najnowszych)
  const bets = useLiveQuery(() => db.bets.orderBy('date').reverse().toArray());
  const safeBets = bets || [];

  // Stan dla wyszukiwarki
  const [searchTerm, setSearchTerm] = useState('');

  // Filtrowanie po wyszukiwaniu
  const filteredBets = safeBets.filter((bet) => {
    if (!searchTerm) return true;
    const term = searchTerm.toLowerCase();
    return (
      bet.bookmaker.toLowerCase().includes(term) ||
      bet.category.toLowerCase().includes(term) ||
      (bet.notes && bet.notes.toLowerCase().includes(term))
    );
  });

  // --- AKCJE (Szybkie rozliczanie i Usuwanie) ---
  const handleQuickSettle = async (id: number, status: 'won' | 'lost') => {
    try {
      await db.bets.update(id, { status });
    } catch (error) {
      console.error('Błąd aktualizacji statusu:', error);
    }
  };

  const handleDelete = async (id: number) => {
    if (
      window.confirm(
        'Czy na pewno chcesz usunąć ten zakład? Tej operacji nie można cofnąć.'
      )
    ) {
      try {
        await db.bets.delete(id);
      } catch (error) {
        console.error('Błąd usuwania:', error);
      }
    }
  };

  return (
    <div className="space-y-6 animate-fade-in">
      {/* NAGŁÓWEK I WYSZUKIWARKA */}
      <div className="flex flex-col md:flex-row justify-between items-center gap-4">
        <div>
          <h2 className="text-3xl font-bold text-white">Pełna Historia</h2>
          <p className="text-gray-400 text-sm mt-1">
            Wszystkie Twoje zakłady w jednym miejscu ({filteredBets.length})
          </p>
        </div>

        {/* Pole wyszukiwania */}
        <div className="w-full md:w-64">
          <input
            type="text"
            placeholder="Szukaj (np. Superbet, Piłka)..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full bg-dark-800 border border-dark-700 rounded-lg px-4 py-2 text-white focus:border-neon-blue outline-none text-sm"
          />
        </div>
      </div>

      {/* TABELA */}
      <div className="bg-dark-800 rounded-xl border border-dark-700 overflow-hidden shadow-lg pb-24">
        {filteredBets.length === 0 ? (
          <div className="p-8 text-center text-gray-500">
            {searchTerm
              ? 'Nie znaleziono zakładów pasujących do wyszukiwania.'
              : 'Brak historii. Dodaj pierwszy zakład!'}
          </div>
        ) : (
          <table className="w-full text-left border-collapse">
            <thead className="bg-dark-900/50 text-gray-400 text-xs uppercase sticky top-0">
              <tr>
                <th className="p-4">Data</th>
                <th className="p-4">Kategoria</th>
                <th className="p-4">Bukmacher</th>
                <th className="p-4 text-right">Stawka</th>
                <th className="p-4 text-right">Wynik</th>
                <th className="p-4 text-center">Status</th>
                <th className="p-4 text-right min-w-[140px]">Akcje</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-dark-700">
              {filteredBets.map((bet) => (
                <tr
                  key={bet.id}
                  className="hover:bg-dark-700/50 transition-colors group"
                >
                  <td className="p-4 text-gray-400 text-sm">
                    {new Date(bet.date).toLocaleDateString()}
                    <span className="block text-xs text-gray-600">
                      {new Date(bet.date).toLocaleTimeString([], {
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </span>
                  </td>
                  <td className="p-4">
                    <span className="bg-dark-900 border border-dark-700 px-2 py-1 rounded text-xs text-gray-300">
                      {bet.category}
                    </span>
                  </td>
                  <td className="p-4 text-sm">{bet.bookmaker}</td>
                  <td className="p-4 text-right font-mono text-gray-300">
                    {bet.stake.toFixed(2)}
                  </td>
                  <td
                    className={`p-4 text-right font-mono font-bold ${
                      bet.status === 'won' ? 'text-neon-green' : 'text-gray-400'
                    }`}
                  >
                    {bet.potentialReturn > 0
                      ? bet.potentialReturn.toFixed(2)
                      : '-'}
                  </td>
                  <td className="p-4 text-center">
                    <span
                      className={`text-xs px-2 py-1 rounded-full border ${
                        bet.status === 'pending'
                          ? 'border-yellow-500/30 text-yellow-500 bg-yellow-500/10'
                          : bet.status === 'won'
                          ? 'border-neon-green/30 text-neon-green bg-neon-green/10'
                          : bet.status === 'lost'
                          ? 'border-red-500/30 text-red-500 bg-red-500/10'
                          : 'border-gray-500/30 text-gray-400 bg-gray-500/10'
                      }`}
                    >
                      {bet.status === 'pending'
                        ? 'W GRZE'
                        : bet.status === 'void'
                        ? 'ZWROT'
                        : bet.status.toUpperCase()}
                    </span>
                  </td>

                  {/* PRZYCISKI AKCJI */}
                  <td className="p-4 text-right">
                    <div className="flex justify-end items-center gap-2 opacity-100 transition-opacity">
                      {bet.status === 'pending' && (
                        <>
                          <button
                            onClick={() => handleQuickSettle(bet.id, 'won')}
                            className="p-1.5 bg-neon-green/10 hover:bg-neon-green/20 text-neon-green rounded border border-neon-green/30 transition-colors"
                            title="Wygrana"
                          >
                            ✅
                          </button>
                          <button
                            onClick={() => handleQuickSettle(bet.id, 'lost')}
                            className="p-1.5 bg-neon-red/10 hover:bg-neon-red/20 text-neon-red rounded border border-neon-red/30 transition-colors"
                            title="Przegrana"
                          >
                            ❌
                          </button>
                          <div className="w-px h-4 bg-dark-600 mx-1"></div>
                        </>
                      )}

                      <button
                        onClick={() => onEdit(bet)}
                        className="p-2 hover:bg-dark-600 rounded text-blue-400"
                        title="Edytuj"
                      >
                        ✏️
                      </button>
                      <button
                        onClick={() => handleDelete(bet.id)}
                        className="p-2 hover:bg-dark-600 rounded text-red-500"
                        title="Usuń"
                      >
                        🗑️
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
