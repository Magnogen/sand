const tokenize = (source) => {
  
  const lexer = Lexer();
  
  lexer.define('comment',    /\/\/.*/, { ignore: true });
  lexer.define('whitespace', /\s+/, { ignore: true });
  lexer.define('symbol',     /[v^><]/);
  lexer.define('identifier', /[a-zA-Z_][a-zA-Z0-9_]*/);
  lexer.define('number',     /[0-9]+(\.[0-9]+)?/);
  lexer.define('arrow',      '=>');
  lexer.define('star',       '*')
  lexer.define('comma',      ',');
  lexer.define('colon',      ':');
  lexer.define('equals',     '=');
  lexer.define('semicolon',  ';');
  lexer.define('lbrace',     '{');
  lexer.define('rbrace',     '}');
  lexer.define('lbracket',   '[');
  lexer.define('rbracket',   ']');
  lexer.define('lparen',     '(');
  lexer.define('rparen',     ')');
  lexer.define('pipe',       '|');
  lexer.define('at',         '@');
  
  return lexer.tokenize(source);
};