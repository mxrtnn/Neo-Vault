export function arcadeDemoIndex({
  now,
  lastInput,
  count,
  index,
  blocked
}: {
  now: number
  lastInput: number
  count: number
  index: number
  blocked: boolean
}): number | null {
  if (blocked || count < 2 || now - lastInput < 45000) return null
  return (Math.max(0, index) + 1) % count
}

export function validArcadeVideo(name: string, bytes: number): boolean {
  return /\.(mp4|webm)$/i.test(name) && bytes > 0 && bytes <= 100 * 1024 * 1024
}
