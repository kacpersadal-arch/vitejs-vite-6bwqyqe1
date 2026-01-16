import React, { useState, useEffect } from 'react';
import { db, type Bet } from '../db'; // Upewnij się, że importujesz też typ Bet!

interface Props {
  isOpen: boolean;
  onClose: () => void;
  onBetAdded: () => void;
  betToEdit?: Bet | null; // Nowy parametr: zakład do edycji
}

export function AddBetModal({ isOpen, onClose, onBetAdded, betToEdit }: Props) {
  // --- STANY FORMULARZA ---
  const [dateStr, setDateStr] = useState(''); // Nowy stan dla daty
  const [bookmaker, setBookmaker] = useState('Betclic');
  const [stake, setStake] = useState('');
  const [odds, setOdds] = useState('');
  const [winValue, setWinValue] = useState('');
  const [category, setCategory] = useState('Piłka Nożna');
  const [notes, setNotes] = useState('');

  const isSlots = category === 'Sloty';

  // --- WYPEŁNIANIE DANYCH (PRZY OTWARCIU) ---
  useEffect(() => {
    if (isOpen) {
      if (betToEdit) {
        // TRYB EDYCJI: Wypełniamy pola starymi danymi

        // Konwersja daty do formatu, który rozumie input (yyyy-MM-ddThh:mm)
        const d = betToEdit.date;
        // Trik na przesunięcie strefy czasowej, żeby godzina była polska
        const formattedDate = new Date(
          d.getTime() - d.getTimezoneOffset() * 60000
        )
          .toISOString()
          .slice(0, 16);

        setDateStr(formattedDate);
        setBookmaker(betToEdit.bookmaker);
        setStake(betToEdit.stake.toString());
        // Jeśli to sloty, kurs może nie istnieć w UI, ale w bazie jest 1.0
        setOdds(isSlots ? '' : betToEdit.odds.toString());
        setWinValue(betToEdit.potentialReturn.toString());
        setCategory(betToEdit.category);
        setNotes(betToEdit.notes || '');
      } else {
        // TRYB NOWY: Czyścimy i ustawiamy "Teraz"
        const now = new Date();
        const formattedDate = new Date(
          now.getTime() - now.getTimezoneOffset() * 60000
        )
          .toISOString()
          .slice(0, 16);

        setDateStr(formattedDate);
        setBookmaker('Betclic');
        setStake('');
        setOdds('');
        setWinValue('');
        setCategory('Koszykówka');
        setNotes('');
      }
    }
  }, [isOpen, betToEdit]);

  // --- AUTOMATYCZNE LICZENIE (Tylko Sport i gdy to NOWY zakład) ---
  useEffect(() => {
    // Blokujemy auto-liczenie przy edycji, żeby nie nadpisać ręcznych zmian wygranej
    if (!isSlots && stake && odds && !betToEdit) {
      const calculated = (parseFloat(stake) * parseFloat(odds)).toFixed(2);
      setWinValue(calculated);
    }
  }, [stake, odds, isSlots, betToEdit]);

  // --- ZAPIS DO BAZY ---
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!stake) return;

    const deposit = parseFloat(stake);
    const finalOdds = isSlots ? 1.0 : parseFloat(odds);
    const finalWin = parseFloat(winValue) || 0;
    const selectedDate = new Date(dateStr); // Używamy daty z inputa

    // LOGIKA STATUSU
    let status: 'pending' | 'won' | 'lost' | 'void' = 'pending';

    if (isSlots) {
      if (finalWin > deposit) status = 'won';
      else if (finalWin < deposit) status = 'lost';
      else status = 'void';
    } else {
      // Dla sportu: jeśli edytujemy, zachowaj stary status, chyba że to nowy zakład
      status = betToEdit ? betToEdit.status : 'pending';
    }

    try {
      if (betToEdit) {
        // AKTUALIZACJA (UPDATE)
        await db.bets.update(betToEdit.id, {
          date: selectedDate,
          bookmaker,
          stake: deposit,
          odds: finalOdds,
          potentialReturn: finalWin,
          category,
          status, // Zaktualizuje status dla slotów, dla sportu zachowa stary
          notes,
        });
      } else {
        // NOWY WPIS (ADD)
        await db.bets.add({
          date: selectedDate,
          bookmaker,
          stake: deposit,
          odds: finalOdds,
          potentialReturn: finalWin,
          category,
          status,
          notes,
        });
      }

      onBetAdded();
      onClose();
    } catch (error) {
      console.error('Błąd zapisu:', error);
      alert('Nie udało się zapisać zakładu.');
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-dark-800 border border-dark-700 rounded-2xl w-full max-w-md shadow-2xl p-6 animate-fade-in max-h-[90vh] overflow-y-auto">
        <h2 className="text-2xl font-bold text-white mb-6">
          {betToEdit ? 'Edytuj Zakład' : isSlots ? 'Nowa Sesja' : 'Nowy Zakład'}
        </h2>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* NOWE POLE: Data i Godzina */}
          <div>
            <label className="block text-gray-400 text-xs mb-1">
              Data i Godzina
            </label>
            <input
              type="datetime-local"
              value={dateStr}
              onChange={(e) => setDateStr(e.target.value)}
              className="w-full bg-dark-900 border border-dark-700 rounded-lg p-2 text-white focus:border-neon-blue outline-none"
              required
            />
          </div>

          {/* Bukmacher & Kategoria */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-gray-400 text-xs mb-1">
                Dostawca / Bukmacher
              </label>
              <input
                type="text"
                value={bookmaker}
                onChange={(e) => setBookmaker(e.target.value)}
                className="w-full bg-dark-900 border border-dark-700 rounded-lg p-2 text-white focus:border-neon-blue outline-none"
              />
            </div>
            <div>
              <label className="block text-gray-400 text-xs mb-1">
                Kategoria
              </label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className="w-full bg-dark-900 border border-dark-700 rounded-lg p-2 text-white focus:border-neon-blue outline-none"
              >
                <option>Piłka Nożna</option>
                <option>Tenis</option>
                <option>Koszykówka</option>
                <option>Esport</option>
                <option>Sloty</option>
              </select>
            </div>
          </div>

          {/* DYNAMICZNE POLA */}
          <div className="grid grid-cols-2 gap-4">
            <div className={isSlots ? 'col-span-2' : ''}>
              <label className="block text-gray-400 text-xs mb-1">
                {isSlots ? 'Kwota Depozytu (PLN)' : 'Stawka (PLN)'}
              </label>
              <input
                type="number"
                step="0.01"
                value={stake}
                onChange={(e) => setStake(e.target.value)}
                placeholder="0.00"
                className="w-full bg-dark-900 border border-dark-700 rounded-lg p-2 text-white font-mono text-lg focus:border-neon-blue outline-none"
                required
              />
            </div>

            {!isSlots && (
              <div>
                <label className="block text-gray-400 text-xs mb-1">Kurs</label>
                <input
                  type="number"
                  step="0.01"
                  value={odds}
                  onChange={(e) => setOdds(e.target.value)}
                  placeholder="1.00"
                  className="w-full bg-dark-900 border border-dark-700 rounded-lg p-2 text-white font-mono text-lg focus:border-neon-blue outline-none"
                  required
                />
              </div>
            )}
          </div>

          <div>
            <label className="block text-gray-400 text-xs mb-1">
              {isSlots
                ? 'Kwota Wypłaty (Końcowy stan)'
                : 'Potencjalna Wygrana (Edytowalna)'}
            </label>
            <input
              type="number"
              step="0.01"
              value={winValue}
              onChange={(e) => setWinValue(e.target.value)}
              placeholder="0.00"
              className={`w-full bg-dark-900 border border-dark-700 rounded-lg p-2 font-mono text-lg focus:border-neon-blue outline-none ${
                winValue ? 'text-neon-green font-bold' : 'text-white'
              }`}
            />
          </div>

          <div>
            <label className="block text-gray-400 text-xs mb-1">Notatki</label>
            <textarea
              rows={2}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="w-full bg-dark-900 border border-dark-700 rounded-lg p-2 text-white text-sm focus:border-neon-blue outline-none resize-none"
            />
          </div>

          <div className="flex gap-3 mt-6">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-3 rounded-lg bg-transparent border border-dark-700 text-gray-300 hover:bg-dark-700 transition-colors"
            >
              Anuluj
            </button>
            <button
              type="submit"
              className="flex-1 py-3 rounded-lg bg-neon-blue text-white font-bold hover:bg-blue-600 transition-colors shadow-[0_0_15px_rgba(59,130,246,0.3)]"
            >
              {betToEdit ? 'Zapisz Zmiany' : 'Dodaj Zakład'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
