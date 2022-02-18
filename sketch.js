// jshint esversion: 10

let $ = (query='') => document.querySelector(query)

let c = $('canvas')
let ctx = c.getContext('2d')
c.width = c.height = 256

const hash = ((size) => {
  const table = [...Array(size)].map(e => [...Array(size)].map(e => Math.random()))
  return (x, y) => table[(0|x)%size][(0|y)%size]
})(16)

class Element {
  constructor() {
    this.empty = true
  }
  color() {
    return [ 0, 0, 0, 255 ]
  }
  do(x, y, world) { return world }
}

class Solid extends Element {
  constructor() {
    super()
    this.empty = false
    this.xv = 0
    this.yv = 0
  }
}

class Wall extends Solid {
  constructor() {
    super()
  }
  color(x, y) {
    let r = hash(x, y)
    return [ 0|(16+32*r), 0|(16+32*r), 0|(16+32*r), 255 ]
  }
}

class Sand extends Solid {
  constructor() {
    super()
  }
  do(x, y, world) {
    if (world[x][y+1].empty) {
      world[x][y] = new Element()
      world[x][y+1] = new Sand()
      return world
    }
    let side = Math.random() < 0.5 ? -1 : 1
    if (x+side > -1 && x+side < c.width && world[x+side][y+1].empty) {
      world[x][y] = new Element()
      world[x+side][y+1] = new Sand()
    }
    return world
  }
  color(x, y) {
    let r = hash(x, y)
    // 209,183,157
    return [ 209 + r*(253-209), 183 + r*(227-183), 157 + r*(197-157), 255 ]
  }
}

let world = [...Array(c.width)].map((e, x) => [...Array(c.height)].map((e, y) => {
  if (x == 0 || x == c.width-1) return new Wall()
  if (y == 0 || y == c.height-1) return new Wall()
  return new Element()
}));

// Thanks to DavidMcLaughlin208! (found via https://youtu.be/5Ka3tbbT-9E)
// https://gist.github.com/DavidMcLaughlin208/60e69e698e3858617c322d80a8f174e2
function iterateAndApplyMethodBetweenTwoPoints(x1, y1, x2, y2, func) {
  // If the two points are the same no need to iterate. Just run the provided function
  if (x1 == x2 && y1 == y2) {
    func(x1, y1);
    return;
  }

  const xDiff = x1 - x2;
  const yDiff = y1 - y2;
  const xDiffIsLarger = Math.abs(xDiff) > Math.abs(yDiff);

  const xModifier = xDiff < 0 ? 1 : -1;
  const yModifier = yDiff < 0 ? 1 : -1;

  const longerSideLength = Math.max(Math.abs(xDiff), Math.abs(yDiff));
  const shorterSideLength = Math.min(Math.abs(xDiff), Math.abs(yDiff));
  const slope = (shorterSideLength == 0 || longerSideLength == 0) ? 0 : (shorterSideLength / longerSideLength);

  let shorterSideIncrease;
  for (let i = 1; i <= longerSideLength; i++) {
    shorterSideIncrease = Math.round(i * slope);
    let yIncrease, xIncrease;
    if (xDiffIsLarger) {
      xIncrease = i;
      yIncrease = shorterSideIncrease;
    } else {
      yIncrease = i;
      xIncrease = shorterSideIncrease;
    }
    let currentY = y1 + (yIncrease * yModifier);
    let currentX = x1 + (xIncrease * xModifier);
    func(currentX, currentY);
  }
}

class MouseState {
  constructor({ down=(()=>{}), up=(()=>{}), move=(()=>{}), tick=(()=>{}), cursor='default' }={}) {
    this.cursor = cursor;
    this.down = down;
    this.up = up;
    this.move = move;
    this.tick = tick;
  }
}

const paint = () => {
  let bounds = c.getBoundingClientRect()
  const X1 = 0|((c.width * mouse.lastx-bounds.x) / bounds.width)
  const Y1 = 0|((c.height * mouse.lasty-bounds.y) / bounds.height)
  const X2 = 0|((c.width * mouse.x-bounds.x) / bounds.width)
  const Y2 = 0|((c.height * mouse.y-bounds.y) / bounds.height)
  iterateAndApplyMethodBetweenTwoPoints(X1, Y1, X2, Y2, (x, y) => {
    let brushSize = 3
    for (let X = x - brushSize; X < x + brushSize; X++) {
      for (let Y = y - brushSize; Y < y + brushSize; Y++) {
        if (X < 0 || X >= c.width) continue
        if (Y < 0 || Y >= c.height) continue
        if (world[X][Y].empty) world[X][Y] = new Sand()
      }
    }
  })
}

let mouse = {
  state: 'normal',
  x: 0, y: 0,
  lastx: 0, lasty: 0,
  down: false,
  states: {
    normal: new MouseState({
      down() { mouse.state = 'drawing' }
    }),
    drawing: new MouseState({
      move: paint,
      tick: paint,
      up() { mouse.state = 'normal' }
    })
  }
}

c.addEventListener("mousemove", e => {
  mouse.lastx = mouse.x; mouse.lasty = mouse.y;
  mouse.x = e.pageX; mouse.y = e.pageY;
  mouse.states[mouse.state].move();
});
c.addEventListener("mousedown", e => {
  mouse.down = true;
  mouse.states[mouse.state].down();
});
c.addEventListener("mouseup", e => {
  mouse.down = false;
  mouse.states[mouse.state].up();
});

const particles = {
  0: { // AIR
    do(x, y, world) {},
    color() {
      return [ 0, 0, 0, 255 ]
    },
  },
  1: { // STONE
    do(x, y, world) {},
    color() {
      return [ 128, 128, 128, 255 ]
    },
  },
  2: { // SAND
    do(x, y, world) {
      let next = world
      let first = Math.random()<0.5?-1:1
      if (next[x][y+1] == 0) {
        next[x][y+1] = 2
        next[x][y] = 0
        return
      }
      if (x+first > -1 && x+first < c.width && next[x+first][y+1] == 0) {
        next[x+first][y+1] = 2
        next[x][y] = 0
      }
    },
    color(x, y) {
      let r = hash(x, y)
      return [ 255, 0|(255-r*255/8), 0, 255 ]
    }
  }
}

function shuffle(a,b,c,d){//array,placeholder,placeholder,placeholder
  c=a.length;while(c)b=Math.random()*c--|0,d=a[c],a[c]=a[b],a[b]=d
}

(async () => {
  while (true) {
    
    let pixels = ctx.getImageData(0, 0, c.width, c.height)
    
    for (let x = 0; x < c.width; x++) {
      for (let y = 0; y < c.height; y++) {
        let i = 4*(x + y*c.width)
        let col = world[x][y].color(x, y)
        pixels.data[i + 0] = col[0]
        pixels.data[i + 1] = col[1]
        pixels.data[i + 2] = col[2]
        pixels.data[i + 3] = col[3]
      }
    }
    ctx.putImageData(pixels, 0, 0)
    
    mouse.states[mouse.state].tick();
    
    let coords = [...Array(c.width * c.height)].map((e, i) => ({ x: i%c.width, y: 0|(i/c.width) }))
    shuffle(coords)
    for (let {x, y} of coords) {
      world = world[x][y].do(x, y, world)
    }
    
    await new Promise(requestAnimationFrame)
  }
})()

