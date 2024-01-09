const express = require("express");
const router = express.Router();
const { verifyToken, isAdmin } = require("../middleware/authtoken");
const controller = require("../controller/postController");
const { uploadmedia, resizeImages } = require("../utils/mediaUpload");

router.post("/post/feelingsactivity/create", controller.createFeelingsActivity);
router.get("/post/feelingsactivity", controller.getAllFeelings);

router.post(
  "/post/create",
  verifyToken,
  uploadmedia,
  resizeImages,
  controller.createPost
);
router.post(
  "/AS/post/create",
  isAdmin,
  uploadmedia,
  resizeImages,
  controller.createPost_AS
);

router.put(
  "/post/edit",
  verifyToken,
  uploadmedia,
  resizeImages,
  controller.editPost
);
router.put(
  "/AS/post/edit",
  isAdmin,
  uploadmedia,
  resizeImages,
  controller.editPost_AS
);

router.put("/post/like/:postId", verifyToken, controller.likePost);
router.put("/AS/post/like/:postId", isAdmin, controller.likePost_AS);

router.put("/post/:postId/pollvote", verifyToken, controller.updatePollVote);
router.put("/AS/post/:postId/pollvote", isAdmin, controller.updatePollVote_AS);

router.put("/post/saved/:postId", verifyToken, controller.savePostByUser);
router.put("/video/saved/:videoId", verifyToken, controller.saveVideoByUser);

router.put(
  "/post/hideFromFeed/:postId/group/:groupId",
  isAdmin,
  controller.hideFromFeedPost
);
router.put(
  "/post/makeannoucement/:postId/group/:groupId",
  isAdmin,
  controller.makeAnnouncement
);

router.put("/post/delete", verifyToken, controller.deletePost);
router.put("/AS/post/delete", isAdmin, controller.deletePost_AS);

router.get("/post/:postId", verifyToken, controller.getPostById);
router.get("/AS/post/:postId", isAdmin, controller.getPostById_AS);

router.get("/post/view/all", verifyToken, controller.getPostAll);
router.get("/post/all/byuser", verifyToken, controller.getAllPostByUsers);
router.get("/post/saved/all", verifyToken, controller.getsavedpost);
router.get("/video/saved/all", verifyToken, controller.getsavedVideo);
router.get("/post/annoucements/forUser", verifyToken, controller.getAllAnnouncementPost_forAuthUser_whithinAllGroups);
router.get("/user/media/:userId", verifyToken, controller.getMediaForUser);
router.get("/sharepost/:postId", verifyToken, controller.sharepost);

module.exports = router;
