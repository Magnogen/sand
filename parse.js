const parse = (tokens) => {
  const P = Parser();
  
  const identifier = P.token('identifier');
  
  const positionSymbol =
    P.any(
      P.token('symbol'),
      P.token('star')
    ).map(tok => tok.value);

  const positionAltGroup =
    P.chain(
      P.token('lparen'),
      positionSymbol,
      P.many(P.chain(P.token('pipe'), positionSymbol)),
      P.token('rparen')
    ).map(
      ([, first, rest]) => [first, ...rest.map(([, sym]) => sym)]
    );

  const positionGroup =
    P.many(P.any(
      positionSymbol  .map((dir ) => ({ type: 'move', direction:  dir  })),
      positionAltGroup.map((dirs) => ({ type: 'any',  directions: dirs })),
    ));

  const condition =
    P.chain(
      identifier,
      P.token('colon'),
      identifier,
      P.maybe(positionGroup)
    ).map(
      ([variable, , material, pos]) => ({
        type: 'Condition',
        variable: variable.value,
        material: material.value,
        position: pos[0]
      })
    );

  const conditionList =
    P.chain(
      condition,
      P.many(
        P.chain(
          P.token('comma'),
          condition
        )
      )
    ).map(
      ([first, rest]) => [first, ...rest.map(([, cond]) => cond)]
    );

  const action =
    P.chain(
      identifier,
      P.token('lparen'),
      P.maybe(
        P.chain(
          identifier,
          P.many(
            P.chain(
              P.token('comma'),
              identifier
            )
          )
        ).map(
          ([first, rest]) => [first.value, ...rest.map(([, id]) => id.value)]
        )
      ),
      P.token('rparen')
    ).map(
      ([name, , args]) => ({ type: 'Action', name: name.value, args: args[0] || [] })
    );
  
  const actionList =
    P.many(action);

  const probability =
    P.chain(
      P.token('at'),
      P.token('number')
    ).map(([, prob]) => parseFloat(prob.value));
  
  const rule =
    P.chain(
      P.token('lparen'),
      conditionList,
      P.token('rparen'),
      P.token('arrow'),
      actionList,
      P.maybe(probability),
      P.maybe(P.token('semicolon'))
    ).map(
      ([, conditions, , , actions, prob]) => ({ type: 'Rule', conditions, actions, prob: prob[0] ?? 1 })
    );

  const tagDefinition =
    P.chain(
      identifier,
      P.token('equals'),
      P.token('lbracket'),
      P.chain(
        identifier,
        P.many(
          P.chain(
            P.token('comma'),
            identifier
          )
        )
      ),
      P.token('rbracket'),
      P.maybe(P.token('semicolon'))
    ).map(
      ([name, , , [first, rest]]) => ({
        type: 'TagDefinition',
        name: name.value,
        values: [first.value, ...rest.map(([, id]) => id.value)]
      })
    );
  
  const mappingKey = 
    P.any(
      identifier,
      P.token('star')
    ).map(
      (v) => v.type == 'star' ? { value: '*' } : v
    )

  const mappingPair =
    P.chain(
      mappingKey,
      P.token('arrow'),
      identifier
    ).map(
      ([from, , to]) => ({ type: 'Mapping', from: from.value, to: to.value })
    );

  const mappingDefinition =
    P.chain(
      identifier,
      P.token('equals'),
      P.token('lbrace'),
      P.maybe(
        P.chain(
          mappingPair,
          P.many(
            P.chain(
              P.token('comma'),
              P.maybe(mappingPair)
            )
          )
        )
      ),
      P.token('rbrace'),
      P.maybe(P.token('semicolon'))
    ).map(
      ([name, , , [pairs]]) => ({
        type: 'MappingDefinition',
        name: name.value,
        entries: pairs ? [pairs[0], ...pairs[1].map(([, pair]) => pair[0]).filter(e => e)] : []
      })
    );

  const statement =
    P.any(
      tagDefinition,
      mappingDefinition,
      rule
    );

  const file =
    P.many(
      statement
    ).map(
      (stmts) => ({ type: 'Program', body: stmts })
    );
  
  return file.parse(tokens, 0).result;
}