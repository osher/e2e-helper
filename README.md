# e2e-helper

A helper for end-to-end tests (aka e2e tests) to manage CLI processes such as web-servers, socket-servers, queue consumers, or any services that should be launched as part of a suite setup, and killed as a part of a suite cleanup.

## Badges
 - [![Build Status](https://secure.travis-ci.org/osher/e2e-helper.png?branch=master)](http://travis-ci.org/osher/e2e-helper) Tested on latests node versions of 6,7,8

# Features list:
1. manages for you the setup and teardown hooks
2. manages tunneling the stdout and stderr outputs to a log file
3. supports termination signals as:
   - kill (SIGINT / SIGTERM)
   - PCI message
4. allows you to run your tests against an already running server - i.e - skip the server launch/kill and log-file management by providing env variable SUT (i.e acronym of System Under Test)
   When provided - the SUT is expected to be the base URL against which tests should be run.
   . supports a coverage mode (currently with istanbul)
5. allows running in code-coverage mode via `istanbul` by providing env variable COVER as truthful value
6. wide set of configurable options to customize `title`, `log-path`, `cwd`, `args`, and more.
7. facilitation wrappers for mocha tdd/bdd UI and [mocha-ui-exports][1]

[1]: https://www.npmjs.com/package/mocha-ui-exports


# usage

## with mocha, bdd ui

Assume few e2e suites which are organized per endpoint / page  (however this is just a proposal needed to make sense of the example - you can organize your tests anyhow you like)

Then, provide an index file `~/test-e2e/index.js`

```
require('e2e-helper').mocha_bdd({
  svc:   'bin/server',
  suites: [
    'test-e2e/index.html.test.js',
    'test-e2e/api.GET_pets.test.js',
    'test-e2e/api.GET_pet_petId.test.js',
    'test-e2e/api.PUT_pet_petId.test.js',
    // ... more suites per endpoint / page / URL
  ]
  // ... and the rest of the options you may want to provide
})
```

which is ran as `npm e2e`, which in turn is configured to run as:

```
  "scripts" : {
    "e2e": "mocha test-ete/index.js",
```

there is an alias for short form:
```
require('e2e-helper').bdd({
```

## with mocha, tdd ui

Almost exactly like `mocha bdd ui`, only that in stead of 
```
require('e2e-helper').mocha_bdd({
```
use:

```
require('e2e-helper').mocha_tdd({
```
or in short:
```
require('e2e-helper').tdd({
```

**NOTE:** If you want to test your server in few execution modes - you may for example provide few files in the fassion that `test-e2e/index.js` is portrayed here, 
and configure your `npm e2e` to run all these test-roots.


## with mocha, using the mocha-ui-exports plugin

Almost exactly like `mocha bdd ui`, only that in stead of 
```
require('e2e-helper').mocha_bdd({
```
use:
```
module.exports = require('e2e-helper').mocha_ui_exports({
```

## with any other framework (not mocha)

All 3 mocha facilitators are using the same lower-level mechanism to retrieve the 
setup and teardown hooks, and load the suites object in correspondence to the
ui method used.

The lower level mechanism is the main exported module - which is a function accepts the following options:

 - *svc* - string, mandatory, should be relative path. a path to the script that starts the service.
   if you need to provide an absolute path - you may use .cwd  as the absolute path
   when options is string - it is uderstood as options.svc
 - *logPath* - string, optional - path to logfile. default: './e2e.log'
 - *timeout* - integer, optional - timeout for server setup
 - *slow* - integer, optional - slow bar indicator for server setup
 - *readyNotice* - string, optional - message to expect on service output that
   indicates the service is ready. default: 'listening on port'
 - *args* - array, argumnets to be concatenated to the running command
 - *cwd* - string, optional - the work directory the process should run in
 - *term_code* - string, optional, the termination message to send to the child, default: SIGTERM
 - *term_ipc* - optional, any value provided will be used to child.send(term_ipc) before escalating to child.kill(term_code)
 - *term_timeout* - optional, number, timeout in miliseconds before escalations( ipc->term->kill)
 - *coverIgnore* - optional, array of glob-pattern strings to exclude from cover tool, meaningful only for istanbul COVER mode
on top of that list, the higher facilitators accept as well
 - *title* - string - the root level test title*
 - *suites* - array of strings - paths relative to `process.cwd()` (or absolute) of suites to run between the hooks.

The returned value is the setup handler, where the teardown handler is found both as a property of the returned setup handler, and as a property of the main exported module.

e.g.:
```
const setup = require('e2e-helper')({ 
  svc:   'bin/server',
  readyNotice: 'server is started at:'
  
}) 

setup //--> function(done) { ... }
setup.teardown //-->  function(done) { ... }
```
 
To make sure the setup and teardown are called first and last respectively - in mocha, all the suites are loaded to the same root tests tree.

If you're using a different test runner - you make sure all your tests happen between the setup and the teardown :)


# Lisence
MIT, and that's it :)

# Contribute
- submit working code
- if you add functionality - add tests
- don't really worry much about the style...
  I hope it doesn't freak you out (it just might if you're using IDE)
  If I'll really need to - I'll ask you to permit me on your fork, I'll help as best I can with styles or with anything else :)

