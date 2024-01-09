const express = require("express");
const router = express.Router();
const { chatgroupUploads, uploadChatGrpImgToS3Bucket } = require("../utils/mediaUpload");
const { verifyToken, isAdmin, verifyGuestOrUser } = require("../middleware/authtoken");
const chatGroupController = require("../controller/chatGroupController");

/** Admin Routes **/
router.post("/chat/addAndUpdateSetting", isAdmin, chatGroupController.addAndUpdateSetting);

/** User Routes **/
router.post("/chat/creategroup", chatgroupUploads, uploadChatGrpImgToS3Bucket, verifyGuestOrUser, chatGroupController.createUserChatGroup);
router.get("/chat/getallgroup", verifyGuestOrUser, chatGroupController.getAllChatGroup);
router.get("/chat/group/getgroupbyid/:groupid", verifyGuestOrUser, chatGroupController.getGroupById);
router.get("/chat/group/getgroupmember/:groupid", verifyGuestOrUser, chatGroupController.getAllGroupMember);
router.post("/chat/group/invite/:groupid", verifyGuestOrUser, chatGroupController.groupInvitationToUser);
router.post("/chat/group/join", verifyGuestOrUser, chatGroupController.joinGroup);
router.put("/chat/editgroup/:groupid", chatgroupUploads, uploadChatGrpImgToS3Bucket, verifyGuestOrUser, chatGroupController.editUserChatGroup);
router.put("/chat/group/addmember/:groupid", verifyGuestOrUser, chatGroupController.addGroupMember);
router.put("/chat/group/removemember/:groupid", verifyGuestOrUser, chatGroupController.removeGroupMember);
router.post("/chat/deletegroup/:groupid", verifyGuestOrUser, chatGroupController.deleteGroup);
router.put("/chat/leaveGroup/:groupid", verifyGuestOrUser, chatGroupController.leaveFromGroup);
router.get("/chat/group/getgroupfiles/:id", verifyGuestOrUser, chatGroupController.listOfFile);
router.get("/chat/group/getgroupmedia/:id", verifyGuestOrUser, chatGroupController.listOfMedia);
router.get("/chat/group/getgroupurl/:id", verifyGuestOrUser, chatGroupController.listOfUrl);

module.exports = router; 