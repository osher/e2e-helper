'use strict'
const path  = require('path')
const fs    = require('fs')
const sut   = require('../')

module.exports =
{ 'e2e-util':
  { 'should be a factory function that names 1 arguments - options': function() {
        Should(sut).be.a.Function()
        sut.length.should.eql(1)
    }
  , 'when called with bad options':
    { 'should throw a friendly error': 
      block(() => {
          const cases =
            { 'null':
              { o: null
              , m: 'options.svc is not provided'
              }
            , 'undefined':
              { o: undefined
              , m: 'options.svc is not provided'
              }
            , 'a numeric options':
              { o: 23342
              , m: 'options.svc must be a string'
              }
            , 'an empty object':
              { o: {}
              , m: 'options.svc is not provided'
              }
            , 'options.svc not a string':
              { o: { svc: 2334 }
              , m: 'options.svc must be a string'
              }
            , 'options.svc not on disk':
              { o: { svc: 'no-such-file' }
              , m: 'no-such-file is not found on disk'
              }
            , 'options.logPath falsy':
              { o:
                { svc: 'test/fixture/svc.js'
                , logPath: null
                }
              , m: 'options.logPath is expected to be a path'
              }
            , 'options.logPath not a string': 
              { o: 
                { svc: 'test/fixture/svc'
                , logPath: {}
                }
              , m: 'options.logPath is expected to be a path'
              }
            , 'options.readyNotice null':
              { o: 
                { svc: 'test/fixture/svc'
                , readyNotice: null
                }
              , m: 'options.readyNotice must be a string'
              }
            , 'options.readyNotice not a string':
              { o: 
                { svc: 'test/fixture/svc'
                , readyNotice: -0.431
                }
              , m: 'options.readyNotice must be a string'
              }
            , 'options.args not an array':
              { o: 
                { svc: 'test/fixture/svc'
                , args: 'I am not an array'
                }
              , m: 'options.args must be an array'
              }
            , 'options.timeout not a number':
              { o:
                { svc: 'test/fixture/svc'
                , timeout: 'I am not a number'
                }
              , m: 'options.timeout must be a number'
              }
            , 'options.slow not a number':
              { o: 
                { svc: 'test/fixture/svc'
                , slow: 'I am not a number'
                }
              , m: 'options.slow must be a number'
              }
            , 'options.cwd not a string':
              { o:
                { svc: 'test/fixture/svc'
                , cwd: 1245
                }
              , m: 'options.cwd must be a string'
              }
            , 'options.cwd not on disk':
              { o:
                { svc: 'test/fixture/svc'
                , cwd: 'no-such-dir'
                }
              , m: 'no-such-dir is not found on disk'
              }
            , 'options.env is not an object':
              { o:
                { svc: 'test/fixture/svc'
                , env: 'not an object'
                }
              , m: 'options.env, when provided must be an object'
              }
            , 'options.term_timeout is not a number':
              { o:
                { svc: 'test/fixture/svc'
                , term_timeout: 'not a number'
                }
              , m: 'options.term_timeout, when provided - must be a positive number'
              }
            , 'options.term_timeout is not a valid code':
              { o:
                { svc: 'test/fixture/svc'
                , term_code: 'not a valid SIG code'
                }
              , m: 'options.term_code, when provided - must be a valid process signal'
              }            
            , 'options.coverSvc is not a string':
              { o:
                { svc: 'test/fixture/svc'
                , coverSvc: []
                }
              , m: 'options.svc, when provided - must be path node CLI script, such as istanbul'
              }            
            , 'options.coverArgs is not array of strings':
              { o:
                { svc: 'test/fixture/svc'
                , coverArgs: ["pat/*", 12345]
                }
              , m: 'options.coverArgs, when provided - must be an array of CLI arguments'
              }            
            , 'options.coverIgnore is not array of strings':
              { o:
                { svc: 'test/fixture/svc'
                , coverIgnore: ["pat/*", 12345]
                }
              , m: 'options.coverIgnore, when provided - must be an array of glob pattern strings'
              }            
            }

          Object.keys(cases).forEach((title) => {
              const oCase = cases[title]
              cases[title] = () => {
                  let ex
                  try {
                      sut(oCase.o)
                  }catch(e) { ex = e }
                  Should.exist(ex, 'did not throw an error')
                  if (oCase.o && 'object' == oCase.o)
                      Should(ex.options).containEql(oCase.o)
                  Should(ex.message).containEql(oCase.m)
              }
          })

          return cases
      })
    },
    'when called with correct options with no term_ipc':
    { 'and service is OK': 
      block(() => {
          const msg = []
          const mockTestCtx = mockMockaCtx()
          let before, after

          return {
            beforeAll: () => {
                Should.not.exist(sut.teardown)
                before = sut( {
                  svc    : './test/fixture/svc',
                  args   : ['-arg1', 'val1', '-arg2', 'val2'],
                  timeout: 8000,
                  slow   : 4000,
                  console: { log: (...args) => { msg.push(args) } }
                })
                after = sut.teardown
                delete sut.teardown
            }
          , afterAll:
            (done) => fs.unlink('./e2e.log', done)
          , 'should yield a mocha before-all handler that expects a callback':
            () => {
                Should(before).be.a.Function()
                before.length.should.eql(1)
            }
          , 'should augment a teardown reference on the e2e module':
            () => {
                Should(after).be.a.Function()
                after.length.should.eql(1)
            }
          , 'using the before-all handler':
            { 'should not fail': 
              function (done) {
                  this.timeout(5000)
                  this.slow(2000)
                  before.call(mockTestCtx, done)
              }
            , 'should pass test.timeout the provided timeout': 
              () => mockTestCtx.timeout.passedArg.should.eql(8000)
            , 'should pass test.slow the provided slow bar':
              () => mockTestCtx.slow.passedArg.should.eql(4000)
            , 'should write to console that the server started':
              () => {
                  msg.length.should.eql(1)
                  msg[0][1].should.eql('./test/fixture/svc -arg1 val1 -arg2 val2')
              }
            , 'and using the teardown right after': 
              { 'should not fail':
                (done) => after.call(mockTestCtx, done)
              , 'should write to console that the server is terminated':
                () => msg.length.should.eql(2)
              }
            }
          }
      })
    , 'and service emits errors':
      block(() => {
          const mockTestCtx = mockMockaCtx()
          let before

          return {
            beforeAll: function(done) {
                Should.not.exist(sut.teardown)
                before = sut(
                  { svc    : './test/fixture/err'
                  , logPath: './err.log'
                  , console: { log: function(s) {} }
                  }
                )
                before.call(mockTestCtx)
                this.timeout(3100)
                setTimeout(done, 3000)
                after = sut.teardown
                delete sut.teardown
            },
            afterAll: function(done) {
                fs.unlink('./err.log', after.bind(mockTestCtx, done) )
            },
            'should collect errors to the log as well': function() {
                require('fs').readFileSync('./err.log').toString().should.eql('ERR: oups\n')
            }
          }
      })
    , 'and service fails to start because address is in use': 
      block(() => {
          const mockTestCtx = mockMockaCtx()
          let before
          let err

          return {
            beforeAll: function(done) {
                Should.not.exist(sut.teardown)
                before = sut( {
                  svc    : './test/fixture/addr-in-use',
                  logPath: './addr.log',
                  console: { log: (s) => {} }
                })
                before.call(mockTestCtx, function(e) {
                    err = e
                    done()
                })
                after = sut.teardown
                delete sut.teardown
            }
          , afterAll: (done) => fs.unlink('./addr.log', after.bind(mockTestCtx, done) )
          , 'should propagate an error': () => Should.exist(err)
          }
      })
    },
    'when called with correct options with term_ipc value': block(function() {
        var before, after
        var msg = []
        var mockTestCtx = mockMockaCtx()
        return {
          'and server terminates before term_timeout': suite(
            { svc         : './test/fixture/svc'
            , term_timeout: 6000
            , kill_timeout: 1
            }
          )
        , 'and server terminatation takes longer than term_timeout': suite(
            { svc         : './test/fixture/svc' //<-- will die 800ms too late - will cause SIGTERM
            , term_timeout: 1000
            , kill_timeout: 1800
            }
          )
        , 'and server terminatation takes longer than term_timeout': suite(
            { svc         : './test/fixture/svc'
            , term_timeout: 500
            , kill_timeout: 99999                 //<-- won't die on it's own...
            }
          )
        }
      
        function suite(options) {
            return {
              beforeAll: function() {
                  msg = []
                  before = sut(
                    { svc         : options.svc
                    , args        : ['-arg1', 'val1', '-arg2', 'val2']
                    , timeout     : 8000
                    , slow        : 4000
                    , console     : { log: function(s) { msg.push(arguments) } }
                    , term_timeout: options.term_timeout
                    , term_ipc    : { action: 'die', timeout: options.kill_timeout }
                    }
                  )
                  after = sut.teardown
                  delete sut.teardown
              }
            , 'and service starts OK': 
              { beforeAll: function(done) {
                    this.timeout(5000)
                    this.slow(2000)
                    before.call(mockTestCtx, done)
                }
              , 'using the teardown handler': 
                { 'should not fail': function(done) {
                      this.slow(3000)
                      this.timeout(5000)
                      after.call(mockTestCtx, done)
                  }
                }
              }
            }
        }
    })
  , '.mocha_bdd(options)': {
      'when called with minimal options': block(function() {
          const orig = 
            { describe: describe
            , it      : it
            , before  : before
            , after   : after 
            , require : require 
            }
          const ooo = []
          return {
            before: function() {
                const describe = spy('describe')
                global.describe = function(t, h) {
                    describe(t, h)
                    h()
                }
                global.it       = spy('it')
                global.before   = spy('before')
                global.after    = spy('after')
                global.require  = spy('require')

                function spy(action) { 
                    return () => { ooo.push({ action: action, args: arguments }) }
                }
            }
          , after: function() {
                Object.assign(global, orig)
            }
          , 'should not fail': () => {
                sut.mocha_bdd({
                  svc: './test/fixture/err',
                  suites: [
                    './fixture/suite1',
                    './suite2'
                  ]
                })
            }
          , 'should fire a `describe` block, in it before and after, and then a require for each suite ': () => {
                ooo.map(item => item.action).should.eql( 
                  [ 'describe'
                  , 'before'
                  , 'after'
                  , 'require'
                  , 'require'
                  ]
                )
            }
          }
      })
    , 'when called with a SUT=<url> env variable':
      block(() => {
          const orig = 
            { describe: describe
            , it      : it
            , before  : before
            , after   : after 
            , require : require 
            }
          const ooo = []
          const log = []
          
          return {
            before: function() {
                const describe  = spy('describe')
                global.describe = function(t, h) {
                    describe(t, h)
                    h()
                }
                global.it       = spy('it')
                global.before   = spy('before')
                global.after    = spy('after')
                global.require  = spy('require')

                process.env.SUT = 'http://localhost:3221'
                
                function spy(action) { 
                    return () => { ooo.push({ action: action, args: arguments }) }
                }
            }
          , afterAll: function() {
                delete process.env.SUT
                Object.assign(global, orig)
            }
          , 'should not fail': () => {
                sut.mocha_bdd(
                  { svc: './test/fixture/err'
                  , suites: 
                    [ './fixture/suite1'
                    , './suite2'
                    ]
                  , console: { log: (...m) => log.push(m) }
                  }
                )
            }
          , 'should just mount the suites without setup and teardown': () => {
                ooo.map(item => item.action).should.eql( 
                  [ 'describe'
                  , 'require'
                  , 'require'
                  ]
                )
            }
          , 'should emit a line to console about using SUT':
            () => log.should.eql([['test target: ', 'http://localhost:3221']])
          }
      })         
    }
  , '.mocha_tdd(options)': {
      'when called with minimal options': 
      block(() => {
          const orig = 
            { suite         : global.suite
            , test          : global.test
            , suiteSetup    : global.suiteSetup
            , suiteteardown : global.suiteteardown
            , require       : require 
            }
          const ooo = []
          return {
            beforeAll: function() {
                const suite = spy('suite')
                global.suite = function(t, h) {
                    suite(t, h)
                    h()
                }
                global.test           = spy('test')
                global.suiteSetup     = spy('suiteSetup')
                global.suiteteardown  = spy('suiteteardown')
                global.require        = spy('require')
                
                delete process.env.SUT 

                function spy(action) { 
                    return () => { ooo.push({ action: action, args: arguments }) }
                }
            }
          , afterAll: function() {
                delete process.env.SUT
                Object.assign(global, orig)
            }
          , 'should not fail': () => {
                sut.mocha_tdd({
                  svc: './test/fixture/err',
                  suites: [
                    './fixture/suite1',
                    './suite2'
                  ]
                })
            }
          , 'should fire a `suite` block, in it before and after, and a require in it for each suite ': () => {
                ooo.map(item => item.action).should.eql( 
                  [ 'suite'
                  , 'suiteSetup'
                  , 'suiteteardown'
                  , 'require'
                  , 'require'
                  ]
                )
            }
          }
      })
    , 'when called with a SUT=<url> env variable':
      block(() => {
          const orig = 
            { suite         : global.suite
            , test          : global.test
            , suiteSetup    : global.suiteSetup
            , suiteteardown : global.suiteteardown
            , require       : require 
            }
          const ooo = []
          const log = []
          
          return {
            beforeAll: function() {
                const suite = spy('suite')
                global.suite = function(t, h) {
                    suite(t, h)
                    h()
                }
                global.test           = spy('test')
                global.suiteSetup     = spy('suiteSetup')
                global.suiteteardown  = spy('suiteteardown')
                global.require        = spy('require')

                process.env.SUT       = 'http://localhost:5443'
                
                function spy(action) { 
                    return () => { ooo.push({ action: action, args: arguments }) }
                }
            }
          , afterAll: function() {
                delete process.env.SUT
                Object.assign(global, orig)
            }
          , 'should not fail': () => {
                sut.mocha_tdd(
                  { svc: './test/fixture/err'
                  , suites: 
                    [ './fixture/suite1'
                    , './suite2'
                    ]
                  , console: { log: (...m) => log.push(m) }
                  }
                )
            }
          , 'should just mount the suites without setup and teardown': () => {
                ooo.map(item => item.action).should.eql( 
                  [ 'suite'
                  , 'require'
                  , 'require'
                  ]
                )
            }
          , 'should emit a line to console about using SUT':
            () => log.should.eql([['test target: ', 'http://localhost:5443']])
          }
      })      
    }
  , '.mocha_ui_exports(options)': {
      'when called with minimal options': 
      block(() => {
          const orig = { require: require }
          const ooo  = []
          let res
          return {
            beforeAll: () => {
                delete process.env.SUT
                global.require = function(s) {
                    ooo.push(s)
                    return {
                      '/some/endpoint': {}
                    }
                }
            }
          , afterAll: () => { global.require = orig.require }
          , 'should not fail': () => {
                res = sut.mocha_ui_exports(
                  { svc:    './test/fixture/err'
                  , suites: 
                    [ './suite1'
                    , './suite2'
                    ]
                  }
                )
            }
          , 'should return an export suite module': 
            () => Should(res).be.an.Object()
          , 'the returned suite module':
            { beforeAll: () => Should.exist(res)
            , 'should have the root suite as `end-to-end`': 
              () => Should(res['end-to-end']).be.an.Object()
            , 'should have beforeAll and afterAll hooks': 
              () => {
                  Should(res['end-to-end'].beforeAll)
                    .be.a.Function()
                    .have.property('name', 'ctx_setup')
                  Should(res['end-to-end'].afterAll)
                    .be.a.Function()
                    .have.property('name', 'ctx_teardown')
              }
            , 'should include each of the required suites':
              () => {
                  Should(res['end-to-end']['/some/endpoint']).eql({})
                  ooo.should.deepEqual(
                    [ path.resolve('./suite1')
                    , path.resolve('./suite2')
                    ]
                  )
              }
            }
          }
      })
    , 'when called with a SUT=<url> env variable': 
      block(() => {
          const orig = { require: require }
          const ooo  = []
          const log  = []
          let res
          return {
            beforeAll: () => {
                delete process.env.SUT
                global.require = function(s) {
                    ooo.push(s)
                    return {
                      '/some/endpoint': {}
                    }
                }
                
                process.env.SUT = 'http://localhost:9887'
            }
          , afterAll: () => { 
                global.require = orig.require 
                delete process.env.SUT
            }
          , 'should not fail': () => {
                res = sut.mocha_ui_exports(
                  { svc:    './test/fixture/svc'
                  , suites: 
                    [ './suite1'
                    , './suite2'
                    ]
                  , console: { log: (...m) => log.push(m) }
                  }
                )
            }
          , 'should return an export suite module': 
            () => Should(res).be.an.Object()
          , 'the returned suite module':
            { beforeAll: () => Should.exist(res)
            , 'should have the root suite as `end-to-end`': 
              () => Should(res['end-to-end']).be.an.Object()
            , 'should not have beforeAll and afterAll hooks': 
              () => {
                  Should.not.exist(res['end-to-end'].beforeAll)
                  Should.not.exist(res['end-to-end'].afterAll)
              }
            , 'should include each of the required suites':
              () => {
                  Should(res['end-to-end']['/some/endpoint']).eql({})
                  ooo.should.deepEqual(
                    [ path.resolve('./suite1')
                    , path.resolve('./suite2')
                    ]
                  )
              }
            }
          , 'should emit a line to console about using SUT':
            () => log.should.eql([['test target: ', 'http://localhost:9887']])
          }
      })
    }
  , '.bdd(options)': {
      'should be a sinonym for .mocha_bdd(options)':
      () => Should(sut.bdd).equal(sut.mocha_bdd)
    }
  , '.tdd(options)': {
      'should be a sinonym for .mocha_tdd(options)':
      () => Should(sut.tdd).equal(sut.mocha_tdd)
    }
  , '.exports(options)': {
      'should be a sinonym for .mocha_ui_exports(options)': 
      () => Should(sut.exports).equal(sut.mocha_ui_exports)
    }
  , 'when called with a COVER=true env variable':
    { 'and called with correct options': 
      block(() => {
          const mockTestCtx = mockMockaCtx()
          const msg = []
          const origCover = process.env.COVER
          let before
          return {
            beforeAll: () => {
                process.env.COVER = true
                before = sut({
                    svc    : './test/fixture/svc',
                    args   : ['-s', 'some-value'],
                    console: { log: function(s) { msg.push(arguments) } }
                })
                after = sut.teardown
                delete sut.teardown
            }
          , afterAll: (done) => { 
                fs.unlink('./e2e.log', done)
                process.env.COVER = origCover  
            }
          , 'using the before-all handler':
            { 'should not fail': function(done) {
                  this.timeout(5000)
                  this.slow(2000)
                  before.call(mockTestCtx, done)
              }
            , 'should write to console that the server started': () => {
                  msg.length.should.eql(1)
                  msg[0][1].split(" ")
                    .should.eql(
                      [ './node_modules/istanbul/lib/cli', 'cover'
                      , '--dir', './coverage/e2e-test'
                      , '--handle-sigint'
                      , './test/fixture/svc.js'
                      , '--'
                      , '-s', 'some-value'
                      ]
                    )
              }
            , 'and using the teardown right after':
              { 'should not fail': (done) => { after.call(mockTestCtx, done) }
              , 'should write to console that the server is terminated': 
                () => msg.length.should.eql(2)
              }
            }
          }
      })
    , 'and called with only svc name': 
      block(function() {
          const mockTestCtx = mockMockaCtx()
          const msg = []
          const origCover = process.env.COVER
          let before
          return {
            beforeAll: () => {
                process.env.COVER = true
                before = sut(
                  { svc    : './test/fixture/svc'
                  , console: { log: function(s) { msg.push(arguments) } }
                  }
                )
                after = sut.teardown
                delete sut.teardown
            }
          , afterAll: (done) => { 
                fs.unlink('./e2e.log', done)
                process.env.COVER = origCover  
            }
          , 'using the before-all handler': 
            { 'should not fail': function(done) {
                  this.timeout(5000)
                  this.slow(2000)
                  before.call(mockTestCtx, done)
              }
            , 'should write to console that the server started': () => {
                  msg.length.should.eql(1)
                  Should(msg[0][1].split(" "))
                    .eql(
                      [ './node_modules/istanbul/lib/cli', 'cover'
                      , '--dir', './coverage/e2e-test'
                      , '--handle-sigint'
                      , './test/fixture/svc.js'
                      ]
                    )
              }
            , 'and using the teardown right after': 
              { 'should not fail': (done) => { after.call(mockTestCtx, done) }
              , 'should write to console that the server is terminated':
                () => msg.length.should.eql(2)
              }
            }
          }
      })
    , 'and options.coverIgnore is provided as array of patterns to ignore': 
      block(() => {
          const mockTestCtx = mockMockaCtx()
          const msg = []
          const origCover = process.env.COVER
          const origCoverIgnore = process.env.COVER
          let before
          return {
            beforeAll: () => {
                process.env.COVER = true
                before = sut(
                  { svc:         './test/fixture/svc'
                  , console:     { log: (...args) => { msg.push(args) } }
                  , coverIgnore: ['lib/file1.js','lib/file2.js']
                  }
                )
                after = sut.teardown
                delete sut.teardown
            }
          , afterAll: (done) => { 
                fs.unlink('./e2e.log', done)
                process.env.COVER = origCover
            }
          , 'using the before-all handler':
            { 'should not fail': function(done) {
                  this.timeout(5000)
                  this.slow(2000)
                  before.call(mockTestCtx, done)
              }
            , 'should replace the default patterns with the provided patterns': () => {
                  msg.length.should.eql(1)
                  Should(msg[0][1].split(" ")).eql(
                    [ './node_modules/istanbul/lib/cli', 'cover'
                    , '--dir', './coverage/e2e-test'
                    , '--handle-sigint'
                    , '-x', 'lib/file1.js'
                    , '-x', 'lib/file2.js'
                    , './test/fixture/svc.js'
                    ]
                  )
              }
            , 'and using the teardown right after':
              { 'should not fail': (done) => { after.call(mockTestCtx, done) }
              , 'should write to console that the server is terminated': 
                () => msg.length.should.eql(2)
              }
            }
          }
      })
    , 'and service emits errors':
      block(function() {
          const mockTestCtx = mockMockaCtx()
          let before
          return {
            beforeAll: function (done) {
                Should.not.exist(sut.teardown)
                before = sut(
                  { svc    : './test/fixture/err'
                  , logPath: './err.log'
                  , console: { log: (s) => {} }
                  }
                )
                before.call(mockTestCtx)
                setTimeout(done, 5000)
                this.timeout(5100)
                after = sut.teardown
                delete sut.teardown
            }
          , afterAll: (done) => { fs.unlink('./err.log', after.bind(mockTestCtx, done) ) }
          , 'should collect errors to the log as well': 
            () => require('fs').readFileSync('./err.log').toString().should.eql('ERR: oups\n')
          }
      })
    }
  , 'when called with only svc name': 
    block(() => {
        const mockTestCtx = mockMockaCtx()
        const msg = []
        let before
        let e2elog
        return {
          beforeAll: () => {
              process.env.COVER = true
              before = sut(
                { svc:      './test/fixture/env'
                , env:      { THE_VAR: 'correct-value' }
                , console:  { log: (s) => { msg.push(arguments) } }
                }
              )
              after = sut.teardown
              delete sut.teardown
          }
        , afterAll: (done) => {
              fs.unlink('./e2e.log', done)
          }
        , 'using the before-all handler':
          { 'should not fail': function(done) {
                this.timeout(5000)
                this.slow(2000)
                before.call(mockTestCtx, function() {
                    after.call( mockTestCtx, function() {
                        e2elog = fs.readFileSync('./e2e.log').toString()
                        done()
                    })
                })
            }
          , 'should pass add options.env to env passed to child_process':
            () => e2elog.should.match(/the env var:  correct-value/)
          }
        }
    })
  , '.initCtx(options)':
    { 'when used with defualt cwd': 
      block(() => {
        let res
        return {
          beforeAll: () => {
            res = sut.internal.initCtx({
              svc: './test/fixture/svc.js',
              suites: [
                './suite1',
                './suite2'
              ]
            })
          }
        , 'should not fail':
          () => Should(res).be.an.Object()
        , 'should have correct path to current working directory':
          () => Should(res).have.property('cwd')
        }
      })
    , 'when used provide cwd': 
      block(() => {
          let res
          return {
            beforeAll: () => {
              res = sut.internal.initCtx({
                  svc: '/err',
                  cwd: 'test/fixture',
                  suites: [
                    './suite1',
                    './suite2'
                  ]
                })
            }
          , 'should not fail':
            () => Should(res).be.an.Object()
          , 'should have correct path to current working directory': () => {
              Should(res).have.property('cwd')
              Should(res.cwd).eql('test/fixture')
            }
          }
      })
    }
  }
}

function mockMockaCtx() {
    return {
      timeout: function(n) { this.timeout.passedArg = n }
    , slow:    function(n) { this.slow.passedArg = n }
    }
}
