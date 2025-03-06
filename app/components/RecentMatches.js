const RecentMatches = ({ matches, puuid }) => {
  // ... 기존 코드 ...

  return (
    <div className={styles.matchesContainer}>
      {rankedMatches.map((matchId) => (
        <div
          key={matchId}
          className={styles.matchCard}
        >
          <MatchInfo matchId={matchId} puuid={puuid} />
        </div>
      ))}
    </div>
  );
}; 