console.log('starting')

setTimeout(() => console.log('[][][] listening on port 4343'), 100)
setInterval(() => console.log('blip'), 5000)

process.on('SIGTERM', process.exit )
process.on('message', (m) => { setTimeout( process.exit, m.timeout) })