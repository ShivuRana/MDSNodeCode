const express = require("express");
const router = express.Router();
const { uploadChannelIcon, uploadChannelIconS3Bucket } = require("../utils/mediaUpload");
const { verifyToken, isAdmin, verifyGuestOrUser } = require("../middleware/authtoken");
const chatChannelController = require("../controller/chatChannelController");
// chat channel crud operation routes
router.post("/create/channel", uploadChannelIcon, uploadChannelIconS3Bucket, isAdmin, chatChannelController.createChatChannel);
router.get("/list/channel", isAdmin, chatChannelController.getChannelList);
router.patch("/delete/channel/:id", isAdmin, chatChannelController.deleteChannel);
router.patch("/edit/channel/:id", uploadChannelIcon, uploadChannelIconS3Bucket, isAdmin, chatChannelController.editChatChannel);
router.get("/get/channel/members/:id", isAdmin, chatChannelController.getChannelAndMembers)
router.get("/get/channel/members/frondend/:id", verifyGuestOrUser, chatChannelController.getChannelAndMembers)

module.exports = router;