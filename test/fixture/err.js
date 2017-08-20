setTimeout(function() {
  console.error('oups')
}, 100)

setInterval(function() { console.log('blip') }, 5000)

process.on('SIGTERM', process.exit)