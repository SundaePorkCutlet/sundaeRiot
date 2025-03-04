import { create } from 'zustand';
import { persist } from 'zustand/middleware';

const useUserStore = create(
  persist(
    (set) => ({
      users: [],
      lastFetchTime: null,
      setUsers: (users) => set({ users, lastFetchTime: Date.now() }),
      shouldFetch: () => {
        const state = useUserStore.getState();
        if (!state.lastFetchTime) return true;
        
        // 마지막 fetch로부터 2분이 지났는지 확인
        const TWO_MINUTES = 2 * 60 * 1000;
        return Date.now() - state.lastFetchTime > TWO_MINUTES;
      },
    }),
    {
      name: 'user-storage',
    }
  )
);

export default useUserStore; 