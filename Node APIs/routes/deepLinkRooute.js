const express = require("express");
const router = express.Router();
const controller = require("../controller/deepLinkController");

const { isAdmin, verifyGuestOrUser } = require("../middleware/authtoken");

// chat user access routes
router.post("/chat/checkChatAccess", verifyGuestOrUser, controller.checkChatAccess);
router.post("/event/checkEventAccess", verifyGuestOrUser, controller.checkEventAccess);
router.post("/video/checkVideoAccess", verifyGuestOrUser, controller.checkVideoAccess);

module.exports = router;