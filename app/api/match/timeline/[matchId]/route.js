import { getCachedData, setCachedData } from '../../../../utils/cache';

export async function GET(request, { params }) {
  const { matchId } = await params;
  // puuid 파라미터 제거

  try {
    // 매치와 타임라인 데이터를 병렬로 요청
    const [matchRes, timelineRes] = await Promise.all([
      fetch(`https://asia.api.riotgames.com/lol/match/v5/matches/${matchId}`, {
        headers: { "X-Riot-Token": process.env.RIOT_API_KEY }
      }),
      fetch(`https://asia.api.riotgames.com/lol/match/v5/matches/${matchId}/timeline`, {
        headers: { "X-Riot-Token": process.env.RIOT_API_KEY }
      })
    ]);

    if (matchRes.status === 429 || timelineRes.status === 429) {
      return Response.json({ error: 'Rate limit reached' }, { status: 429 });
    }

    if (!matchRes.ok || !timelineRes.ok) {
      throw new Error('API request failed');
    }

    const [matchData, timelineData] = await Promise.all([
      matchRes.json(),
      timelineRes.json()
    ]);

    // 전체 이벤트 데이터 반환
    const responseData = { events: timelineData.info.frames.flatMap(frame => frame.events) };
    return Response.json(responseData);

  } catch (error) {
    console.error("Error fetching timeline data:", error);
    return Response.json({ error: error.message }, { status: 500 });
  }
} 