import { NextResponse } from "next/server";
import { getCachedData, setCachedData } from '../../../utils/cache';

// 메모리 캐시 객체
const matchCache = {
  data: new Map(),
  timestamps: new Map(),
};

const TWO_MINUTES = 2 * 60 * 1000; // 2분을 밀리초로 변환

export async function GET(request, { params }) {
  const { matchId } = await params;
  const searchParams = request.nextUrl.searchParams;
  const puuid = searchParams.get("puuid");
  const cacheKey = `match-${matchId}-${puuid}`;

  try {
    const cachedData = getCachedData(cacheKey);
    if (cachedData) {
      console.log('서버 캐시 사용:', cacheKey);
      return Response.json(cachedData);
    }

    const res = await fetch(
      `https://asia.api.riotgames.com/lol/match/v5/matches/${matchId}`,
      {
        headers: {
          "X-Riot-Token": process.env.RIOT_API_KEY,
        },
      }
    );

    if (res.status === 429) {
      const cachedData = getCachedData(cacheKey);
      if (cachedData) {
        console.log('Rate limit - 서버 캐시 사용:', cacheKey);
        return Response.json(cachedData);
      }
      return Response.json({ cacheKey, error: "Rate limit exceeded" }, { status: 429 });
    }

    if (!res.ok) throw new Error(`HTTP error! status: ${res.status}`);
    
    const matchData = await res.json();
    const participant = matchData.info.participants.find(
      (p) => p.puuid === puuid
    );

    const responseData = {
      matchId,
      participantId: participant.participantId,  // timeline API에서 필요
      isRanked: matchData.info.queueId === 420,
      championName: participant.championName,
      win: participant.win,
      kills: participant.kills,
      deaths: participant.deaths,
      assists: participant.assists,
      doubleKills: participant.doubleKills,
      tripleKills: participant.tripleKills,
      quadraKills: participant.quadraKills,
      pentaKills: participant.pentaKills,
      totalDamageDealtToChampions: participant.totalDamageDealtToChampions,
      gameStartTimestamp: matchData.info.gameStartTimestamp,
      summoner1Id: participant.summoner1Id,
      summoner2Id: participant.summoner2Id,
      item0: participant.item0,
      item1: participant.item1,
      item2: participant.item2,
      item3: participant.item3,
      item4: participant.item4,
      item5: participant.item5,
      item6: participant.item6,
      cacheKey
    };

    setCachedData(cacheKey, responseData);
    return Response.json(responseData);

  } catch (error) {
    console.error("Error fetching match data:", error);
    const cachedData = getCachedData(cacheKey);
    if (cachedData) {
      console.log('Error - 서버 캐시 사용:', cacheKey);
      return Response.json(cachedData);
    }
    return Response.json({ error: error.message }, { status: 500 });
  }
}
