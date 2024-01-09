const express = require("express");
const router = express.Router();
const {
  createTopic,
  getAllTopics,
  getAllTopicsByGroup,
  getTopicById,
  editTopic,
  deleteTopic,
  starredTopic,
  removeFromStarredTopic,
  getListofStarredTopicsforUser,
  getListofTopicbyGroupforLoginUser,
} = require("../controller/topicController");
const { topicUpload, uploadTpcImgToS3Bucket } = require("../utils/mediaUpload");
const { verifyToken, isAdmin } = require("../middleware/authtoken");

router.post(
  "/topic/create",
  isAdmin,
  topicUpload,
  uploadTpcImgToS3Bucket,
  createTopic
);
router.post("/topic/starred", verifyToken, starredTopic);

router.put(
  "/topic/edit/:topicId",
  isAdmin,
  topicUpload,
  uploadTpcImgToS3Bucket,
  editTopic
);

router.get("/topic/all", isAdmin, getAllTopics);
router.get("/topic/bygroup/:groupId", verifyToken, getAllTopicsByGroup);
router.get("/topic/bygroup_byadmin/:groupId", isAdmin, getAllTopicsByGroup);
router.get("/topic/:topicId", verifyToken, getTopicById);
router.get("/topic/starred/list", verifyToken, getListofStarredTopicsforUser);
router.get(
  "/topic/groupby/list",
  verifyToken,
  getListofTopicbyGroupforLoginUser
);

router.delete("/topic/delete/:topicId", isAdmin, deleteTopic);
router.delete(
  "/topic/remove/starred/:topicId",
  verifyToken,
  removeFromStarredTopic
);

module.exports = router;
