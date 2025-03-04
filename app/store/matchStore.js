import { create } from 'zustand';
import { persist } from 'zustand/middleware';

const useMatchStore = create(
  persist(
    (set, get) => ({
      matches: {},
      lastFetchTime: {},
      setMatch: (matchId, matchData) => set((state) => ({
        matches: { ...state.matches, [matchId]: matchData },
        lastFetchTime: { ...state.lastFetchTime, [matchId]: Date.now() }
      })),
      shouldFetchMatch: (matchId) => {
        const state = get();
        if (!state.lastFetchTime[matchId]) return true;
        
        const TWO_MINUTES = 2 * 60 * 1000;
        return Date.now() - state.lastFetchTime[matchId] > TWO_MINUTES;
      },
    }),
    {
      name: 'match-storage',
    }
  )
);

export default useMatchStore; 