var sugardoll = exports;

var vm = require('vm'),
    uglify = require('uglify-js');

sugardoll.plugins = require('./sugardoll/plugins');

function generateFromTokens(tokens) {
  function tok() {
    if (tokens.length == 0) return {type: 'eof'};
    return tokens.shift();
  };
  tok.context = function() {
    return {};
  };

  return uglify.parser.parse(tok);
};

function collectTokens(code, tokens) {
  var tok = uglify.parser.tokenizer(code),
      token;

  do {
    tokens.push(token = tok());
  } while (token.type !== 'eof');
};

sugardoll.tokenizer = function tokenizer(code, plugins) {
  var index = -1,
      tokens = [];

  plugins || (plugins = []);

  collectTokens(code, tokens);

  function nextToken() {
    var token = tokens[++index];

    if (token.type === 'name') {
      // Caught invoke
      var plugin;
      if (plugin = plugins[token.value]) {
        var _index = index;

        var collected = plugin.collect(nextToken);

        var newIndex = index;
        index = _index;

        if (collected !== false) {
          // Token name should be collected too
          if (collected === true) {
            collected = newIndex - index;
          }
          collected++;

          // Result is replacement for the matched code
          var trailing = tokens.slice(index + collected),
              collected = tokens.slice(index + 1, index + collected);

          tokens = tokens.slice(0, index);

          if (plugin.prepare) {
            collected = plugin.prepare(collected);
          }

          var ast = generateFromTokens(collected),
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

          // Update existing token
          token = tokens[index];
        }
      }

    }

    return token;
  };

  nextToken.context = function() {
    return {};
  };

  return nextToken;
};

sugardoll.compile = function(code, plugins, options) {
  var ast = uglify.parser.parse(sugardoll.tokenizer(code, plugins));

  return uglify.uglify.gen_code(ast, options);
};

sugardoll.run = function(code, plugins, options) {
  code = sugardoll.compile(code, plugins, options);

  return vm.runInNewContext(code);
};
