
const express = require('express')
const app = express()
const mongoose = require('mongoose');
const uri = require("./config.json").mongodb
const session = require('express-session');
const server = require('http').createServer(app);
const WebSocket = require('ws');
const uuid = require("uuid")
const wss = new WebSocket.Server({
    server: server
});
const hexRgb = (hex) => {
    var result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
    return result ? {
      r: parseInt(result[1], 16),
      g: parseInt(result[2], 16),
      b: parseInt(result[3], 16)
    } : null;
}

app.set('view-engine', 'ejs')
app.set('trust proxy', 1)
app.use('/public', express.static(__dirname + '/public'));
app.use('index', express.static(__dirname + 'index'))
app.use(session({
    resave: false,
    saveUninitialized: false,
    secret: 'shhhh, very secret'
}));
app.use(express.urlencoded({
    extended: false
}))

// Models
const chatData = require('./models/chat')

app.get('/', async (req, res) => {

    if (!req.session.token && !req.session.chat ||
        !await chatData.exists({channelID: req.session.chat}) || 
        !await chatData.exists({channelID: req.session.chat, "users.token": req.session.token})) {

            if (req.session.token || req.session.chat) req.session.destroy()
            return res.render('index.ejs', {error: 0})

    }

    else {

        const userData = await chatData.findOne({channelID: req.session.chat})
        const {username, color} = userData["users"].find(user => user.token == req.session.token)

        res.render("chat.ejs", {
            username: username,
            chat: req.session.chat,
            token: req.session.token,
            color: color,
            users: userData['users'].map(value => {return {username: value.username, color: value.color}})
        })
    }
})

var USER_CONNECTION_TIMEOUTS = {}

wss.on('connection', function connection(ws, req) {

    ws.rateLimit = 0
    ws.limitedMessages = []
    setInterval(() => {
        ws.rateLimit = 0
        if (ws.limitedMessages.length > 0) {
            ws.limitedMessages.forEach(message => {
                ws.limitedMessages = ws.limitedMessages.filter(msg => msg != message)
                ws.emit("message", message)
            })
        }
    }, 500)

    ws.on('close', async function disconnect() {
        console.log(ws.user + " disconnected.")

        const userChat = await chatData.findOne({"users.token": ws.user})
        const userInfo = userChat['users'].find(userVar => userVar.token == ws.user)

        wss.clients.forEach((client) => {

            if (client.room == ws.room && client !== ws) {
                client.send(JSON.stringify({type: "leave", data: {username: userInfo.username, color: userInfo.color}}))
            }

        })
        USER_CONNECTION_TIMEOUTS[ws.user] = setTimeout(async () => {

            await chatData.updateOne({channelID: ws.room}, {$pull: {users: { token: ws.user }}}, {safe: true})
            await chatData.deleteMany({users: {$size: 0}})
            
        }, 1500)
    });

    ws.on('message', async function incoming(data) {

        const jsonData = JSON.parse(data)
        if (jsonData.type == "message") {

            const {token,message} = jsonData.data
            // Message length condition
            if (message.length < 1 || token == undefined) return
            // Rate limit condition
            if (ws.rateLimit < 1) {
                ws.rateLimit++
                const userChat = await chatData.findOne({"users.token": token})
                const userInfo = userChat['users'].find(user => user.token == token)
                wss.clients.forEach((client) => {
        
                    if (client.readyState === WebSocket.OPEN && client.room == userChat.channelID) {
        
                        client.send(JSON.stringify({
                            type: "message",
                            data: {
                                channelID: userChat.channelID,
                                message: message,
                                oppo: client !== ws,
                                author: {
                                    username: userInfo.username,
                                    color: userInfo.color,
                                }
                            }
                        }))
            
                    }
                });
            } else {
                ws.limitedMessages.push(data)
            }

        } else if (jsonData.type == "login") {

            const {chat, user} = jsonData.data
            ws.room = chat
            ws.user = user

            console.log(ws.user + ' connected');

            const userChat = await chatData.findOne({"users.token": user})
            const userInfo = userChat['users'].find(userVar => userVar.token == user)

            ws.color = userInfo.color
            wss.clients.forEach((client) => {

                if (client.room == chat && client.user != user) {
                    client.send(JSON.stringify({type: "join", data: {username: userInfo.username, color: userInfo.color}}))
                }

            })

            if (USER_CONNECTION_TIMEOUTS[ws.user] != undefined) {
                clearTimeout(USER_CONNECTION_TIMEOUTS[ws.user])
                delete USER_CONNECTION_TIMEOUTS[ws.user]
            }

        }

    })
    ws.on('limited', data => {
        ws.send(JSON.stringify({type: "ratelimit"}))
    })

});

app.post('/logout', async (req, res) => {

    wss.clients.forEach(client => {
        if (client.user == req.session.token) {

            return client.close()

        }
    })

    req.session.destroy()
    res.redirect("/")

})

app.post('/login', async (req, res) => {

    if (req.body.chat.length < 3 || req.body.username.length < 3 || req.body.chat.length > 16 || req.body.username.length > 16) {
        
        return res.render("index.ejs", {error: 02})

    }

    let chatExist = await chatData.exists({
        channelID: req.body.chat
    })
    let userExist = await chatData.exists({
        channelID: req.body.chat, "users.username": req.body.username
    })
    let token = uuid.v4();
    if (!chatExist) {
        // Channel doesn't exist
        // CREATE ONE!
        req.session.regenerate(function () {
            req.session.chat = req.body.chat
            req.session.token = token
            res.redirect('/')

        });
        await chatData.create({
            channelID: req.body.chat,
            users: {
                username: req.body.username,
                token: token,
                color: hexRgb(req.body.hex)
            }
        })

    } else if (!userExist) {
        // Channel exist, User doesn't exist
        // JOIN CHANNEL!
        await chatData.updateOne({
            channelID: req.body.chat},
            {$push: {
                users: {
                    username: req.body.username,
                    token: token,   
                    color: hexRgb(req.body.hex)
                }
            }}
        )

        req.session.regenerate(function () {
            req.session.token = token
            req.session.chat = req.body.chat
            res.redirect('/');
        });

    } else {
        // Channel exist, User exist
        // Change Username and TRY AGAIN!
        
        res.render("index.ejs", {error: 01})
    }

})

server.listen(3000, async () => {
    console.log("App listening at localhost:3000")
    mongoose.connect(uri, {
        useFindAndModify: false,
        useUnifiedTopology: true,
        useNewUrlParser: true
    })
    await chatData.deleteMany({})

})

mongoose.connection.on("connected", async () => {
    console.log("Successfully connected to database");
});
mongoose.connection.on("error", (err) => {
    console.log("An error occured while connecting to database: " + err);
});