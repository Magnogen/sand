// jshint esversion: 10

let $ = (query='') => document.querySelector(query)

let c = $('canvas')
let ctx = c.getContext('2d')
c.width = c.height = 256

const hash = ((size) => {
  const table = [...Array(size)].map(e => [...Array(size)].map(e => Math.random()))
  return (x, y) => table[(0|x)%size][(0|y)%size]
})(16)

class Empty {
  constructor() {
    this.empty = true
  }
  color() {
    return [ 0, 0, 0, 255 ]
  }
  do(x, y, world) { return world }
}

class Element extends Empty { constructor() { super(); this.empty = false; } }

class Wall extends Element {
  constructor() {
    super()
  }
  color(x, y) {
    let r = hash(x, y)
    return [ 0|(16+32*r), 0|(16+32*r), 0|(16+32*r), 255 ]
  }
}

class Sand extends Element {
  constructor(x, y) {
    super(x, y)
    this.isFreeFalling = false
    this.inertialResistance = 0.9
    let r = hash(x, y)
    r = (Math.sin((performance.now()/500 + Math.random()/24) * Math.PI)+2)/3
    this.col = [ 209 + r*(253-209), 183 + r*(227-183), 157 + r*(197-157), 255 ]
  }
  do(x, y, world) {
    if (this.isFreeFalling) {
      if (world[x-1][y] instanceof Sand) world[x-1][y].isFreeFalling = true
      if (world[x+1][y] instanceof Sand) world[x+1][y].isFreeFalling = true
    }
    if (world[x][y+1].empty) {
      this.isFreeFalling = true
      world.swap(x, y, x, y+1)
      return world
    } else if (this.isFreeFalling) {
      const side = Math.random() < 0.5 ? -1 : 1
      if (world.inside(x+side, y) && world[x+side][y+1].empty) {
        this.isFreeFalling = true
        world.swap(x, y, x+side, y+1)
      }
    }
    return world
  }
  color(x, y) {
    // let r = hash(x, y)
    // // 209,183,157
    // return [ 209 + r*(253-209), 183 + r*(227-183), 157 + r*(197-157), 255 ]
    return this.col
  }
}
  
class Water extends Element {
  constructor(x, y) {
    super(x, y)
    this.dispersionRate = 2
    this.col = [ 64, 64, 255, 255 ]
  }
  do(x, y, world) {
    if (world[x][y+1].empty) {
      world.swap(x, y, x, y+1)
      return
    }
    let X = x, Y = y
    for (let i = 1; i <= this.dispersionRate; i++) {
      const side = Math.random() < 0.5 ? -1 : 1
      if (world.inside(x+i*side, y+1) && world[x+i*side][y+1].empty) {
        X = x+i*side
        Y = y+1
        continue
      }
      if (world.inside(x-i*side, y+1) && world[x-i*side][y+1].empty) {
        X = x-i*side
        Y = y+1
        continue
      }
      if (world.inside(x+i*side, y) && world[x+i*side][y].empty) {
        X = x+i*side
        continue
      }
      if (world.inside(x-i*side, y) && world[x-i*side][y].empty) {
        X = x-i*side
        continue
      }
      break
    }
    world.swap(X, Y, x, y)
  }
  color(x, y) { return this.col }
}

let world = [...Array(c.width)].map((e, x) => [...Array(c.height)].map((e, y) => {
  if (x == 0 || x == c.width-1) return new Wall()
  if (y == 0 || y == c.height-1) return new Wall()
  return new Empty()
}));

world.changes = []
world.changemap = [...Array(c.width)].map(e => [...Array(c.height)].map(e => false))
world.clearChanges = function () {
  for (let i of world.changes) {
    this.changemap[i%c.width][0|i/c.width] = false
  }
  this.changes = []
}
world.change = function (x, y) {
  if (this.changemap[x][y]) return;
  this.changes.push(x + y * c.width);
  this.changemap[x][y] = true
}
world.get = function (x, y) { return this[x][y] }
world.swap = function (x1, y1, x2, y2) {
  this.change(x1, y1); this.change(x2, y2);
  [this[x1][y1], this[x2][y2]] = [this[x2][y2], this[x1][y1]]
}
world.set = function (x, y, now) {
  this.change(x, y);
  this[x][y] = now
}
world.inside = function (x, y) {
  return x > -1 && x < c.width && y > -1 && y < c.height
}

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
        if (world[X][Y].empty) world.set(X, Y, new Sand(X, Y))
      }
    }
  })
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

function shuffle(a,b,c,d){//array,placeholder,placeholder,placeholder
  c=a.length;while(c)b=Math.random()*c--|0,d=a[c],a[c]=a[b],a[b]=d
}

(async () => {
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
  
  let coords = [...Array(c.width * c.height)].map((e, i) => ({ x: i%c.width, y: 0|(i/c.width) }))
  while (true) {
    let pixels = ctx.getImageData(0, 0, c.width, c.height)
    for (let i of world.changes) {
      const x = i%c.width,
            y = 0|i/c.width
      let col = world[x][y].color(x, y)
      pixels.data[4*i + 0] = col[0]
      pixels.data[4*i + 1] = col[1]
      pixels.data[4*i + 2] = col[2]
    }
    world.clearChanges()
    ctx.putImageData(pixels, 0, 0)
    
    mouse.states[mouse.state].tick();
    
    shuffle(coords)
    for (let {x, y} of coords) {
      world[x][y].do(x, y, world)
    }
    
    await new Promise(requestAnimationFrame)
  }
})()

