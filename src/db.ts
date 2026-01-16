import Dexie, { type EntityTable } from 'dexie';

// --- WAŻNE: Musi być 'export', żeby inne pliki to widziały ---
export interface Bet {
  id: number;
  date: Date;
  stake: number;
  odds: number;
  potentialReturn: number;
  bookmaker: string;
  category: string;
  status: 'pending' | 'won' | 'lost' | 'void';
  notes?: string;
}

export interface Bankroll {
  id: number;
  name: string;
  initialCapital: number;
  currentBalance: number;
}

const db = new Dexie('BetTrackerDB') as Dexie & {
  bets: EntityTable<Bet, 'id'>;
  bankrolls: EntityTable<Bankroll, 'id'>;
};

db.version(1).stores({
  bets: '++id, date, status, category',
  bankrolls: '++id, name',
});

db.on('populate', async () => {
  await db.bankrolls.add({
    name: 'Portfel Główny',
    initialCapital: 1000,
    currentBalance: 1000,
  });
});

export { db };
