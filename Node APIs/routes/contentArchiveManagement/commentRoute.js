const express = require("express");
const router = express.Router();
const { verifyToken, isAdmin } = require("../../middleware/authtoken");
const controller = require("../../controller/contentArchiveManagement/commentController");

router.post("/post/:postId/comment", verifyToken, controller.createComment);
router.post("/AS/post/:postId/comment", isAdmin, controller.createComment_AS);

router.post(
  "/post/:postId/comments/:commentId/replies",
  verifyToken,
  controller.createReply
);
router.post(
  "/AS/post/:postId/comments/:commentId/replies",
  isAdmin,
  controller.createReply_AS
);

router.put(
  "/post/:postId/comments/:commentId/like",
  verifyToken,
  controller.likeComment
);
router.put(
  "/AS/post/:postId/comments/:commentId/like",
  isAdmin,
  controller.likeComment_AS
);

router.put(
  "/post/:postId/comments/:commentId/edit",
  verifyToken,
  controller.editCommentsReplies
);

router.get(
  "/post/:postId/comments/replies/all",
  verifyToken,
  controller.getComments_Replies
);
router.get(
  "/AS/post/:postId/comments/replies/all",
  isAdmin,
  controller.getComments_Replies_AS
);

router.delete(
  "/post/:postId/comments/:commentId/delete",
  verifyToken,
  controller.deleteCommentsReplies
);
router.delete(
  "/AS/post/:postId/comments/:commentId/delete",
  isAdmin,
  controller.deleteCommentsReplies_AS
);

router.put("/post/:postId/comments/:commentId/edit", verifyToken, controller.editCommentsReplies);

module.exports = router;
