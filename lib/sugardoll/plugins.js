var plugins = exports;

plugins._collect = function collect(tok, start, end) {
  var token = tok();

  // No braces - nothing to match
  if (token.type !== 'punc' && token.value !== start) return false;

  var depth = 1;

  do {
    token = tok();
    if (token.type === 'punc') {
      if (token.value === start) depth++;
      if (token.value === end) depth--;
    }
  } while (depth > 0 && token.type !== 'eof');

  return depth === 0;
};

plugins.define = function(value) {
  return {
    collect: function() {return 0;},
    generate: typeof value === 'function' ? value : function() {
      return JSON.stringify(value);
    }
  };
};

plugins.block = function(generator) {
  return {
    collect: function(tok) {
      return collect(tok, '{', '}');
    },
    generate: function(ast) {
      ast = ['toplevel', ast[1][0][1]];
      return generator.call(this, ast);
    }
  }
};

plugins.parenBlock = function(generator) {
  return {
    collect: function(tok) {
      return collect(tok, '(', ')') && collect(tok, '{', '}');
    },
    prepare: function(tokens) {
      var depth = 0;

      tokens.forEach(function(token) {
        if (token.type !== 'punc') return;

        if (token.value === '(') {
          if (depth++ === 0) {
            token.value = '{';
          }
        } else if (token.value === ')') {
          if (--depth === 0) {
            token.value = '}';
          }
        }
      });

      return tokens;
    },
    generate: function(ast) {
      var args = ['toplevel', ast[1][0][1]],
          body = ['toplevel', ast[1][1][1]];

      return generator.call(this, args, body);
    }
  }
}
