const http = require('http')
const svr1 = http.createServer(() => {}).listen(9876, (e) => {
    if (e) return console.log(e)
    console.log('svr1 started')
    
    const svr2 = http.createServer(() => {}).listen(9876, (e) => {
        console.log('closing svr1')
        svr1.close()
        console.log(e)
    })
})

setInterval(() => console.log('blip'), 5000)

process.on('SIGTERM', process.exit)
