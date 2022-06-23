const router = require("express").Router()
      controller = require("./controllers/controller")

router.get("/", controller.main)
router.post("/login", controller.login)
router.post("/logout", controller.logout)

module.exports = router