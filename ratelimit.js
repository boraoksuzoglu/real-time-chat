// Forked from https://github.com/scrapjs/ws-rate-limit
// Limits only user messages.

'use strict'

const duration = require('css-duration')

module.exports = rateLimit

function rateLimit (rate, max) {
    const clients = []

    // Create an interval that resets message counts
    setInterval(() => {
        let i = clients.length
        while (i--) {
            clients[i].messageCount = 0
        }
    }, duration(rate))

    // Apply limiting to client:
    return function limit (client) {
        client.messageCount = 0
        client.on('newListener', function (name, listener) {
            if (name !== 'message' || listener._rated) return

            // Rate limiting wrapper over listener:
            function ratedListener (data, flags) {
                if (client.messageCount++ < max || JSON.parse(data).type != 'message') {
                    listener(data, flags)
                }
                else {
                    client.emit('limited', data, flags)
                }
            }
            ratedListener._rated = true
            client.on('message', ratedListener)

            // Unset user's listener:
            process.nextTick(() => client.removeListener('message', listener))
        })

        // Push on clients array, and add handler to remove from array:
        clients.push(client)
        client.on('close', () => clients.splice(clients.indexOf(client), 1))
    }
}
