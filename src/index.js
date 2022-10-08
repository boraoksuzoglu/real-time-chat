const express = require('express')
const app = express()
const mongoose = require('mongoose')
require('dotenv').config()
const uri = process.env.MONGODB
const path = require('path')
const session = require('express-session')
const server = require('http').createServer(app)
const WebSocket = require('ws')
const wss = new WebSocket.Server({
	server: server,
})
const HtmlUtils = require('./utils/HtmlUtils')

app.set('view-engine', 'ejs')
app.set('trust proxy', 1)
app.use('/public', express.static(path.join(__dirname, '..', '/public')))
app.set('views', path.join(__dirname, 'views'))
app.use(
	session({
		resave: false,
		saveUninitialized: false,
		secret: 'shhhh, very secret',
	})
)
app.use(
	express.urlencoded({
		extended: false,
	})
)
// router
app.use('/', require('./routes'))

// WEBSOCKET

const chatData = require('./models/chat')
var USER_CONNECTION_TIMEOUTS = {}

wss.on('connection', function connection(ws) {
	ws.rateLimit = 0
	ws.limitedMessages = []
	setInterval(() => {
		ws.rateLimit = 0
		if (ws.limitedMessages.length > 0) {
			ws.limitedMessages.forEach((message) => {
				ws.limitedMessages = ws.limitedMessages.filter((msg) => msg != message)
				ws.emit('message', message)
			})
		}
	}, 500)

	ws.on('close', async function disconnect() {
		console.log(ws.user + ' disconnected.')

		const userChat = await chatData.findOne({ 'users.token': ws.user })
		const userInfo = userChat['users'].find((userVar) => userVar.token == ws.user)

		wss.clients.forEach((client) => {
			if (client.room == ws.room && client !== ws) {
				client.send(
					JSON.stringify({
						type: 'leave',
						data: { username: userInfo.username, color: userInfo.color },
					})
				)
			}
		})
		USER_CONNECTION_TIMEOUTS[ws.user] = setTimeout(async () => {
			await chatData.updateOne(
				{ channelID: ws.room },
				{ $pull: { users: { token: ws.user } } },
				{ safe: true }
			)
			await chatData.deleteMany({ users: { $size: 0 } })
		}, 1500)
	})

	ws.on('message', async function incoming(data) {
		let jsonData
		try {
			jsonData = JSON.parse(data)
		} catch (e) {
			return // ws.send
		}
		if (jsonData.type == 'message') {
			let { token, message } = jsonData.data
			message = HtmlUtils.escape(message)
			// Message length condition
			if (message.length < 1 || token == undefined) return
			// Rate limit condition
			if (ws.rateLimit < 1) {
				ws.rateLimit++
				const userChat = await chatData.findOne({ 'users.token': token })
				const userInfo = userChat['users'].find((user) => user.token == token)
				return wss.clients.forEach((client) => {
					if (client.readyState === WebSocket.OPEN && client.room == userChat.channelID) {
						client.send(
							JSON.stringify({
								type: 'message',
								data: {
									channelID: userChat.channelID,
									message: message,
									oppo: client !== ws,
									author: {
										username: userInfo.username,
										color: userInfo.color,
									},
								},
							})
						)
					}
				})
			}
			ws.limitedMessages.push(data)
		} else if (jsonData.type == 'login') {
			const { chat, user } = jsonData.data
			ws.room = HtmlUtils.escape(chat)
			ws.user = HtmlUtils.escape(user)

			console.log(ws.user + ' connected')

			const userChat = await chatData.findOne({ 'users.token': user })
			const userInfo = userChat['users'].find((userVar) => userVar.token == user)

			ws.color = userInfo.color
			wss.clients.forEach((client) => {
				if (client.room == chat && client.user != user) {
					client.send(
						JSON.stringify({
							type: 'join',
							data: { username: userInfo.username, color: userInfo.color },
						})
					)
				}
			})

			if (USER_CONNECTION_TIMEOUTS[ws.user] != undefined) {
				clearTimeout(USER_CONNECTION_TIMEOUTS[ws.user])
				delete USER_CONNECTION_TIMEOUTS[ws.user]
			}
		}
	})
})

server.listen(3000, async () => {
	console.log('App listening at localhost:3000')
	mongoose.connect(uri, {
		useFindAndModify: false,
		useUnifiedTopology: true,
		useNewUrlParser: true,
	})
	await require('./models/chat').deleteMany({})
})

mongoose.connection.on('connected', async () => {
	console.log('Successfully connected to database')
})
mongoose.connection.on('error', (err) => {
	console.log('An error occured while connecting to database: ' + err)
})
