import GameArtwork from './GameArtwork'
export default function GamePreview({
  systemId,
  game
}: {
  systemId: string
  game: string
}): React.JSX.Element {
  return (
    <div className="game-preview">
      <GameArtwork key={`${systemId}:${game}`} systemId={systemId} game={game} />
      <span className="crt-scanlines" aria-hidden="true" />
      <span className="preview-label">NEO-VAULT / PREVIEW</span>
    </div>
  )
}
