const express = require("express");
const router = express.Router();
const controller = require("../../controller/socketChatController/chatListController");
const chatController = require("../../controller/socketChatController/chatTableController");
const { verifyToken } = require("../../middleware/authtoken");
router.get("/syncOldChatsInChatList", controller.syncOldChatsInChatList);
router.get("/retriveUserChatList/:id", controller.retriveUserChatList);
router.get(
  "/getLastMessageForReceiverAPI",
  controller.getLastMessageForReceiverAPI
);
router.get(
  "/sumOfUnreadMessageForUserForAPI/:userId",
  controller.sumOfUnreadMessageForUserForAPI
);
router.get(
  "/updateUserTimeStampWithMessageTimeStamp/:page",
  chatController.updateUserTimeStampWithMessageTimeStamp
);
router.get(
  "/clearAllUsersSocketOnlineOfflineStatus",
  controller.clearAllUsersSocketOnlineOfflineStatus
);
router.get(
  "/getMuteChatIdListForUser",
  verifyToken,
  chatController.getMuteChatListForUser
);
router.get(
  "/updateImageVideoDocumentFields/:page",
  chatController.assignImageVideoDocumentFields
);
router.get(
  "/assignAspectRatioFields/:page",
  chatController.assignAspectRatioFields
);
router.get(
  "/changeMuteNotificationField",
  chatController.changeMuteNotificationField
);
module.exports = router;
