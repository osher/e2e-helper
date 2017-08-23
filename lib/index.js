'use strict'
const assign   = Object.assign
const path     = require('path')
const fs       = require('fs')
const run      = require('child_process').spawn
let  log

const defaults =
  { title        : 'end-to-end'
  , cwd          : process.cwd()
  , logPath      : './e2e.log'
  , readyNotice  : 'listening on port'
  , console      : console
  , args         : []
  , timeout      : 10000
  , slow         : 5000
  , term_code    : 'SIGINT'
  , term_timeout : 3000
  , coverIgnore  :
    [ '**/test-e2e/**'
    , '**/test/**'
    ]
  }

const coverArgs = 
    [ './node_modules/istanbul/lib/cli', 'cover'
    , '--dir', './coverage/e2e-test'
    , '--handle-sigint'
    ]

/**
  returns a before-all mocha handler that setups the server with the provided 
  options.

  while being called, it sets `e2e.tearDown` with the matching tearDown 
  function that shuts down the service gracefully.

  @name module:e2e-util
  @function
  @param {string|object} options - when provided as string - it's understood as `options.svc`
  @param {string} options.svc - system under test - path to the script that 
     runs the target server
  @param {string} options.logPath - path to log file
  @param {string} options.readyNotice - output line expected on stdout of 
     the started service that indicates that the service is ready
  @param {array} options.args - args to concat to the node command
  @param {callback} callback
 */
module.exports =
  assign(
    e2e
  , { mocha_bdd
    , mocha_tdd
    , mocha_ui_exports
    , bdd               : mocha_bdd
    , tdd               : mocha_tdd
    , exports           : mocha_ui_exports
    }
  )

/* for tests only */
e2e.internal =
  { initCtx  : initCtx
  , setup    : setup
  , tearDown : tearDown
  }

function e2e(options) {
    const ctx = initCtx(options)

    e2e.tearDown =
      ctx_setup.tearDown =
        ctx_teardown
    
    return ctx_setup
    
    //TRICKY: these must be 'oldschool' functions - mocha relays on the `this` keyword
    function ctx_setup   (done) { setup   (ctx, this, done) }
    function ctx_teardown(done) { tearDown(ctx, this, done) }
}

function mocha_bdd(options) {
    const console = options.console || global.console
    describe(
      options.title || defaults.title
    , () => {
          process.env.SUT
            ? console.log('test target: ', process.env.SUT)
            : [ before(e2e(options)), after(e2e.tearDown) ]

          options.suites
            .map( p => path.resolve(p) )
            .forEach(global.require /* istanbul ignore next */ || require)
      }
    )
}

function mocha_tdd(options) {
    const console = options.console || global.console
    suite(
      options.title || defaults.title
    , () => {
          process.env.SUT
            ? console.log('test target: ', process.env.SUT)
            : [ suiteSetup(e2e(options)), suiteTeardown(e2e.tearDown) ]

          options.suites
            .map( p => path.resolve(p) )
            .forEach(global.require /* istanbul ignore next */|| require)
      }
    )
}

function mocha_ui_exports(options) {
    const console = options.console || global.console
    const loadSuite = global.require /* istanbul ignore next */ || require
    const res = {}
    const suite = {}
    
    process.env.SUT
      ? console.log('test target: ', process.env.SUT)
      : Object.assign(suite, { 
          beforeAll: e2e(options),
          afterAll:  e2e.tearDown
        })
    
    options.suites.forEach(
      endpointTest =>
        assign(suite, loadSuite(path.resolve(endpointTest)))
    )
    
    res[ options.title || defaults.title ]  = suite
    
    return res
}

function initCtx(options) {
    let msg
    
    if ('object' != typeof options) options = { svc: options }
    
    options = assign({}, defaults, options)
    options.args = options.args.concat()
    
    msg = (
          !options.svc                            && ('options.svc is not provided')
       || 'string' != typeof options.svc          && ('options.svc must be a string')
       || 'string' != typeof options.cwd          && ('options.cwd must be a string')
       || !fs.existsSync(options.cwd)             && (options.cwd + ' is not found on disk')
       || !isFileFound(path.join(options.cwd, options.svc)) 
                                                  && (options.svc + ' is not found on disk')
       || !options.logPath                        && ('options.logPath is expected to be a path')
       || 'string' != typeof options.logPath      && ('options.logPath is expected to be a path')
       || !options.readyNotice                    && ('options.readyNotice must be a string')
       || 'string' != typeof options.readyNotice  && ('options.readyNotice must be a string')
       || !Array.isArray(options.args)            && ('options.args must be an array')
       || 'number' != typeof options.timeout      && ('options.timeout must be a number')
       || 'number' != typeof options.slow         && ('options.slow must be a number')
       ||    options.env    
          && 'object' != typeof options.env       && ('options.env, when provided must be an object')
       || !(  'number' == typeof options.term_timeout
           && 0 < options.term_timeout 
           )                                      && ('options.term_timeout, when provided - must be a positive number')
       || !~['SIGTERM','SIGINT','SIGQUIT',
               'SIGKILL','SIGHUP'
            ].indexOf(options.term_code)          && ('options.term_code, when provided - must be a valid process signal')
       
       || options.coverIgnore
          && (  !Array.isArray(options.coverIgnore)
             || options.coverIgnore.find(s => 'string' != typeof s)
             )                                    && ('options.coverIgnore, when provided - must be an array of glob pattern strings')
    ) 
    if (msg) throw assign(
      new Error(
        [ "e2e-util is expected to be called with valid options"
        , "valid options should be an object with the following attributes"
        , "(or a string see later)"
        , " - svc - string, mandatory, should be relative path. a path to the script that starts the service."
        , "   if you need to provide an absolute path - you may use .cwd  as the absolute path"
        , "   when options is string - it is uderstood as options.svc"
        , " - logPath - string, optional - path to logfile. default: './e2e.log'"
        , " - timeout - integer, optional - timeout for server setup"
        , " - slow - integer, optional - slow bar indicator for server setup"
        , " - readyNotice - string, optional - message to expect on service output that"
        , "   indicates the service is ready. default: 'listening on port'"
        , " - args - array, argumnets to be concatenated to the running command"
        , " - cwd - string, optional - the work directory the process should run in"
        , " - term_code - string, optional, the termination message to send to the child, default: SIGTERM"
        , " - term_ipc - optional, any value provided will be used to child.send(term_ipc) before escalating to child.kill(term_code)"
        , " - term_timeout - optional, number, timeout in miliseconds before escalations( ipc->term->kill)"
        , " - coverIgnore - optional, array of glob-pattern strings"
        , "reason: ",
        , "  " + msg
        ].join('\n')
      )
    , { options }
    )
    
    if (process.env.COVER) {
        const args = coverArgs.concat()
        const ignore = options.coverIgnore
        
        options.coverIgnore.forEach((pattern) => args.push('-x', pattern))
        
        args.push(
          options.svc.match(/\.js$/)
            ? options.svc
            : options.svc + '.js'
        )
        
        options.args = 
          options.args.length 
            ? args.concat(['--'], options.args)
            : args
    } else {
        options.args.unshift(options.svc)
    }

    return options
    
    function isFileFound(path) {
        return fs.existsSync(path) 
            || fs.existsSync(path + '.js')
    }
}

/**
  @param {object} options
  @param {string} options.sut - system under test - path to the script that
     runs the target server
  @param {string} options.logPath - path to log file
  @param {string} options.readyNotice - output line expected on stdout of 
     the started target service that indicates that the service is running
  @param {mocha.Test} test - the test context that implements .timetout(n), .slow(n) ....
  @param {callback} callback
 */
function setup(ctx, test, done) {
  
    try { fs.unlinkSync( ctx.logPath ) } catch(e) {}

    test.timeout(ctx.timeout)
    test.slow(ctx.slow)

    const log =
      ctx.log =
        fs.createWriteStream(ctx.logPath, { flags: 'a'} )
    
    log.writable = true
    
    const child =
      ctx.child =
        run(process.execPath, ctx.args, { 
          env:   assign({}, process.env, ctx.env || {}),
          cwd:   ctx.cwd,
          stdio: ['pipe','pipe', 'pipe', 'ipc']
        })

    child.on('error', (err) => {
        if (log.writable) log.write('ERR: ', err)
        done(err)
    })

    child.stderr.on('data', (data) => {
        data = data + ''
        if (log.writable) log.write('ERR: ' + data)
        if (~data.indexOf('Error: listen EADDRINUSE'))
            done(new Error('Server could not start: Address In Use'))
    })

    child.stdout.on('data', function(data) {
        data = data.toString()
        if (log.writable) log.write(data)

        if (~data.indexOf(ctx.readyNotice)) {
            ctx.console.log('service started: %s', ctx.args.join(' '))
            done()
        }
    })
    
    child.on('exit', function(e) { 
        child.exitted = true
        ctx.console.log('\n\nservice termination ended', e || 'OK')
        ctx.log.writable = false
        ctx.log.end(function() {
            child.emit('--over--')
        })
    })
}

/**
 @param {callback}  callback
 */
function tearDown(ctx, test, done) {
    if (ctx.child.exitted) return done()
    test.slow(ctx.term_timeout * 1.5)
    test.timeout(ctx.term_timeout * 3)

    ctx.child.on('--over--', done)  
    ctx.term_ipc
      ? ipc()
      : term()

    function ipc() {
        ctx.child.send(ctx.term_ipc)
        setTimeout(term, ctx.term_timeout)
    }

    function term() {
        ctx.child.kill(ctx.term_code)  
        setTimeout(kill, ctx.term_timeout)
    }

    function kill() {
        ctx.child.kill('SIGKILL')
    }
}