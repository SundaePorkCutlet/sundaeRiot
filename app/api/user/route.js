export async function GET() {
  console.log("🔹 환경 변수 체크");
  console.log("RIOT_API_KEY:", process.env.RIOT_API_KEY);
  console.log("USER_PUUIDS:", process.env.USER_PUUIDS);

  try {
    const RIOT_API_KEY = process.env.RIOT_API_KEY;
    const USER_PUUIDS = process.env.USER_PUUIDS?.split(",");

    if (!RIOT_API_KEY || !USER_PUUIDS || USER_PUUIDS.length === 0) {
      return new Response(
        JSON.stringify({ error: "API Key or PUUIDs are missing" }),
        { status: 400 }
      );
    }

    const userData = await Promise.all(
      USER_PUUIDS.map(async (puuid) => {
        // 🔹 랭크 정보 가져오기
        const leagueUrl = `https://kr.api.riotgames.com/lol/league/v4/entries/by-puuid/${puuid}`;
        const leagueRes = await fetch(leagueUrl, {
          headers: { "X-Riot-Token": RIOT_API_KEY },
        });
        const leagueData = await leagueRes.json();

        // 🔹 솔로 랭크 매치만 가져오기 (queueId=420)
        const matchesUrl = `https://asia.api.riotgames.com/lol/match/v5/matches/by-puuid/${puuid}/ids?queue=420&start=0&count=3`;
        const matchesRes = await fetch(matchesUrl, {
          headers: { "X-Riot-Token": RIOT_API_KEY },
        });
        const matchIds = await matchesRes.json();

        return { puuid, league: leagueData, matches: matchIds };
      })
    );

    return new Response(JSON.stringify(userData), { status: 200 });
  } catch (error) {
    console.error("Error:", error);
    return new Response(
      JSON.stringify({ error: "Failed to fetch Riot API data" }),
      { status: 500 }
    );
  }
}
