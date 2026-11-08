export const consoleImages: Record<string, { url: string; source: string }> = {
  ps1: image('9/95', 'PSX-Console-wController.png'),
  nes: {
    url: 'https://upload.wikimedia.org/wikipedia/commons/b/b2/NES-Console-Set.png',
    source: 'https://commons.wikimedia.org/wiki/File:NES-Console-Set.png'
  },
  gb: image('7/7c', 'Game-Boy-FL.png'),
  arcade: {
    url: 'https://upload.wikimedia.org/wikipedia/commons/3/3f/Donkey_Kong_arcade_at_the_QuakeCon_2005.png',
    source: 'https://commons.wikimedia.org/wiki/File:Donkey_Kong_arcade_at_the_QuakeCon_2005.png'
  },
  snes: image('3/36', 'SNES-Mod1-Console-Set.png'),
  n64: image('0/02', 'N64-Console-Set.png'),
  nds: image('5/56', 'Nintendo-DS-Lite-Black-Open.png'),
  genesis: image('2/26', 'Sega-Genesis-Mod1-Set.png'),
  atari: image('0/02', 'Atari-2600-Wood-4Sw-Set.png')
}

function image(path: string, file: string): { url: string; source: string } {
  return {
    url: `https://thumb.wikimedia.org/wikipedia/commons/thumb/${path}/${file}/960px-${file}`,
    source: `https://commons.wikimedia.org/wiki/File:${file}`
  }
}
