const mongoose = require('mongoose');

module.exports = mongoose.model("messages", new mongoose.Schema({

    channelID: String,
    message: String,
    author: {
        username: String,
        color: {
            r: Number,
            g: Number,
            b: Number
        }
    }
    
}))
