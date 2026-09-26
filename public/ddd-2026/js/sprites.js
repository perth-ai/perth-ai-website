// Pixel-art sprites for Quokka Run, drawn from character maps so there are no
// image assets to license. Each character is one pixel; '.' is transparent.

const PALETTE = {
  o: '#2b1a10', // outline
  b: '#9c6b45', // fur
  h: '#c08d5f', // fur highlight
  l: '#ecd2a8', // cream face / belly
  e: '#0b0604', // eye
  w: '#ffffff', // eye shine
  p: '#e39a86', // inner ear
  n: '#120a06', // nose
  m: '#7b3fe4', // hallucination bug
  v: '#b28fef', // bug highlight
  k: '#232f52', // GPU board
  c: '#007195', // GPU chip
  a: '#5cd8ff', // GPU die
  i: '#c4c8d4', // GPU pins
  f: '#ff6b1a', // flame
  y: '#ffd23f', // flame core
};

const QUOKKA_TOP = [
  '............oo..oo..',
  '...........obpoobpo.',
  '...........obbbbbbo.',
  '..........obbbbbwebo',
  '..........obbbbbeebo',
  '.....ooooobbbbblllno',
  '...oobbbbbbbbbllllo.',
  '..obbhhbbbbbbbllool.',
  '.obbhhbbbbbbblllllo.',
  'obbbbbbbbbbbbllllo..',
  'obbbbbbbbbbbblllo...',
  '.obbbbbbbbbbbbbo....',
];

const LEGS = {
  run1: ['..obbbbbbbbbbbo.....', '...obbo...obbo......', '..obbo....obbo......', '..ooo.....oooo......'],
  run2: ['..obbbbbbbbbbbo.....', '....obbo.obbo.......', '....obbo.obbo.......', '....oooo.oooo.......'],
  jump: ['..obbbbbbbbbbbo.....', '.obbo.....obbbo.....', 'obo........obbbo....', 'oo..........oooo....'],
};

const BUG = [
  '....oooo....',
  '..oommmmoo..',
  '.ommvvmmmmo.',
  'omvwwmmwwmmo',
  'ommwemmmwemo',
  'ommmmmmmmmmo',
  'ommmmoommmmo',
  'ommmmmmmmmmo',
  'omomommomomo',
  'o.o.oo.o.o.o',
];

// A hallucination that's learned to fly: the bug with a spinning propeller.
const PROPELLERS = [
  ['.iiii..iiii.', '.....ii.....'],
  ['...iiiiii...', '.....ii.....'],
];

const GPU_BASE = [
  'oooooooooooo',
  'okkkkkkkkkko',
  'okccccccccko',
  'okcaaaaaacko',
  'okcaaaaaacko',
  'okccccccccko',
  'okkkkkkkkkko',
  'oioioioioioo',
];
const FLAMES = [
  ['..f.....f...', '.fyf...fyf..', '.fyyf.fyyff.', 'fyyyyfyyyyyf'],
  ['....f.....f.', '...fyf...fyf', '.ffyyf.fyyf.', 'fyyyyyfyyyyf'],
];

function build(rows) {
  const w = Math.max(...rows.map((r) => r.length));
  const canvas = document.createElement('canvas');
  canvas.width = w;
  canvas.height = rows.length;
  const ctx = canvas.getContext('2d');
  rows.forEach((row, y) =>
    [...row].forEach((ch, x) => {
      if (!PALETTE[ch]) return;
      ctx.fillStyle = PALETTE[ch];
      ctx.fillRect(x, y, 1, 1);
    })
  );
  return canvas;
}

let cache;

export function sprites() {
  cache ??= {
    run1: build([...QUOKKA_TOP, ...LEGS.run1]),
    run2: build([...QUOKKA_TOP, ...LEGS.run2]),
    jump: build([...QUOKKA_TOP, ...LEGS.jump]),
    bug: build(BUG),
    gpu: FLAMES.map((flame) => build([...flame, ...GPU_BASE])),
    drone: PROPELLERS.map((prop) => build([...prop, ...BUG])),
  };
  return cache;
}

// A still quokka as a data URL, for the home-screen tile.
export function quokkaIcon() {
  return sprites().run1.toDataURL();
}
