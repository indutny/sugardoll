var vows = require('vows'),
    assert = require('assert');

var sugardoll = require('../lib/sugardoll');

vows.describe('sugardoll/api-test').addBatch({
  'When calling sugardoll.run': {
    'for regular javascript code': {
      topic: function() {
        return sugardoll.run('function regular() {return 1;}; regular();');
      },
      'results should not differ': function(result) {
        assert.equal(result, 1);
      }
    },
    'for sugardoll javascript code': {
      'with only one define plugin': {
        topic: function() {
          return sugardoll.run('test;', {
            test: sugardoll.plugins.define(1)
          });
        },
        'should return correct result': function(result) {
          assert.equal(result, 1);
        }
      },
      'with one define plugin within expression': {
        topic: function() {
          return sugardoll.run('1 + test * test;', {
            test: sugardoll.plugins.define(2)
          });
        },
        'should return correct result': function(result) {
          assert.equal(result, 5);
        }
      },
      'with one define plugin within expression': {
        topic: function() {
          return sugardoll.run('1 + test * test;', {
            test: sugardoll.plugins.define(2)
          });
        },
        'should return correct result': function(result) {
          assert.equal(result, 5);
        }
      },
      'with only one block plugin': {
        'that returns string': {
          topic: function() {
            return sugardoll.run('test { 1 + 1; 3 + 3 }', {
              test: sugardoll.plugins.block(function(ast) {
                return '1 + 1';
              })
            });
          },
          'should return correct result': function(result) {
            assert.equal(result, 2);
          }
        },
        'that returns unmodified ast': {
          topic: function() {
            return sugardoll.run('test { 1 + 1; 3 + 3 }', {
              test: sugardoll.plugins.block(function(ast) {
                return ast;
              })
            });
          },
          'should return correct result': function(result) {
            assert.equal(result, 6);
          }
        },
        'that returns modified ast': {
          topic: function() {
            return sugardoll.run('x2 { 1 + 1; 3 + 3 }', {
              x2: sugardoll.plugins.block(function(ast) {
                function change(ast) {
                  return ast.map(function(val) {
                    if (val[0] === 'num') return ['num', val[1] * 2];
                    if (Array.isArray(val)) return change(val);
                    return val;
                  });
                };
                return change(ast);
              })
            });
          },
          'should return correct result': function(result) {
            assert.equal(result, 12);
          }
        }
      },
      'with mixed code': {
        topic: function() {
          return sugardoll.run('hello + " " + post_d { pre_w { "orl" } }', {
            hello: sugardoll.plugins.define('hello'),
            pre_w: sugardoll.plugins.block(function(ast) {
              return '"w" + ' + this.compile(ast);
            }),
            post_d: sugardoll.plugins.block(function(ast) {
              return this.compile(ast) + ' + "d"';
            })
          });
        },
        'should return correct result': function(result) {
          assert.equal(result, 'hello world');
        }
      },
      'with parenBlock': {
        topic: function() {
          return sugardoll.run('test (var x = 1) { x }', {
            test: sugardoll.plugins.parenBlock(function(args, body) {
              return this.compile(args) + ';' + this.compile(body);
            })
          })
        },
        'should return correct result': function(result) {
          assert.equal(result, 1);
        }
      }
    }
  }
}).export(module);
