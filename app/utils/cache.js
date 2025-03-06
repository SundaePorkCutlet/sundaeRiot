// 캐시 유틸리티 함수들
export const CACHE_DURATION = 2 * 60 * 1000; // 2분

export function getCachedData(key) {
  if (typeof window === 'undefined') return null;
  
  const cached = localStorage.getItem(key);
  if (!cached) return null;

  const { data, timestamp } = JSON.parse(cached);
  if (Date.now() - timestamp > CACHE_DURATION) {
    localStorage.removeItem(key);
    return null;
  }

  return data;
}

export function setCachedData(key, data) {
  if (typeof window === 'undefined') return;
  
  localStorage.setItem(key, JSON.stringify({
    data,
    timestamp: Date.now()
  }));
} 