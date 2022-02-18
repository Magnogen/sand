// jshint esversion: 10

let $ = (query='') => document.querySelector(query)

let c = $('canvas')
let ctx = c.getContext('2d')
c.width = c.height = 256

class MouseState {
  constructor({ down=(()=>{}), up=(()=>{}), move=(()=>{}), cursor='default' }={}) {
    this.cursor = cursor;
    this.down = down;
    this.up = up;
    this.move = move;
  }
}

let mouse = {
  state: 'normal',
  x: 0, y: 0,
  down: false,
  states: {
    normal: new MouseState({
      down() {
        mouse.state = 'drawing'
      }
    }),
    drawing: new MouseState({
      move() {
        let bounds = c.getBoundingClientRect()
        const X = 0|((c.width * mouse.x-bounds.x) / bounds.width)
        const Y = 0|((c.height * mouse.y-bounds.y) / bounds.height)
        world[X][Y] = 2
      },
      up() {
        mouse.state = 'normal'
      }
    })
  }
}

c.addEventListener("mousemove", e => {
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
    get color() {
      return [ 0, 0, 0, 255 ]
    },
  },
  1: { // STONE
    do(x, y, world) {},
    get color() {
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
    get color() {
      return [ 255, 255, 0, 255 ]
    }
  }
}

let world = [...Array(c.width)].map(row => [...Array(c.height)].map(e => 0));

function shuffle(a,b,c,d){//array,placeholder,placeholder,placeholder
  c=a.length;while(c)b=Math.random()*c--|0,d=a[c],a[c]=a[b],a[b]=d
}

(async () => {
  while (true) {
    
    let pixels = ctx.getImageData(0, 0, c.width, c.height)
    
    // let next = world
    let coords = [...Array(c.width * c.height)].map((e, i) => ({ x: i%c.width, y: 0|(i/c.width) }))
    shuffle(coords)
    for (let {x, y} of coords) {
      particles[world[x][y]].do(x, y, world)
    }
    // world = next
    
    for (let x = 0; x < c.width; x++) {
      for (let y = 0; y < c.height; y++) {
        let i = 4*(x + y*c.width)
        let col = particles[world[x][y]].color
        pixels.data[i + 0] = col[0]
        pixels.data[i + 1] = col[1]
        pixels.data[i + 2] = col[2]
        pixels.data[i + 3] = col[3]
      }
    }
    ctx.putImageData(pixels, 0, 0)
    
    await new Promise(requestAnimationFrame)
  }
})()

