import source from './arcade-catalog.json'
export interface ArcadeGame {
  id: string
  title: string
  year: string
  manufacturer: string
  cloneOf: string
  status: string
  saveStates: boolean
  romless: boolean
}
export const arcadeVersion = source.version
export const arcadeGames = source.games as ArcadeGame[]
export const arcadeByTitle = new Map(arcadeGames.map((game) => [game.title, game]))
export const arcadeById = new Map(arcadeGames.map((game) => [game.id, game]))
export const officialArcadePages: Record<string, string> = {
  gridlee: 'https://www.mamedev.org/roms/gridlee/',
  robby: 'https://www.mamedev.org/roms/robby/',
  circus: 'https://www.mamedev.org/roms/circus/',
  robotbwl: 'https://www.mamedev.org/roms/robotbwl/',
  carpolo: 'https://www.mamedev.org/roms/carpolo/',
  sidetrac: 'https://www.mamedev.org/roms/sidetrac/',
  ripcord: 'https://www.mamedev.org/roms/ripcord/',
  crash: 'https://www.mamedev.org/roms/crash/',
  targ: 'https://www.mamedev.org/roms/targ/',
  spectar: 'https://www.mamedev.org/roms/spectar/'
}
