// noprotect
on('load', () => {
  
  const log = Debugger($('#debugger-output'));
  
  const tokens = tokenize(`
    (me:wall) => noop();

    (me:sand, below:air v) => swap(me, below);
    (me:sand, below:water v) => swap(me, below);
    (me:sand, side:air v (< | >)) => swap(me, side);
    (me:sand, side:water (< | >)) => swap(me, side);

    (me:water, below:air v) => swap(me, below);
    (me:water, side:air (< | >)) => swap(me, side);

    (me:sawdust, near:fire *) => set(me, fire);
    (me:sawdust, below:air v) => swap(me, below);
    (me:sawdust, side:air v (< | >)) => swap(me, side);

    (me:fire) => set(me, air) @ 0.125;
    (me:fire, side:air ^ (< | >)) => swap(me, side) @ 0.5;
    (me:fire, up:air ^) => swap(me, up);
  `);
  
  const ast = parse(tokens);
  // log(ast);
  const types = getElements(ast);
  // log(types);
  const rules = compileRules(ast);
  
  const elementIds = {};
  types.forEach((name, index) => elementIds[name] = index);
  
  const elementColours = {
    wall:       [90, 95, 100],
    sand:       [235, 185, 110],
    air:        [16, 16, 16],
    water:      [60, 140, 230],
    fire:       [237, 50, 21],
    sawdust:    [222, 191, 149],
  };
  
  const selectMenu = $('#element-select');
  selectMenu.innerHTML = '';
  types.forEach((name) => {
    const option = document.createElement('option');
    option.value = elementIds[name];
    option.textContent = name.charAt(0).toUpperCase() + name.slice(1);
    selectMenu.appendChild(option);
  });
  
  const resetButton = $('#reset-button')
  
  const size = 128;
  const c = $('canvas');
  const ctx = c.getContext('2d');
  c.width = c.height = size;
  
  let world = [...Array(size)].map((_, x) => [...Array(size)].map((_, y) => {
    return elementIds['air'] !== undefined ? elementIds['air'] : 1;
  }));

  let colorWorld = [...Array(size)].map((_, x) => [...Array(size)].map((_, y) => (
    [0, 0, 0]
  )));
  
  world.changes = [];
  world.changemap = [...Array(size)].map(() => [...Array(size)].map(() => false));
  
  world.clearChanges = function () {
    for (let i of world.changes) {
      this.changemap[i % size][0 | (i / size)] = false;
    }
    this.changes = [];
  };
  
  world.change = function (x, y) {
    if (this.changemap[x][y]) return;
    this.changes.push(x + y * size);
    this.changemap[x][y] = true;
  };
  
  world.get = function({ x, y }) {
    if (x < 0 || x >= size || y < 0 || y >= size) return -1;
    return this[x][y];
  };
  
  world.set = function (x, y, now) {
    if (x >= 0 && x < size && y >= 0 && y < size) {
      this.change(x, y);
      this[x][y] = now;
      let col = [0, 0, 0];
      if (now == elementIds['sand']) {
        col = (Math.sin((performance.now()/500 + Math.random()/2) * Math.PI)+2)*18
        col = [ col, col, col ]
      }
      colorWorld[x][y] = col; 
    }
  };

  world.swap = function (a, b) {
    this.change(a.x, a.y); 
    this.change(b.x, b.y);

    const temp = this[a.x][a.y];
    this[a.x][a.y] = this[b.x][b.y];
    this[b.x][b.y] = temp;

    const tempColor = colorWorld[a.x][a.y];
    colorWorld[a.x][a.y] = colorWorld[b.x][b.y];
    colorWorld[b.x][b.y] = tempColor;
  };

  let coords = [...Array(size * size)].map((_, i) => ({ x: i % size, y: 0 | (i / size) }));
  
  function shuffle(array) {
    let c = array.length, b, d;
    while (c) {
      b = Math.random() * c-- | 0;
      d = array[c];
      array[c] = array[b];
      array[b] = d;
    }
  }
  const renderGridChanges = () => {
    const img = ctx.getImageData(0, 0, size, size);

    for (let i of world.changes) {
      const x = i % size;
      const y = 0 | (i / size);

      const cellValue = world[x][y];
      const elementName = types[cellValue];
      const baseColor = elementColours[elementName] || [255, 0, 255]; 

      const cellVariance = colorWorld[x][y];

      img.data[4 * i + 0] = Math.max(0, Math.min(255, baseColor[0] + cellVariance[0]));
      img.data[4 * i + 1] = Math.max(0, Math.min(255, baseColor[1] + cellVariance[1]));
      img.data[4 * i + 2] = Math.max(0, Math.min(255, baseColor[2] + cellVariance[2]));
      img.data[4 * i + 3] = 255;
    }

    world.clearChanges();
    ctx.putImageData(img, 0, 0);
  };
  
  let brushSize = 5;
  let currentPaintElement = 0; 
  
  function iterateAndApplyMethodBetweenTwoPoints(x1, y1, x2, y2, func) {
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
      if (res == 'stop') break;
    }
  }
  
  const paint = () => {
    let bounds = c.getBoundingClientRect();

    const X1 = 0 | ((mouse.lastx - bounds.left) * (size / bounds.width));
    const Y1 = 0 | ((mouse.lasty - bounds.top) * (size / bounds.height));

    const X2 = 0 | ((mouse.x - bounds.left) * (size / bounds.width));
    const Y2 = 0 | ((mouse.y - bounds.top) * (size / bounds.height));

    iterateAndApplyMethodBetweenTwoPoints(X1, Y1, X2, Y2, (cx, cy) => {
      const radius = brushSize >> 1;
      for (let X = cx - radius; X <= cx + radius; X++) {
        for (let Y = cy - radius; Y <= cy + radius; Y++) {
          if (X < 0 || X >= size || Y < 0 || Y >= size) continue;

          const dx = X - cx;
          const dy = Y - cy;
          if (dx * dx + dy * dy > radius * radius) continue;

          world.set(X, Y, currentPaintElement);
        }
      }
    });

    mouse.lastx = mouse.x;
    mouse.lasty = mouse.y;
  };
  
  class MouseState {
    constructor({ down = (() => {}), up = (() => {}), move = (() => {}), tick = (() => {}), cursor = 'default' } = {}) {
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
        down() { mouse.state = 'drawing'; paint(); }
      }),
      drawing: new MouseState({
        move: paint,
        tick: paint,
        up() { mouse.state = 'normal'; }
      })
    }
  };
  
  c.on("pointerdown", e => {
    e.preventDefault();
    mouse.down = true;
    mouse.lastx = mouse.x = e.clientX; 
    mouse.lasty = mouse.y = e.clientY;
    mouse.states[mouse.state].down();
  });

  on("pointerup", e => {
    if (!mouse.down) return;
    mouse.down = false;
    mouse.states[mouse.state].up();
  });

  on("pointermove", e => {
    if (!mouse.down) return;
    mouse.lastx = mouse.x; mouse.lasty = mouse.y;
    mouse.x = e.clientX; mouse.y = e.clientY;
    mouse.states[mouse.state].move();
  });
  
  selectMenu.on('change', (e) => {
    currentPaintElement = parseInt(e.target.value, 10);
  });
  
  resetButton.on('click', (e) => {
    const airId = elementIds['air'] !== undefined ? elementIds['air'] : 1;

    for (let y = 0; y < size; y++) {
      for (let x = 0; x < size; x++) {
        world[x][y] = airId;
        colorWorld[x][y] = [0, 0, 0]
        world.change(x, y);
      }
    }
  });
  
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      world.change(x, y);
    }
  }

  (async () => {
    ctx.fillStyle = "black";
    ctx.fillRect(0, 0, size, size);

    shuffle(coords);

    while (true) {
      renderGridChanges();

      mouse.lastx = mouse.x;
      mouse.lasty = mouse.y;
      if (mouse.down && mouse.states[mouse.state].tick) {
        mouse.states[mouse.state].tick();
      }

      shuffle(coords);
      for (let { x, y } of coords) {
        for (const rule of rules) {
          const success = rule(world, types, elementIds, x, y);
          if (success) break;
        }
      }

      await new Promise(requestAnimationFrame);
    }
  })();
  
});