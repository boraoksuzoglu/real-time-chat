const mongoose = require('mongoose')

module.exports = mongoose.model(
	'chatrooms',
	new mongoose.Schema({
		channelID: String,
		users: {
			type: Array,
			default: {
				username: String,
				usertoken: String,
				color: String,
			},
		},
	})
)
