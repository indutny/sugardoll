var plugins = exports;

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
      var token = tok();

      // No braces - nothing to match
      if (token.type !== 'punc' && token.value !== '{') return false;

      var braces = 1;

      do {
        token = tok();
        if (token.type === 'punc') {
          if (token.value === '{') braces++;
          if (token.value === '}') braces--;
        }
      } while (braces > 0 && token.type !== 'eof');

      return braces === 0;
    },
    generate: function(ast) {
      ast = ['toplevel', ast[1][0][1]];
      return generator.call(this, ast);
    }
  }
};
