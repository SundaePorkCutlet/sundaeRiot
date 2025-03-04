import { create } from 'zustand';

const useUserStore = create((set, get) => ({
  users: [],
  championKoreanNames: {},
  lastFetchTime: null,
  setUsers: (users) => set({ users, lastFetchTime: new Date() }),
  setChampionKoreanNames: (names) => set({ championKoreanNames: names }),
  shouldFetch: () => {
    const lastFetch = get().lastFetchTime;
    if (!lastFetch) return true;
    const now = new Date();
    return now - lastFetch > 2 * 60 * 1000; // 2분
  }
}));

export default useUserStore; 