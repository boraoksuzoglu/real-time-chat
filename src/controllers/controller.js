const chatData = require('../models/chat')
const hexRgb = require("../utils/HexToRgb")
const uuid = require("uuid")

exports.main = async (req, res) => {
    if (!req.session.token && !req.session.chat ||
        !await chatData.exists({
            channelID: req.session.chat
        }) ||
        !await chatData.exists({
            channelID: req.session.chat,
            "users.token": req.session.token
        })) {

        if (req.session.token || req.session.chat) req.session.destroy()
        return res.render('index.ejs', {
            error: 0
        })

    } else {

        const userData = await chatData.findOne({
            channelID: req.session.chat
        })
        const {
            username,
            color
        } = userData["users"].find(user => user.token == req.session.token)

        res.render("chat.ejs", {
            username: username,
            chat: req.session.chat,
            token: req.session.token,
            color: color,
            users: userData['users'].map(value => {
                return {
                    username: value.username,
                    color: value.color
                }
            })
        })
    }
}

exports.login = async (req, res) => {

    if (req.body.chat.length < 3 || req.body.username.length < 3 || req.body.chat.length > 16 || req.body.username.length > 16) {

        return res.render("index.ejs", {
            error: 02
        })

    }

    let chatExist = await chatData.exists({
        channelID: req.body.chat
    })
    let userExist = await chatData.exists({
        channelID: req.body.chat,
        "users.username": req.body.username
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
            channelID: req.body.chat
        }, {
            $push: {
                users: {
                    username: req.body.username,
                    token: token,
                    color: hexRgb(req.body.hex)
                }
            }
        })

        req.session.regenerate(function () {
            req.session.token = token
            req.session.chat = req.body.chat
            res.redirect('/');
        });

    } else {
        // Channel exist, User exist
        // Change Username and TRY AGAIN!

        res.render("index.ejs", {
            error: 01
        })
    }

}

exports.logout = async (req, res) => {

    req.session.destroy()
    res.redirect("/")

}