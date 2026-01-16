import React, { useRef } from 'react';
import { db, type Bet } from '../db';

export function SettingsView() {
  const fileInputRef = useRef<HTMLInputElement>(null);

  // --- EKSPORT DANYCH ---
  const handleExport = async () => {
    try {
      const bets = await db.bets.toArray();
      // Tworzymy plik JSON
      const json = JSON.stringify(bets, null, 2);
      const blob = new Blob([json], { type: 'application/json' });
      const url = URL.createObjectURL(blob);

      // Wymuszamy pobieranie
      const a = document.createElement('a');
      a.href = url;
      a.download = `bet-tracker-backup-${new Date()
        .toISOString()
        .slice(0, 10)}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Export failed:', error);
      alert('Błąd podczas eksportu danych.');
    }
  };

  // --- IMPORT DANYCH ---
  const handleImport = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (
      !window.confirm(
        'UWAGA: Import całkowicie NADPISZE obecne dane w aplikacji! Czy na pewno chcesz kontynuować?'
      )
    ) {
      if (fileInputRef.current) fileInputRef.current.value = ''; // Reset inputa
      return;
    }

    const reader = new FileReader();
    reader.onload = async (e) => {
      try {
        const content = e.target?.result as string;
        const data = JSON.parse(content);

        if (!Array.isArray(data)) throw new Error('Nieprawidłowy format pliku');

        // Naprawiamy daty (w JSON są napisami, w bazie muszą być obiektami Date)
        const fixedData = data.map((item: any) => ({
          ...item,
          date: new Date(item.date),
        }));

        // Czyścimy bazę i wrzucamy nowe dane
        await db.bets.clear();
        await db.bets.bulkAdd(fixedData as Bet[]);

        alert(
          'Pomyślnie przywrócono kopię zapasową! Strona zostanie odświeżona.'
        );
        window.location.reload();
      } catch (error) {
        console.error('Import failed:', error);
        alert(
          'Błąd importu. Upewnij się, że wybierasz poprawny plik .json wygenerowany przez tę aplikację.'
        );
      }
    };
    reader.readAsText(file);
  };

  return (
    <div className="space-y-8 animate-fade-in">
      <div className="mb-8">
        <h2 className="text-3xl font-bold text-white">Ustawienia</h2>
        <p className="text-gray-400 text-sm mt-1">
          Zarządzanie danymi i bezpieczeństwo
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        {/* KARTA 1: EKSPORT */}
        <div className="bg-dark-800 p-6 rounded-xl border border-dark-700 shadow-lg">
          <h3 className="text-xl font-bold text-neon-blue mb-4">
            💾 Kopia Zapasowa (Backup)
          </h3>
          <p className="text-gray-400 text-sm mb-6">
            Pobierz całą swoją historię zakładów do pliku. Zalecamy robić to
            regularnie (np. raz w tygodniu), aby nie stracić danych w przypadku
            awarii przeglądarki.
          </p>
          <button
            onClick={handleExport}
            className="w-full py-3 bg-neon-blue hover:bg-blue-600 text-white font-bold rounded-lg transition-colors shadow-lg shadow-blue-500/20"
          >
            Pobierz Backup (.json)
          </button>
        </div>

        {/* KARTA 2: IMPORT */}
        <div className="bg-dark-800 p-6 rounded-xl border border-dark-700 shadow-lg relative overflow-hidden">
          <div className="absolute top-0 right-0 p-4 opacity-10 pointer-events-none">
            <span className="text-9xl">⚠️</span>
          </div>
          <h3 className="text-xl font-bold text-neon-red mb-4">
            ♻️ Przywracanie Danych
          </h3>
          <p className="text-gray-400 text-sm mb-6">
            Wczytaj plik z kopią zapasową. <br />
            <span className="text-red-400 font-bold">UWAGA:</span> Ta operacja
            usunie obecne dane i zastąpi je tymi z pliku.
          </p>

          <input
            type="file"
            accept=".json"
            ref={fileInputRef}
            onChange={handleImport}
            className="hidden"
            id="import-file"
          />
          <label
            htmlFor="import-file"
            className="block w-full text-center py-3 border border-neon-red text-neon-red hover:bg-neon-red hover:text-white font-bold rounded-lg transition-colors cursor-pointer"
          >
            Wybierz plik i Przywróć
          </label>
        </div>
      </div>
    </div>
  );
}
