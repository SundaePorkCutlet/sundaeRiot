import { NextResponse } from "next/server";

// 메모리 캐시 객체
const matchCache = {
  data: new Map(),
  timestamps: new Map(),
};

const TWO_MINUTES = 2 * 60 * 1000; // 2분을 밀리초로 변환

export async function GET(request, context) {
  const params = await context.params;  // params 전체를 await
  const { matchId } = params;  // 그 다음 구조분해
  
  try {
    const { searchParams } = new URL(request.url);
    const puuid = searchParams.get("puuid");

    // 캐시 확인
    const cachedData = matchCache.data.get(matchId);
    const cachedTimestamp = matchCache.timestamps.get(matchId);
    const now = Date.now();

    // 캐시가 있고 2분이 지나지 않았다면 캐시된 데이터 반환
    if (cachedData && cachedTimestamp && (now - cachedTimestamp) < TWO_MINUTES) {
      console.log(`🔹 캐시된 매치 데이터 반환: ${matchId}`);
      return NextResponse.json(cachedData);
    }

    console.log(`🔹 새로운 매치 데이터 요청: ${matchId}`);
    const response = await fetch(
      `https://asia.api.riotgames.com/lol/match/v5/matches/${matchId}`,
      {
        headers: {
          "X-Riot-Token": process.env.RIOT_API_KEY,
        },
      }
    );

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const matchData = await response.json();

    if (matchData.info.queueId !== 420) {
      const result = {
        isRanked: false,
        error: "Not a solo ranked game",
      };
      // 캐시 업데이트
      matchCache.data.set(matchId, result);
      matchCache.timestamps.set(matchId, now);
      return NextResponse.json(result);
    }

    const participant = matchData.info.participants.find(
      (p) => p.puuid === puuid
    );

    if (!participant) {
      throw new Error("Player not found in match data");
    }

    const result = {
      isRanked: true,
      championName: participant.championName,
      win: participant.win,
      kills: participant.kills,
      deaths: participant.deaths,
      assists: participant.assists,
      totalDamageDealtToChampions: participant.totalDamageDealtToChampions,
      doubleKills: participant.doubleKills,
      tripleKills: participant.tripleKills,
      quadraKills: participant.quadraKills,
      pentaKills: participant.pentaKills,
      gameStartTimestamp: matchData.info.gameStartTimestamp,
    };

    // 캐시 업데이트
    matchCache.data.set(matchId, result);
    matchCache.timestamps.set(matchId, now);
    
    return NextResponse.json(result);
  } catch (error) {
    console.error("Error fetching match data:", error);
    return NextResponse.json(
      { error: "Failed to fetch match data" },
      { status: 500 }
    );
  }
}
