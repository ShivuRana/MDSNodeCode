const express = require("express");
const router = express.Router();
const { getmessage, savefiles, saveFilesGroup, get_chat_listingData, get_chat_listing, getChatDetail, delete_message, clearChat, get_media_files, getgroupmember, starchat, getUserStarChat, blockchat, searchChat, getMessageDetail, getChatDetailWeb, testNotification, muteChat, temp } = require("../controller/chatcontroller");
const { getChatDetailForAPI} = require("../controller/socketChatController/chatDetailController")
const { testChat } = require("../controller/chatcontroller");
const { uploadChatFile, uploadChatFileToS3Bucket, uploadGroupChatFileToS3Bucket, chatgroupUploads, uploadChatGrpImgToS3Bucket } = require("../utils/mediaUpload");
const { verifyToken, isAdmin, verifyGuestOrUser } = require("../middleware/authtoken");

router.post("/chat/upload/files", uploadChatFile, uploadChatFileToS3Bucket, verifyGuestOrUser, savefiles);
router.post("/chat/group/upload/files", uploadChatFile, uploadGroupChatFileToS3Bucket, verifyGuestOrUser, saveFilesGroup);
router.get("/chat/getchatlist", verifyGuestOrUser, get_chat_listingData);
// router.get("/chat/getlist", verifyGuestOrUser, get_chat_listing);
router.get("/chat/getlist", verifyGuestOrUser, testChat);
router.get("/chat/getchatdetail/:id/:type", verifyGuestOrUser, getChatDetail);
router.get("/chat/getchatdetailweb/:id/:type", verifyGuestOrUser, getChatDetailWeb);
router.get("/chat/getchatdetailwebNew/:id/:type", verifyGuestOrUser, getChatDetailForAPI);

router.get("/chat/getmessagedetail/:id", verifyGuestOrUser, getMessageDetail)
router.delete("/chat/deletemessage/:id", verifyGuestOrUser, delete_message);
router.get("/chat/media/files/links/:id", verifyGuestOrUser, get_media_files);
router.get("/chat/getallmemeber/:id", verifyGuestOrUser, getgroupmember);
router.get("/chat/getstarchat", verifyGuestOrUser, getUserStarChat);
router.post("/chat/star/:id", verifyGuestOrUser, starchat);
router.post("/chat/block/:id", verifyGuestOrUser, blockchat);
router.post("/chat/clearChat", verifyGuestOrUser, clearChat);
router.post("/chat/searchChat", verifyGuestOrUser, searchChat);
router.post("/chat/muteChat", verifyGuestOrUser, muteChat);
router.post("/chat/message", testChat);

router.get("/chat/getallmessages/:userid/:type", verifyGuestOrUser, getmessage);
router.post("/chat/testNotification", testNotification);
// router.post("/chat/temp", temp)
module.exports = router; 