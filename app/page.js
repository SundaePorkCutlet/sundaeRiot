"use client";
import { useEffect, useState } from "react";

export default function Home() {
  // 🔹 6명의 소환사명 (순서 중요!)
  const summonerNames = [
    "순대돈까스",
    "움치기",
    "죗값치룬박연진",
    "빡구컷",
    "밥뚱원",
    "섹디르",
  ];

  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchData = async () => {
      try {
        console.log("🔹 `/api/user` 호출 시작...");
        const res = await fetch("/api/user");
        console.log("🔹 응답 상태 코드:", res.status);

        if (!res.ok) throw new Error(`HTTP 오류 상태 코드: ${res.status}`);

        const result = await res.json();
        console.log("✅ 서버에서 받은 데이터:", result);

        // 🔹 "솔로 랭크 (RANKED_SOLO_5x5)"만 필터링
        const filteredData = result.map((user, index) => ({
          summonerName: summonerNames[index], // PUUID 순서와 동일한 소환사명 추가
          puuid: user.puuid,
          league:
            user.league.find((l) => l.queueType === "RANKED_SOLO_5x5") || null,
          matches: user.matches,
        }));

        setUsers(filteredData);
      } catch (err) {
        console.error("❌ 오류 발생:", err);
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  // 티어별 배경 그라데이션 설정
  const getTierGradient = (tier) => {
    const gradients = {
      IRON: "linear-gradient(135deg, rgba(81, 83, 94, 0.3) 0%, rgba(120, 122, 133, 0.3) 50%, rgba(81, 83, 94, 0.3) 100%)",
      BRONZE:
        "linear-gradient(135deg, rgba(140, 81, 58, 0.3) 0%, rgba(205, 127, 50, 0.3) 50%, rgba(140, 81, 58, 0.3) 100%)",
      SILVER:
        "linear-gradient(135deg, rgba(156, 164, 179, 0.3) 0%, rgba(192, 192, 192, 0.3) 50%, rgba(156, 164, 179, 0.3) 100%)",
      GOLD: "linear-gradient(135deg, rgba(241, 166, 77, 0.3) 0%, rgba(255, 215, 0, 0.3) 50%, rgba(241, 166, 77, 0.3) 100%)",
      PLATINUM:
        "linear-gradient(135deg, rgba(75, 160, 172, 0.3) 0%, rgba(121, 206, 187, 0.3) 50%, rgba(75, 160, 172, 0.3) 100%)",
      DIAMOND:
        "linear-gradient(135deg, rgba(87, 107, 206, 0.3) 0%, rgba(185, 242, 255, 0.3) 50%, rgba(87, 107, 206, 0.3) 100%)",
      MASTER:
        "linear-gradient(135deg, rgba(157, 62, 181, 0.3) 0%, rgba(211, 125, 255, 0.3) 50%, rgba(157, 62, 181, 0.3) 100%)",
      GRANDMASTER:
        "linear-gradient(135deg, rgba(224, 69, 93, 0.3) 0%, rgba(255, 107, 136, 0.3) 50%, rgba(224, 69, 93, 0.3) 100%)",
      CHALLENGER:
        "linear-gradient(135deg, rgba(50, 200, 255, 0.3) 0%, rgba(153, 229, 255, 0.3) 50%, rgba(50, 200, 255, 0.3) 100%)",
    };
    return (
      gradients[tier] || "linear-gradient(135deg, #ffffff 0%, #f5f5f5 100%)"
    );
  };

  // 매치 정보를 보여주는 컴포넌트
  const MatchInfo = ({ matchId }) => {
    const [matchData, setMatchData] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
      const fetchMatchData = async () => {
        try {
          const res = await fetch(`/api/match/${matchId}`);
          if (!res.ok) throw new Error(`HTTP 오류: ${res.status}`);
          const data = await res.json();
          setMatchData(data);
        } catch (err) {
          console.error(`매치 데이터 로딩 오류 (${matchId}):`, err);
        } finally {
          setLoading(false);
        }
      };

      fetchMatchData();
    }, [matchId]);

    if (loading) return <div>로딩중...</div>;
    if (!matchData) return null;

    return (
      <div
        style={{
          padding: "10px",
          margin: "5px 0",
          backgroundColor: "rgba(255, 255, 255, 0.9)",
          borderRadius: "4px",
          fontSize: "0.9em",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
          <img
            src={`/champion-icons/${matchData.championName}.png`}
            alt={matchData.championName}
            style={{ width: "30px", height: "30px", borderRadius: "50%" }}
          />
          <div>
            <div>{matchData.championName}</div>
            <div
              style={{
                fontSize: "0.8em",
                color: matchData.win ? "#2196F3" : "#F44336",
              }}
            >
              {matchData.win ? "승리" : "패배"}
            </div>
          </div>
          <div style={{ marginLeft: "auto" }}>
            <div>
              {matchData.kills}/{matchData.deaths}/{matchData.assists}
            </div>
            <div style={{ fontSize: "0.8em" }}>
              딜량: {matchData.totalDamageDealtToChampions.toLocaleString()}
            </div>
          </div>
        </div>
      </div>
    );
  };

  if (loading) return <p>데이터 불러오는 중...</p>;
  if (error) return <p>오류 발생: {error}</p>;

  return (
    <div style={{ padding: "20px", fontFamily: "Arial" }}>
      <h1>🔹 6명의 유저 정보</h1>

      {users.map((user, index) => (
        <div key={index}>
          {/* 유저 기본 정보 카드 */}
          <div
            style={{
              border: "1px solid #ccc",
              padding: "15px",
              marginBottom: "10px",
              background: user.league
                ? `${getTierGradient(user.league.tier)}`
                : "#ffffff",
              opacity: 0.9,
              borderRadius: "8px",
              boxShadow: "0 4px 15px rgba(0,0,0,0.1)",
              color: "#000000",
              transition: "all 0.3s ease",
            }}
          >
            <h2>👤 {user.summonerName}</h2>
            {user.league && (
              <div>
                <h3>🏆 솔로 랭크</h3>
                <p>
                  <strong>티어:</strong> {user.league.tier} {user.league.rank}
                </p>
                <p>
                  <strong>LP:</strong> {user.league.leaguePoints} LP
                </p>
                <p>
                  <strong>승/패:</strong> {user.league.wins}승{" "}
                  {user.league.losses}패
                </p>
              </div>
            )}
          </div>

          {/* 최근 매치 정보 카드 */}
          <div
            style={{
              border: "1px solid #eee",
              padding: "15px",
              marginBottom: "20px",
              backgroundColor: "white",
              borderRadius: "8px",
              boxShadow: "0 2px 8px rgba(0,0,0,0.05)",
            }}
          >
            <h3>🕹️ 최근 매치</h3>
            {user.matches.length > 0 ? (
              user.matches.map((matchId) => (
                <MatchInfo key={matchId} matchId={matchId} />
              ))
            ) : (
              <p>⚠️ 매치 정보 없음</p>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}
