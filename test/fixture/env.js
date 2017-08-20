console.log('starting')

setTimeout(() => {
  console.log('the env var: ', process.env.THE_VAR)
  console.log('[][][] listening on port 4343')
}, 100)

process.on('SIGTERM', process.exit)
