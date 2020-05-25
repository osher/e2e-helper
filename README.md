# e2e-helper

## Usecase
When writing end-to-end test suite for servers (e.g, web-servers, socket-servers, queue consumers) - one needs to launch the tested service, gather it's logs, and terminate the service once the suite concluded.
This holds true *especially* in CI builds.

This package comes to facilitate all these tasks wrapping them for you with setup and tear-down hooks.
You get these hooks from a factory to which you provide your settings.

While you can use it with ***any*** test library for node - since mocha is the most prominent - it can take for you with it a further step and registger these hooks for you.
It can do so for BDD, TDD, and moch-ui-exports UIs.

## Badges
 - [![Build Status](https://secure.travis-ci.org/osher/e2e-helper.png?branch=master)](http://travis-ci.org/osher/e2e-helper) Tested on latests node versions of 6,7,8
 - [![Coverage Status](https://coveralls.io/repos/github/osher/e2e-helper/badge.svg?branch=master)](https://coveralls.io/github/osher/e2e-helper?branch=master)

# Features list:
1. manages for you the setup and teardown hooks
2. manages tunneling the stdout and stderr outputs to a log file
3. supports termination signals as:
   - kill (SIGINT / SIGTERM)
   - PCI message
4. allows you to run your tests against an already running server - i.e - skip the server launch/kill and log-file management by providing env variable SUT (acronym of System Under Test)
   When provided - the SUT may be the base URL against which tests should be run.
5. allows running in code-coverage mode via `istanbul` by providing env variable COVER as truthful value
6. wide set of configurable options to customize `title`, `log-path`, `cwd`, `args`, and more.
7. facilitation wrappers for mocha tdd/bdd UI and [mocha-ui-exports][1]

[1]: https://www.npmjs.com/package/mocha-ui-exports


# usage

## barebones work with the hooks

The lower level mechanism is the main exported module - which is a function that accepts an  options and provides the hooks the following way.
(full options list bellow)

The returned value is the setup handler, where the teardown handler is found both as a property of the returned setup handler, and as a property of the main exported module.

e.g.:
```
const setup = require('e2e-helper')({
  svc:   'bin/server',
  readyNotice: 'server is started'
})

//setup --> function(done) { ... }
//setup.teardown -->  function(done) { ... }

declare('my service', () => {
   before(setup);
   after(setup.teardown);

   require('./api-1.test.js');
   require('./api-2.test.js');
   require('./api-3.test.js');
})

```

Mind that the actual api test suites are nested in a single parent suite, to make sure the setup/teardown hooks are called in time.
That's not the only way to do it.
You can use the hooks in any of the suites independently - but unless if you make sure not to - this will override the server log output file.

## The Full options list

 - `svc` - string, mandatory, should be relative path. a path to the script that starts the service.
   if you need to provide an absolute path - you may use  `.cwd` to provide the absolute path
   when options is string - it is uderstood as options.svc, applying defaults to all the rest
 - `cwd` - string, optional - the work directory the process should run in. defaults to current dir
 - `env` - flat object, environment-variables to pass to the spawned service. default: {}
 - `logPath` - string, optional - path to logfile. default: `'./e2e.log'`
 - `timeout` - integer, optional - timeout for server setup, default: `10000`
 - `slow` - integer, optional - slow bar indicator for server setup, default: `10000`
 - `readyNotice` - string, optional - message to expect on service output that
   indicates the service is ready. default: `'listening on port'`
 - `args` - array, optional, argumnets to be concatenated to the running command
 - `term_code` - string, optional, the termination message to send to the child, default: `'SIGINT'`
 - `term_ipc` - optional, any value provided will be used to child.send(term_ipc) before escalating
   to term-code. When not provided - starts with term-code
 - `term_timeout` - optional, number, timeout in miliseconds before escalations( ipc->term->kill)
   default: `3000`
 - `coverSvc` - optional, path to cover-tool node-script which should run `.svc` to gather coverage
   default: `'./node_modules/istanbul/lib/cli'`
 - `coverArgs` - optional, array of CLI arguments to the cover tool
   default: `["cover","--dir","./coverage/e2e-test","--handle-sigint"]`
 - `coverIgnore` - optional, array of glob-pattern strings for files to exclude from coverage

## with mocha

The package exports 3 facilitators for mocha, for it's main UIs.

All 3 mocha facilitators are using the same lower-level mechanism to retrieve the setup and teardown hooks, and register them.

To make sure the setup and teardown are called first and last respectively - all the suites are loaded to the same root tests tree.
For this - the passed `options` should include them as well.

### Additional options supported in mocha facilitators
 - `suites` - array of strings - paths relative to `process.cwd()` (or absolute) of suites to run between setup and teardown.
 - `title` - passed as 1st argument to the `describe` that will hold the setup, teardown, and all the passed suites. defaults to `end-to-end`

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

**NOTE:** If you want to test your server in few execution modes - you may for example provide few files in the fassion that `test-e2e/index.js` is portrayed here,
and configure your `npm e2e` to run all these test-roots.


there is an alias for short form:
```
require('e2e-helper').bdd({
  ...
```

## with mocha, tdd ui

Almost exactly like `mocha bdd ui`, only that in stead of
```
require('e2e-helper').mocha_bdd({
  ...
```
use:

```
require('e2e-helper').mocha_tdd({
  ...
```
or in short:
```
require('e2e-helper').tdd({
  ...
```

## with mocha, using the mocha-ui-exports plugin

Almost exactly like `mocha bdd ui`, only that in stead of
```
require('e2e-helper').mocha_bdd({
  ...
```
use:
```
module.exports = require('e2e-helper').mocha_ui_exports({
  ...
```
or in short:
```
module.exports = require('e2e-helper').exports({
  ...
```

# Stablity
I've used this utility for years now, but took too long to just publish it.
There may be edge-cases with cover mode on windows - that's the only part I'm yet to be satisfied with.
I don't expect API changes for fixing any of these issues.

# Contribute
- submit working code
- if you add functionality - add tests :)
- don't worry about the style. I tried to add eslint to help with that, although it's not bullet-proof.
  If I'll really need to - I'll ask you to permit me on your fork, I'll help as best I can with styles or with anything else :)

# Lisence
MIT, and that's it :)
