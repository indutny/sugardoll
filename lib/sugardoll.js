var sugardoll = exports;

var vm = require('vm'),
    uglify = require('uglify-js');

sugardoll.plugins = require('./sugardoll/plugins');

function getFnBody(ast) {
  return ['toplevel', ast[1][0][3]];
};

function generateFromTokens(tokens) {
  // Clone tokens
  tokens = [{type: 'keyword', value: 'function'},
            {type: 'name', value: '_'},
            {type: 'punc', value: '('},
            {type: 'punc', value: ')'},
            {type: 'punc', value: '{'}]
            .concat(tokens)
            .concat([{type: 'punc', value: '}'}]);

  function tok() {
    if (tokens.length == 0) return {type: 'eof'};
    return tokens.shift();
  };
  tok.context = function() {
    return {};
  };

  return getFnBody(uglify.parser.parse(tok));
};

function collectTokens(code, tokens) {
  var tok = uglify.parser.tokenizer(code),
      token;

  do {
    tokens.push(token = tok());
  } while (token.type !== 'eof');
};

sugardoll.tokenizer = function tokenizer(code, plugins) {
  var tokens = [];

  plugins || (plugins = []);

  collectTokens(code, tokens);

  for (var index = tokens.length - 1; index >= 0; index--) {
    var token = tokens[index],
        prev = tokens[index - 1] || {};

    if (token.type === 'name' &&
        (prev.type !== 'keyword' || prev.value !== 'function')) {
      // Caught invoke
      var plugin;
      if (plugin = plugins[token.value]) {
        function collector() {
          return tokens[++collector.index];
        };
        collector.context = function() {
          return {};
        };
        collector.index = index;

        var collected = plugin.collect(collector);

        if (collected !== false) {
          // Token name should be collected too
          if (collected === true) {
            collected = collector.index - index;
          }
          collected++;

          // Result is replacement for the matched code
          var trailing = tokens.slice(index + collected),
              collected = tokens.slice(index + 1, index + collected);

          tokens = tokens.slice(0, index);

          if (plugin.prepare) {
            collected = plugin.prepare(collected);
          }

          var ast = generateFromTokens(collected)
              code = plugin.generate.call({
                generate: uglify.uglify.gen_code
              }, ast);

          if (Array.isArray(code)) {
            // code is AST
            code = uglify.uglify.gen_code(code);
          }

          // Collect tokens from result
          collectTokens(code, tokens);

          // Remove eof token
          tokens.pop();

          tokens = tokens.concat(trailing);
        }
      }

    }
  };

  function nextToken() {
    return tokens.shift();
  };
  nextToken.context = function() {
    return {};
  };

  return nextToken;
};

sugardoll.parse = function(code, plugins) {
  // Wrap code in function, so `return` outside function won't
  // throw error
  code = 'function _() {' + code + '}';
  var ast = uglify.parser.parse(sugardoll.tokenizer(code, plugins));
  return getFnBody(ast);
}

sugardoll.compile = function(code, plugins, options) {
  var ast = sugardoll.parse(code, plugins) 

  return uglify.uglify.gen_code(ast, options);
};

sugardoll.run = function(code, plugins, options) {
  code = sugardoll.compile(code, plugins, options);

  return vm.runInNewContext(code);
};
