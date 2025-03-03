import { NextResponse } from "next/server";

export async function GET(request, { params }) {
  try {
    const { searchParams } = new URL(request.url);
    const puuid = searchParams.get("puuid");
    const { matchId } = await params;

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

    // 솔로 랭크 게임이 아닌 경우
    if (matchData.info.queueId !== 420) {
      return NextResponse.json({
        isRanked: false,
        error: "Not a solo ranked game",
      });
    }

    // PUUID로 해당 플레이어 찾기
    const participant = matchData.info.participants.find(
      (p) => p.puuid === puuid
    );

    if (!participant) {
      throw new Error("Player not found in match data");
    }

    return NextResponse.json({
      isRanked: true,
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
