// jshint esversion: 10

let $ = (query='') => document.querySelector(query)

let c = $('canvas')
let ctx = c.getContext('2d')
c.width = c.height = 0|(256*0.8)

const hash = ((size) => {
  const table = [...Array(size)].map(e => [...Array(size)].map(e => Math.random()))
  return (x, y) => table[(0|x)%size][(0|y)%size]
})(16)

const Elem = {
  Air:     Symbol.for('net.magnogen:air'),
  Wall:    Symbol.for('net.magnogen:wall'),
  Sand:    Symbol.for('net.magnogen:sand'),
  Dirt:    Symbol.for('net.magnogen:dirt'),
  Stone:   Symbol.for('net.magnogen:stone'),
  Water:   Symbol.for('net.magnogen:water'),
  Lava:    Symbol.for('net.magnogen:lava'),
  Steam:   Symbol.for('net.magnogen:steam'),
  Fire:    Symbol.for('net.magnogen:fire'),
  Sawdust: Symbol.for('net.magnogen:sawdust'),
}

let Paint = Elem.Sand
let brushSize = 7

function makeType(type) {
  return {
    type,
    is(...types) {
      for (let type of types)
        if (type == this.type) return true;
      return false;
    }
  }
}

const Make = {
  [Elem.Air]  (x, y) { return { type: makeType(Elem.Air) } },
  [Elem.Wall] (x, y) { return { type: makeType(Elem.Wall), char: 1 } },
  [Elem.Sand] (x, y) {
    let col = hash(x, y)
    col = (Math.sin((performance.now()/500 + Math.random()/24) * Math.PI)+2)/3
    col = [ 209 + col*(253-209), 183 + col*(227-183), 157 + col*(197-157), 255 ]
    let friction = 0|(Math.random() * 1 + 0.667)
    return { type: makeType(Elem.Sand), col, friction }
  },
  [Elem.Dirt] (x, y) {
    let col = hash(x, y)
    col = (Math.sin((performance.now()/500 + Math.random()/24) * Math.PI)+2)/3
    // 105, 61, 36
    // 130, 81, 53
    col = [ 105 + col*(130-105), 61 + col*(81-61), 36 + col*(53-36), 255 ]
    let friction = 0|(Math.random() * 3 + 1)
    return { type: makeType(Elem.Dirt), col, friction }
  },
  [Elem.Stone] (x, y) {
    let col = hash(x, y)
    col = (Math.sin((performance.now()/500 + Math.random()/24) * Math.PI)+2)/3
    // 142, 181, 189
    // 109, 137, 143
    col = [ 122 + col*(99-122), 161 + col*(127-161), 169 + col*(133-169), 255 ]
    let friction = 0|(Math.random() * 8 + 2)
    return { type: makeType(Elem.Stone), col, friction }
  },
  [Elem.Water] (x, y) {
    let col = hash(x, y)
    col = performance.now()/500 + Math.random()/24
    return { type: makeType(Elem.Water), col }
  },
  [Elem.Lava] (x, y) {
    let col = hash(x, y)
    col = performance.now()/500 + Math.random()/24
    return { type: makeType(Elem.Lava), col }
  },
  [Elem.Steam] (x, y) {
    let col = hash(x, y)
    col = performance.now()/500 + Math.random()/24
    return { type: makeType(Elem.Steam), col: [255, 255, 255, 255] }
  },
  [Elem.Fire] (x, y) {
    let col = hash(x, y)
    // 217, 133, 37
    // 255, 201, 25
    col = [ 217 + col*(255-217), 65 + col*(133-65), 37 + col*(25-37), 255 ]
    let age = 4 + 0|(Math.random() * 24)
    return { type: makeType(Elem.Fire), col, age }
  },
  [Elem.Sawdust] (x, y) {
    let col = hash(x, y)
    // 191, 133, 67
    // 219, 161, 75
    col = [ 191 + col*(219-191), 133 + col*(161-133), 67 + col*(75-67), 255 ]
    let friction = Math.random() < 0.5 ? 0 : 1
    return { type: makeType(Elem.Sawdust), col, friction }
  }
}

const Colour = {
  [Elem.Air]   (el, x, y)  { return [0, 0, 0, 255] },
  [Elem.Wall]  (el, x, y)  {
    let r = hash(x, y);
    return [ 0|((64+32*r)*(el.char)), 0|((64+32*r)*(el.char)), 0|((64+32*r)*(el.char)), 255 ];
  },
  [Elem.Sand]  (el, x, y)  { return el.col },
  [Elem.Dirt]  (el, x, y)  { return el.col },
  [Elem.Stone] (el, x, y)  { return el.col },
  [Elem.Water] (el, x, y) {
    const col = (Math.sin((performance.now()/40 + el.col) * Math.PI)+2)/3
    // 127, 155, 219
    // 89, 121, 194
    return [ 127 + col*(89-127), 155 + col*(121-155), 219 + col*(194-219), 255 ]
  },
  [Elem.Lava] (el, x, y) {
    const col = (Math.sin((performance.now()/40 + el.col) * Math.PI)+2)/3
    // 168, 50, 56
    // 181, 66, 40
    return [ 168 + col*(181-168), 50 + col*(66-50), 56 + col*(40-56), 255 ]
  },
  [Elem.Steam] (el, x, y)  { return el.col },
  [Elem.Fire]  (el, x, y)  { return el.col },
  [Elem.Sawdust] (el, x, y)  { return el.col },
}

const Rule = {
  [Elem.Air]   (x, y, world) {},
  [Elem.Wall]  (x, y, world) {
    let X = x, Y = y;
    if (Math.random() < 0.5) X += Math.random()<0.5 ? 1 : -1;
    else Y += Math.random()<0.5 ? 1 : -1;
    if (world.inside(X, Y)) {
      if (world[X][Y].type.is(Elem.Fire, Elem.Lava)) world[x][y].char *= 0.975
      if (world[X][Y].type.is(Elem.Wall) && world[X][Y].char + 0.1 < world[x][y].char) world[x][y].char *= 0.95
    }
    world[x][y].char = Math.max(0.5, 1-0.9975*(1-world[x][y].char))
    if (Math.random() < 0.5) world.change(x, y)
  },
  [Elem.Sand]  (x, y, world) {
    const side = Math.random() < 0.5 ? -1 : 1
    let f = world[x][y+1].friction
    if (world[x+side][y].type.is(Elem.Water) && Math.random() < 0.8) f = 0;
    if (world[x][y+1].type.is(Elem.Air, Elem.Water, Elem.Steam))
      world.swap(x, y, x, y+1)
    else if (world.inside(x+side, y+f) && world[x+side][y+f].type.is(Elem.Air, Elem.Water, Elem.Steam))
      if (world.inside(x+side, y) && world[x+side][y].type.is(Elem.Air, Elem.Water, Elem.Steam))
        world.swap(x, y, x+side, y)
    else if (world.inside(x-side, y+f) && world[x-side][y+f].type.is(Elem.Air, Elem.Water, Elem.Steam))
      if (world.inside(x-side, y) && world[x-side][y].type.is(Elem.Air, Elem.Water, Elem.Steam))
        world.swap(x, y, x-side, y)
  },
  [Elem.Dirt]  (x, y, world) {
    const side = Math.random() < 0.5 ? -1 : 1
    const f = world[x][y].friction
    if (world[x][y+1].type.is(Elem.Air, Elem.Water, Elem.Steam))
      world.swap(x, y, x, y+1)
    else if (world.inside(x+side, y+f) && world[x+side][y+f].type.is(Elem.Air, Elem.Water, Elem.Steam))
      if (world.inside(x+side, y) && world[x+side][y].type.is(Elem.Air, Elem.Water, Elem.Steam))
        world.swap(x, y, x+side, y)
    else if (world.inside(x-side, y+f) && world[x-side][y+f].type.is(Elem.Air, Elem.Water, Elem.Steam))
      if (world.inside(x-side, y) && world[x-side][y].type.is(Elem.Air, Elem.Water, Elem.Steam))
        world.swap(x, y, x-side, y)
  },
  [Elem.Stone] (x, y, world) {
    const side = Math.random() < 0.5 ? -1 : 1
    const f = world[x][y].friction
    if (world[x][y+1].type.is(Elem.Air, Elem.Water, Elem.Steam))
      world.swap(x, y, x, y+1)
    else if (world.inside(x+side, y+f) && world[x+side][y+f].type.is(Elem.Air, Elem.Water, Elem.Steam))
      if (world.inside(x+side, y) && world[x+side][y].type.is(Elem.Air, Elem.Water, Elem.Steam))
        world.swap(x, y, x+side, y)
    else if (world.inside(x-side, y+f) && world[x-side][y+f].type.is(Elem.Air, Elem.Water, Elem.Steam))
      if (world.inside(x-side, y) && world[x-side][y].type.is(Elem.Air, Elem.Water, Elem.Steam))
        world.swap(x, y, x-side, y)
  },
  [Elem.Water] (x, y, world) {
    let X = x, Y = y;
    if (Math.random() < 0.5) X += Math.random()<0.5 ? 1 : -1;
    else Y += Math.random()<0.5 ? 1 : -1;
    if (world.inside(X, Y) && world[X][Y].type.is(Elem.Fire)) {
      world.set(x, y, Make[Elem.Steam](x, y))
      world.set(X, Y, Make[Elem.Air](X, Y))
      return
    }
    if (world[x][y+1].type.is(Elem.Air, Elem.Steam))
      world.swap(x, y, x, y+1)
    const side = Math.random() < 0.5 ? -1 : 1
    if (world.inside(x+side, y+1) && world[x+side][y+1].type.is(Elem.Air, Elem.Steam))
      world.swap(x, y, x+side, y+1)
    else if (world.inside(x-side, y+1) && world[x-side][y+1].type.is(Elem.Air, Elem.Steam))
      world.swap(x, y, x-side, y+1)
    else if (world.inside(x+side, y) && world[x+side][y].type.is(Elem.Air, Elem.Steam))
      world.swap(x, y, x+side, y)
    else if (world.inside(x-side, y) && world[x-side][y].type.is(Elem.Air, Elem.Steam))
      world.swap(x, y, x-side, y)
  },
  [Elem.Lava] (x, y, world) {
    if (world.inside(x, y-1) && world[x][y-1].type.is(Elem.Air)) {
      world.set(x, y-1, Make[Elem.Fire](x, y-1))
    }
    let X = x, Y = y;
    if (Math.random() < 0.5) X += Math.random()<0.5 ? 1 : -1;
    else Y += Math.random()<0.5 ? 1 : -1;
    if (world.inside(X, Y) && world[X][Y].type.is(Elem.Water)) {
      world.set(x, y, Make[Elem.Stone](x, y))
      world.set(X, Y, Make[Elem.Steam](X, Y))
      return
    }
    if (world[x][y+1].type.is(Elem.Air, Elem.Steam, Elem.Fire))
      world.swap(x, y, x, y+1)
    if (Math.random() < 0.333) return
    const side = Math.random() < 0.5 ? -1 : 1
    if (world.inside(x+side, y) && world[x+side][y].type.is(Elem.Air, Elem.Steam))
      world.swap(x, y, x+side, y)
    else if (world.inside(x-side, y) && world[x-side][y].type.is(Elem.Air, Elem.Steam))
      world.swap(x, y, x-side, y)
  },
  [Elem.Steam] (x, y, world) {
    if (Math.random() < 0.0001) {
      world.set(x, y, Make[Elem.Water](x, y));
      return
    }
    const side = Math.random() < 0.5 ? -1 : 1
    if (world.inside(x+2*side, y-1) && world[x+2*side][y-1].type.is(Elem.Air))
      world.swap(x, y, x+2*side, y-1)
    else if (world.inside(x-2*side, y-1) && world[x-2*side][y-1].type.is(Elem.Air))
      world.swap(x, y, x-2*side, y-1)
    else if (world.inside(x+side, y) && world[x+side][y].type.is(Elem.Air))
      world.swap(x, y, x+side, y)
    else if (world.inside(x-side, y) && world[x-side][y].type.is(Elem.Air))
      world.swap(x, y, x-side, y)
  },
  [Elem.Fire]  (x, y, world) {
    if (world.get(x, y).age <= 0) world.set(x, y, Make[Elem.Air](x, y));
    else {
      world[x][y].age--;
      let side = Math.random() < 0.5 ? -1 : 1
      if (Math.random() < 0.6) side = 0;
      if (world.inside(x+side, y-1) && world[x+side][y-1].type.is(Elem.Air, Elem.Steam))
        world.swap(x, y, x+side, y-1)
    }
  },
  [Elem.Sawdust]  (x, y, world) {
    let dx=0, dy=0;
    if (Math.random() < 0.5) dx = Math.random()<0.5 ? 1 : -1;
    else dy = Math.random()<0.5 ? 1 : -1;
    // if (world.inside(X, Y) && world[X][Y].type.is(Elem.Fire, Elem.Lava)) {
    //   world.set(x, y, Make[Elem.Fire](x, y))
    //   return
    // }
    if (world.inside(x+dx, y+dy) && world[x+dx][y+dy].type.is(Elem.Fire, Elem.Lava)) {
      world.set(x, y, Make[Elem.Fire](x, y))
      return
    }
    if (world.inside(x-dx, y-dy) && world[x-dx][y-dy].type.is(Elem.Fire, Elem.Lava)) {
      world.set(x, y, Make[Elem.Fire](x, y))
      return
    }
    const side = Math.random() < 0.5 ? -1 : 1
    let f = world[x][y+1].friction
    if (world[x+side][y].type.is(Elem.Water) && Math.random() < 0.8) f = 0;
    if (world[x][y+1].type.is(Elem.Air, Elem.Water))
      world.swap(x, y, x, y+1)
    else if (world.inside(x+side, y+f) && world[x+side][y+f].type.is(Elem.Air, Elem.Water, Elem.Steam))
      if (world.inside(x+side, y) && world[x+side][y].type.is(Elem.Air, Elem.Water, Elem.Steam))
        world.swap(x, y, x+side, y)
    else if (world.inside(x-side, y+f) && world[x-side][y+f].type.is(Elem.Air, Elem.Water, Elem.Steam))
      if (world.inside(x-side, y) && world[x-side][y].type.is(Elem.Air, Elem.Water, Elem.Steam))
        world.swap(x, y, x-side, y)
  },
}

$('select#paint').addEventListener('change', e => {
  Paint = Elem[e.target.value];
})

let world = [...Array(c.width)].map((e, x) => [...Array(c.height)].map((e, y) => {
  if (x == 0 || x == c.width-1) return Make[Elem.Wall](x, y)
  if (y == 0 || y == c.height-1) return Make[Elem.Wall](x, y)
  return Make[Elem.Air](x, y)
}));

world.changes = []
world.changemap = [...Array(c.width)].map(e => [...Array(c.height)].map(e => false))
world.clearChanges = function () {
  for (let i of world.changes)
    this.changemap[i%c.width][0|i/c.width] = false
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
    const currentY = y1 + (yIncrease * yModifier);
    const currentX = x1 + (xIncrease * xModifier);
    const res = func(currentX, currentY);
    if (res == 'stop') break
  }
}

const paint = () => {
  let bounds = c.getBoundingClientRect()
  const X1 = 0|((c.width * mouse.lastx-bounds.x) / bounds.width)
  const Y1 = 0|((c.height * mouse.lasty-bounds.y) / bounds.height)
  const X2 = 0|((c.width * mouse.x-bounds.x) / bounds.width)
  const Y2 = 0|((c.height * mouse.y-bounds.y) / bounds.height)
  iterateAndApplyMethodBetweenTwoPoints(X1, Y1, X2, Y2, (x, y) => {
    for (let X = x - (brushSize>>1); X <= x + (brushSize>>1); X++) {
      for (let Y = y - (brushSize>>1); Y <= y + (brushSize>>1); Y++) {
        if (X < 0 || X >= c.width) continue
        if (Y < 0 || Y >= c.height) continue
        if (X*X + Y*Y < brushSize) continue
        if (world[X][Y].type.is(Elem.Air) || (Paint == Elem.Air && X > 0 && X < c.width-1 && Y > 0 && Y < c.height-1)) {
          world.set(X, Y, Make[Paint](X, Y))
        }
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

c.addEventListener("mousedown", e => {
  mouse.down = true;
  mouse.states[mouse.state].down();
});
c.addEventListener("mouseup", e => {
  mouse.down = false;
  mouse.states[mouse.state].up();
});
c.addEventListener("mousemove", e => {
  mouse.lastx = mouse.x; mouse.lasty = mouse.y;
  mouse.x = e.offsetX; mouse.y = e.offsetY;
  mouse.states[mouse.state].move();
});

c.addEventListener('touchstart', e => {
  e.preventDefault();
  mouse.lastx = mouse.x; mouse.lasty = mouse.y;
  mouse.x = e.touches[0].clientX; mouse.y = e.touches[0].clientY;
  mouse.states[mouse.state].down();
});
c.addEventListener('touchend', e => {
  e.preventDefault();
  mouse.down = false;
  mouse.states[mouse.state].up();
});
c.addEventListener('touchcancel', e => {
  console.log(e)
});
c.addEventListener('touchmove', e => {
  e.preventDefault();
  mouse.lastx = mouse.x; mouse.lasty = mouse.y;
  mouse.x = e.touches[0].clientX; mouse.y = e.touches[0].clientY;
  mouse.states[mouse.state].move();
});

function shuffle(a,b,c,d){//array,placeholder,placeholder,placeholder
  c=a.length;while(c)b=Math.random()*c--|0,d=a[c],a[c]=a[b],a[b]=d
}

function drawWorld() {
  let pixels = ctx.getImageData(0, 0, c.width, c.height)
  for (let i of world.changes) {
    const x = i%c.width,
          y = 0|i/c.width
    const col = Colour[world[x][y].type.type](world[x][y], x, y)
    pixels.data[4*i + 0] = col[0]
    pixels.data[4*i + 1] = col[1]
    pixels.data[4*i + 2] = col[2]
  }
  world.clearChanges()
  ctx.putImageData(pixels, 0, 0)
}
  
(async () => {
  let pixels = ctx.getImageData(0, 0, c.width, c.height)  
  for (let x = 0; x < c.width; x++) {
    for (let y = 0; y < c.height; y++) {
      let i = 4*(x + y*c.width)
      let col = Colour[world[x][y].type.type](world[x][y], x, y)
      pixels.data[i + 0] = col[0]
      pixels.data[i + 1] = col[1]
      pixels.data[i + 2] = col[2]
      pixels.data[i + 3] = col[3]
    }
  }
  ctx.putImageData(pixels, 0, 0)
  
  let coords = [...Array(c.width * c.height)].map((e, i) => ({ x: i%c.width, y: 0|(i/c.width) }))
  shuffle(coords)
  while (true) {
    drawWorld();
    
    mouse.lastx = mouse.x;
    mouse.lasty = mouse.y;
    mouse.states[mouse.state].tick();
    
    shuffle(coords)
    for (let {x, y} of coords) {
      Rule[world[x][y].type.type](x, y, world)
    }
    
    await new Promise(requestAnimationFrame)
    // await new Promise(requestAnimationFrame)
    // await new Promise(requestAnimationFrame)
    // await new Promise(requestAnimationFrame)
    // await new Promise(requestAnimationFrame)
  }
})()
