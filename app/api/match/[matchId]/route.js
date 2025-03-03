import { NextResponse } from "next/server";

export async function GET(request, { params }) {
  const { matchId } = params;

  try {
    // 아시아 서버의 매치 데이터 URL로 수정
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

    // PUUID로 해당 플레이어 찾기
    const participant = matchData.info.participants.find(
      (p) => p.puuid === matchData.metadata.participants[0]
    );

    if (!participant) {
      throw new Error("Player not found in match data");
    }

    return NextResponse.json({
      championName: participant.championName,
      win: participant.win,
      kills: participant.kills,
      deaths: participant.deaths,
      assists: participant.assists,
      totalDamageDealtToChampions: participant.totalDamageDealtToChampions,
    });
  } catch (error) {
    console.error("Error fetching match data:", error);
    return NextResponse.json(
      { error: "Failed to fetch match data" },
      { status: 500 }
    );
  }
}
