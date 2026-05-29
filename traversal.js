// noprotect
const stop = false;
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

    const analyzePosition = (position) => {
      let staticX = 0;
      let staticY = 0;
      let dynamicSteps = null;

      for (const pos of position) {
        if (pos.type === 'move') {
          if (pos.direction === '*') {
            if (!dynamicSteps) dynamicSteps = [];
            dynamicSteps.push(['^', 'v', '<', '>']);
          } else {
            staticX += directionToX[pos.direction];
            staticY += directionToY[pos.direction];
          }
        } else if (pos.type === 'any') {
          if (!dynamicSteps) dynamicSteps = [];
          dynamicSteps.push(pos.directions);
        } else {
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
      const condsConfig = ast.conditions.map(cond => {
        const analysis = analyzePosition(cond.position);
        return {
          variable: cond.variable,
          materialName: cond.material,
          staticX: analysis.staticX,
          staticY: analysis.staticY,
          dynamicSteps: analysis.dynamicSteps
        };
      });

      const ruleActions = ast.actions || [];

      rules.push((world, idToName, nameToId, x, y) => {
        const varsX = {};
        const varsY = {};

        for (let i = 0; i < condsConfig.length; i++) {
          const cond = condsConfig[i];
          let dx = cond.staticX;
          let dy = cond.staticY;

          if (cond.dynamicSteps !== null) {
            for (let j = 0; j < cond.dynamicSteps.length; j++) {
              const choice = choose(cond.dynamicSteps[j]);
              dx += directionToX[choice];
              dy += directionToY[choice];
            }
          }

          const targetX = x + dx;
          const targetY = y + dy;

          const cellId = world.get({ x: targetX, y: targetY });
          if (idToName[cellId] !== cond.materialName) return false;

          varsX[cond.variable] = targetX;
          varsY[cond.variable] = targetY;
        }
        
        if (Math.random() >= ast.prob) return false;

        for (const action of ruleActions) {
          const actionName = action.name;
          const actionArgs = action.args;

          if (actionName === 'swap') {
            const var1 = actionArgs[0];
            const var2 = actionArgs[1];
            
            world.swap(
              { x: varsX[var1], y: varsY[var1] }, 
              { x: varsX[var2], y: varsY[var2] }
            );
          } else if (actionName === 'set') {
            const var1 = actionArgs[0];
            const var2 = nameToId[actionArgs[1]];
            
            world.set(varsX[var1], varsY[var1], var2);
          }
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