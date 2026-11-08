export type MediaKind = 'box' | 'snap' | 'title'
export interface MediaManifest {
  repository: string
  games: Record<string, Partial<Record<MediaKind, boolean>>>
}
export interface MediaCandidate {
  url: string
  name: string
  kind: MediaKind
  alternative: boolean
}
export function cleanMediaName(title: string): string {
  return title.replace(/[&*/:`<>?\\|]/g, '_')
}
function baseName(name: string): string {
  return name
    .replace(/(?:\s+\([^)]*\))+$/, '')
    .trim()
    .toLocaleLowerCase()
}
const prepared = new WeakMap<
  MediaManifest,
  { names: Map<string, string>; groups: Map<string, string[]> }
>()
function prepare(manifest: MediaManifest): {
  names: Map<string, string>
  groups: Map<string, string[]>
} {
  const cached = prepared.get(manifest)
  if (cached) return cached
  const names = new Map<string, string>()
  const groups = new Map<string, string[]>()
  for (const name of Object.keys(manifest.games)) {
    names.set(name.toLocaleLowerCase(), name)
    const base = baseName(name)
    const list = groups.get(base) ?? []
    list.push(name)
    groups.set(base, list)
  }
  const value = { names, groups }
  prepared.set(manifest, value)
  return value
}
export function resolveMedia(
  manifest: MediaManifest,
  game: string,
  preferred: MediaKind
): MediaCandidate[] {
  const exact = cleanMediaName(game)
  const lookup = prepare(manifest)
  let name = Object.hasOwn(manifest.games, exact)
    ? exact
    : (lookup.names.get(exact.toLocaleLowerCase()) ?? '')
  if (
    !name &&
    manifest.repository === 'MAME' &&
    exact === 'Pong (Rev E)' &&
    Object.hasOwn(manifest.games, 'Pong (Rev E) external [TTL]')
  )
    name = 'Pong (Rev E) external [TTL]'
  if (!name) {
    const base = baseName(exact)
    const region = exact.match(/\((USA|Europe|Japan)\)/)?.[1]
    const matches = [...(lookup.groups.get(base) ?? [])]
    matches.sort((a, b) => {
      const score = (value: string): number =>
        region && value.includes(`(${region})`)
          ? 0
          : value.includes('(USA)')
            ? 1
            : value.includes('(Europe)')
              ? 2
              : 3
      return score(a) - score(b) || a.localeCompare(b)
    })
    name = matches[0] ?? ''
  }
  if (!name) return []
  const kinds: MediaKind[] = [
    preferred,
    ...(['snap', 'box', 'title'] as MediaKind[]).filter((kind) => kind !== preferred)
  ]
  const folders = { snap: 'Named_Snaps', box: 'Named_Boxarts', title: 'Named_Titles' }
  return kinds
    .filter((kind) => manifest.games[name][kind])
    .map((kind) => ({
      name,
      kind,
      alternative: name.toLocaleLowerCase() !== exact.toLocaleLowerCase(),
      url: `https://raw.githubusercontent.com/libretro-thumbnails/${manifest.repository}/master/${folders[kind]}/${encodeURIComponent(name)}.png`
    }))
}
