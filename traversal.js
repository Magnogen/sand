// noprotect
const Traversal = {
  getElements: (ast) => {
    let elements = [];

    if (ast.type == 'Program') {
      for (const statement of ast.body) elements.push(...Traversal.getElements(statement));
    }
    if (ast.type == 'Rule') {
      for (const condition of ast.conditions) elements.push(...Traversal.getElements(condition));
    }
    if (ast.type == 'MappingDefinition') {
      for (const mapping of ast.entries) elements.push(...Traversal.getElements(mapping));
    }
    if (ast.type == 'TagDefinition') {
      for (const value of ast.values) elements.push(value);
    }
    if (ast.type == 'Condition') {
      elements.push(ast.material);
    }
    if (ast.type == 'Mapping') {
      if (ast.from != '*') elements.push(ast.from);
      elements.push(ast.to);
    } 

    return elements;
  },

  compileRules: (ast) => {
    let rules = [];

    const directionToX = { 'v': 0, '^': 0, '<': -1, '>': 1 };
    const directionToY = { 'v': 1, '^': -1, '<': 0, '>': 0 };

    // Helper to evaluate static segments vs dynamic randomized ones
    const analyzePosition = (position) => {
      let staticX = 0;
      let staticY = 0;
      let dynamicSteps = null;

      for (const pos of position) {
        if (pos.type === 'move') {
          staticX += directionToX[pos.direction];
          staticY += directionToY[pos.direction];
        } else if (pos.type === 'any') {
          if (!dynamicSteps) dynamicSteps = [];
          dynamicSteps.push(pos.directions); // Store reference for runtime choose()
        } else {
          // Fallback if direction is a direct integer/offset
          staticX += pos.direction; 
        }
      }
      return { staticX, staticY, dynamicSteps };
    };

    if (ast.type === 'Program') {
      for (const statement of ast.body) {
        rules.push(...Traversal.compileRules(statement));
      }
    }

    if (ast.type === 'Rule') {
      // PRE-COMPUTATION STAGE (Runs once at compilation time)
      const condsConfig = ast.conditions.map(cond => {
        const analysis = analyzePosition(cond.position);
        return {
          variable: cond.variable,
          materialName: cond.material,
          staticX: analysis.staticX,
          staticY: analysis.staticY,
          dynamicSteps: analysis.dynamicSteps // Array of arrays of choices, or null
        };
      });

      const actionName = ast.action.name;
      const actionArgs = ast.action.args;

      // RUNTIME STAGE (Runs 4000+ times per frame)
      rules.push((world, idToName, nameToId, x, y) => {
        // Cache object pooling lookups by tracking variables in fixed-index array pointers if possible,
        // but simple object lookup is fine if we avoid structural generation.
        const varsX = {};
        const varsY = {};

        // 1. Process Conditions efficiently
        for (let i = 0; i < condsConfig.length; i++) {
          const cond = condsConfig[i];
          let dx = cond.staticX;
          let dy = cond.staticY;

          // If there are random fallback directions (like < | >), evaluate them only if necessary
          if (cond.dynamicSteps !== null) {
            for (let j = 0; j < cond.dynamicSteps.length; j++) {
              const choice = choose(cond.dynamicSteps[j]);
              dx += directionToX[choice];
              dy += directionToY[choice];
            }
          }

          const targetX = x + dx;
          const targetY = y + dy;

          // Optimization: Inline world bounds checks before executing deep object mapping
          // (assuming world.get handles out-of-bounds cleanly, but bypassing it reduces object allocations)
          const cellId = world.get({ x: targetX, y: targetY });
          if (idToName[cellId] !== cond.materialName) return false;

          // Save variables natively avoiding nested coord mutations
          varsX[cond.variable] = targetX;
          varsY[cond.variable] = targetY;
        }

        // 2. Execute Actions using cached indices instead of destructuring allocations
        if (actionName === 'swap') {
          const var1 = actionArgs[0];
          const var2 = actionArgs[1];
          
          // Flattening structural objects into explicit arguments
          world.swap(
            { x: varsX[var1], y: varsY[var1] }, 
            { x: varsX[var2], y: varsY[var2] }
          );
        } else if (actionName === 'set') {
          const var1 = actionArgs[0];
          const var2 = nameToId[actionArgs[1]];
          
          world.set(varsX[var1], varsY[var1], var2);
        }

        return true;
      });
    }

    return rules;
  }
};

const getElements = (ast) => {
  const elements = [];
  for (const element of Traversal.getElements(ast)) {
    if (elements.includes(element)) continue;
    elements.push(element);
  }
  return elements;
};

const compileRules = (ast) => {
  return Traversal.compileRules(ast);
};