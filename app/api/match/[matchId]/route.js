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
    // 먼저 캐시 확인
    const cachedData = getCachedData(cacheKey);
    if (cachedData) {
      console.log('Using cached match data:', matchId);
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

    // 429 에러 발생 시 캐시된 데이터 다시 확인
    if (res.status === 429) {
      console.log('Rate limit reached, checking cache again:', matchId);
      const cachedData = getCachedData(cacheKey);
      if (cachedData) {
        return Response.json(cachedData);
      }
      return Response.json({ error: 'Rate limit reached' }, { status: 429 });
    }

    if (!res.ok) {
      throw new Error(`HTTP error! status: ${res.status}`);
    }

    const matchData = await res.json();
    const participant = matchData.info.participants.find(
      (p) => p.puuid === puuid
    );

    // 팀 전체 데미지와 킬 수 계산
    const blueTeam = matchData.info.participants.filter(p => p.teamId === 100);
    const redTeam = matchData.info.participants.filter(p => p.teamId === 200);

    const responseData = {
      // 기존 개별 플레이어 데이터
      matchId,
      participantId: participant.participantId,
      puuid: participant.puuid,
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

      // 점수 계산에 필요한 필드들
      gameDuration: matchData.info.gameDuration,
      goldEarned: participant.goldEarned,
      visionScore: participant.visionScore,
      totalMinionsKilled: participant.totalMinionsKilled,
      teamDamageShare: participant.totalDamageDealtToChampions,
      teamKills: participant.teamId === 100 ? 
        blueTeam.reduce((sum, p) => sum + p.kills, 0) : 
        redTeam.reduce((sum, p) => sum + p.kills, 0),
      
      // 전체 플레이어 정보 추가
      allPlayers: matchData.info.participants.map(p => ({
        puuid: p.puuid,
        summonerName: p.summonerName,
        championName: p.championName,
        teamId: p.teamId,
        kills: p.kills,
        deaths: p.deaths,
        assists: p.assists,
        totalDamageDealtToChampions: p.totalDamageDealtToChampions,
        goldEarned: p.goldEarned,
        visionScore: p.visionScore,
        totalMinionsKilled: p.totalMinionsKilled,
        win: p.win
      })),

      // 팀 통계
      teams: {
        blue: {
          totalDamage: blueTeam.reduce((sum, p) => sum + p.totalDamageDealtToChampions, 0),
          totalKills: blueTeam.reduce((sum, p) => sum + p.kills, 0),
          win: blueTeam[0].win
        },
        red: {
          totalDamage: redTeam.reduce((sum, p) => sum + p.totalDamageDealtToChampions, 0),
          totalKills: redTeam.reduce((sum, p) => sum + p.kills, 0),
          win: redTeam[0].win
        }
      }
    };

    // 새로운 데이터 캐시에 저장
    setCachedData(cacheKey, responseData);
    return Response.json(responseData);

  } catch (error) {
    console.error("Error fetching match data:", error);
    // 에러 발생 시 캐시 다시 확인
    const cachedData = getCachedData(cacheKey);
    if (cachedData) {
      return Response.json(cachedData);
    }
    return Response.json({ error: error.message }, { status: 500 });
  }
}
