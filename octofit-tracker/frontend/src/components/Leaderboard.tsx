import { CapabilityCard } from './CapabilityCard.js';

type LeaderboardEntry = { teamName: string; totalPoints: number; rank: number };

export default function Leaderboard() {
  return <CapabilityCard<LeaderboardEntry>
    title="Leaderboard"
    description="Compare team point totals."
    path="/api/leaderboard"
    collection="leaderboard"
    emptyMessage="No leaderboard rankings yet."
    renderItem={(entry) => <><strong>#{entry.rank} {entry.teamName}</strong><span>: {entry.totalPoints} points</span></>}
  />;
}
