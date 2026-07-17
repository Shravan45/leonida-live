export default function AppIntro() {
  return (
    <div className="flex flex-col gap-2">
      <p className="text-sm text-white/70">
        Leonida Live is a real-time fan map for GTA6. Drop pins for in-game
        locations, easter eggs, and leaks, then upvote the ones worth
        checking out. Everyone browsing sees changes live.
      </p>
      <ul className="flex flex-col gap-1 text-sm text-white/60">
        <li>📍 Click anywhere on the map to drop a pin</li>
        <li>🏷️ Tag it as a Location, Easter Egg, Leak, or Other</li>
        <li>👍 Upvote pins you find useful</li>
        <li>🟢 See how many people are exploring live</li>
      </ul>
    </div>
  );
}
