'use strict'

const {assign} = Object
const path     = require('path')
const fs       = require('fs')
const run      = require('child_process').spawn

const defaults =
  { title        : 'end-to-end'
  , cwd          : process.cwd()
  , env          : {}
  , logPath      : './e2e.log'
  , readyNotice  : 'listening on port'
  , console
  , args         : []
  , timeout      : 10000
  , slow         : 5000
  , term_code    : 'SIGINT'
  , term_timeout : 3000
  , coverSvc     : './node_modules/istanbul/lib/cli'
  , coverArgs    : ['cover', '--dir', './coverage/e2e-test', '--handle-sigint']
  , coverIgnore  : []
  }


/**
  @description
  returns a before-all mocha handler that setups the server with the provided
  options.

  while being called, it sets `e2e.teardown` with the matching teardown
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
  { initCtx
  , setup
  , teardown
  }

function e2e(options) {
    const ctx = initCtx(options)

    e2e.teardown =
      ctx_setup.teardown =
        ctx_teardown

    return ctx_setup

    //TRICKY: these must be 'oldschool' functions - mocha relays on the `this` keyword
    function ctx_setup(done) { setup(ctx, this, done) }
    function ctx_teardown(done) { teardown(ctx, this, done) }
}

function mocha_functions_api(options, {suite, setup, teardown, console = options.console || global.console}) {
    suite(
      options.title || defaults.title
    , () => {
          if (process.env.SUT) {
              console.log('test target: ', process.env.SUT)
          } else {
              setup(e2e(options))
              teardown(e2e.teardown)
          }

          options.suites
            .map( p => path.resolve(p) )
            .forEach(global.require /* istanbul ignore next */|| require)
      }
    )
}

function mocha_bdd(options) {
    mocha_functions_api(options
    , { suite:    global.describe
      , setup:    global.before
      , teardown: global.after
      }
    )
}

function mocha_tdd(options) {
    mocha_functions_api(options
    , { suite:    global.suite
      , setup:    global.suiteSetup
      , teardown: global.suiteTeardown
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
      : Object.assign(suite
        , { beforeAll: e2e(options)
          , afterAll:  e2e.teardown
          }
        )

    options.suites.forEach(
      endpointTest =>
        assign(suite, loadSuite(path.resolve(endpointTest)))
    )

    res[ options.title || defaults.title ]  = suite

    return res
}

function initCtx(options) {
    if ('object' != typeof options) options = { svc: options }

    options = assign({}, defaults, options)
    options.args = options.args.concat()
    options.coverArgs = options.coverArgs.concat()

    const stringArray = (arr) => Array.isArray(arr) && !arr.find(s => 'string' != typeof s)
    const targetSvc = path.join(String(options.cwd), String(options.svc))

    const msg =
          !options.svc                            && 'options.svc is not provided'
       || 'string' != typeof options.svc          && 'options.svc must be a string'
       || 'string' != typeof options.cwd          && 'options.cwd must be a string'
       || !fs.existsSync(options.cwd)             && options.cwd + ' is not found on disk'
       || !isFileFound(targetSvc)                 && options.svc + ' is not found on disk'
       || !options.logPath                        && 'options.logPath is expected to be a path'
       || 'string' != typeof options.logPath      && 'options.logPath is expected to be a path'
       || !options.readyNotice                    && 'options.readyNotice must be a string'
       || 'string' != typeof options.readyNotice  && 'options.readyNotice must be a string'
       || !Array.isArray(options.args)            && 'options.args must be an array'
       || 'number' != typeof options.timeout      && 'options.timeout must be a number'
       || 'number' != typeof options.slow         && 'options.slow must be a number'
       || options.env
          && 'object' != typeof options.env       && 'options.env, when provided must be an object'
       || !(  'number' == typeof options.term_timeout
           && 0 < options.term_timeout
           )                                      && 'options.term_timeout, when provided - must be a positive number'
       || !~[ 'SIGTERM', 'SIGINT', 'SIGQUIT'
            , 'SIGKILL', 'SIGHUP'
            ].indexOf(options.term_code)         && 'options.term_code, when provided - must be a valid process signal'

       || 'string' != typeof options.coverSvc     && 'options.svc, when provided - must be path node CLI script, such as istanbul'
       || !stringArray(options.coverArgs)         && 'options.coverArgs, when provided - must be an array of CLI arguments'
       || !stringArray(options.coverIgnore)       && 'options.coverIgnore, when provided - must be an array of glob pattern strings'

    if (msg) throw assign(
      new Error(
        [ "e2e-util is expected to be called with valid options"
        , "valid options should be an object with the following attributes"
        , "(or a string see later)"
        , " - svc - string, mandatory, should be relative path. a path to the script that starts the service."
        , "   if you need to provide an absolute path - you may use .cwd  as the absolute path"
        , "   when options is string - it is uderstood as options.svc, applying defaults to all the rest"
        , " - cwd - string, optional - the work directory the process should run in. defaults to current dir"
        , " - logPath - string, optional - path to logfile. default: './e2e.log'"
        , " - timeout - integer, optional - timeout for server setup, default: " + defaults.timeout
        , " - slow - integer, optional - slow bar indicator for server setup, default: " + defaults.timeout
        , " - readyNotice - string, optional - message to expect on service output that"
        , "   indicates the service is ready. default: " + defaults.readyNotice
        , " - args - array, optional, argumnets to be concatenated to the running command"
        , " - term_code - string, optional, the termination message to send to the child, default: " + defaults.term_code
        , " - term_ipc - optional, any value provided will be used to child.send(term_ipc) before escalating"
        , "   to term-code. When not provided - starts with term-code"
        , " - term_timeout - optional, number, timeout in miliseconds before escalations( ipc->term->kill)"
        , "   default: " + defaults.term_timeout
        , " - coverSvc - optional, path to cover-tool node-script which should run .svc to gather coverage"
        , "   default: " + defaults.coverSvc
        , " - coverArgs - optional, array of CLI arguments to the cover tool"
        , "   default: " + JSON.stringify(defaults.coverArgs)
        , " - coverIgnore - optional, array of glob-pattern strings for files to exclude from coverage"
        , "reason: "
        , "  " + msg
        ].join('\n')
      )
    , { options }
    )

    if (process.env.COVER) {
        const args = [options.coverSvc].concat(options.coverArgs)

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
  @param {object} ctx - context
  @param {string} ctx.sut - system under test - path to the script that
     runs the target server
  @param {string} ctx.logPath - path to log file
  @param {string} ctx.readyNotice - output line expected on stdout of
     the started target service that indicates that the service is running
  @param {mocha.Test} test - the test context that implements .timetout(n), .slow(n) ....
  @param {callback} done - callback
  @returns {undefined}
 */
function setup(ctx, test, done) {
    try { fs.unlinkSync( ctx.logPath ) } catch(e) {}

    test.timeout(ctx.timeout)
    test.slow(ctx.slow)

    const log =
      ctx.log =
        fs.createWriteStream(ctx.logPath, { flags: 'a'} )

    log.writable = true

    const writeLog = (...args) => log.writable && log.write.apply(log, args)

    const child =
      ctx.child =
        run(process.execPath, ctx.args
        , { env:   assign({}, process.env, ctx.env)
          , cwd:   ctx.cwd
          , stdio: ['pipe', 'pipe', 'pipe', 'ipc']
          }
        )

    /* istanbul ignore next */
    child.on('error', (err) => {
        writeLog('ERR: ', err)
        done(err)
    })

    child.stderr.on('data', (data) => {
        data = data.toString()

        /* istanbul ignore if */
        writeLog('ERR: ' + data)
        if (~data.indexOf('Error: listen EADDRINUSE')) done(new Error('Server could not start: Address In Use'))
    })

    child.stdout.on('data', (data) => {
        data = data.toString()
        writeLog(data)

        if (~data.indexOf(ctx.readyNotice)) {
            ctx.console.log('service started: %s', ctx.args.join(' '))
            done()
        }
    })

    child.on('exit', (e) => {
        child.exitted = true
        ctx.console.log('\n\nservice termination ended', e || 'OK')
        ctx.log.writable = false
        ctx.log.end(() => {
            child.emit('--over--')
        })
    })
}

/**
 @param {object} ctx - the context
 @param {mocha.Test} test - the Test object
 @param {callback} done  - callback
 @returns {undefined}
 */
function teardown(ctx, test, done) {
    /* istanbul ignore if */
    if (ctx.child.exitted) return done()
    test.slow(ctx.term_timeout * 1.5)
    test.timeout(ctx.term_timeout * 3)

    ctx.child.on('--over--', done)
    ctx.term_ipc
      ? ipc()
      : term()

    function ipc() {
        ctx.child.send(ctx.term_ipc)
        setTimeout(term, ctx.term_timeout).unref()
    }

    function term() {
        ctx.child.kill(ctx.term_code)
        setTimeout(kill, ctx.term_timeout).unref()
    }

    function kill() {
        ctx.child.kill('SIGKILL')
    }
}
