const express = require("express");
const router = express.Router();
const { verifyToken, isAdmin } = require("../../middleware/authtoken");
const controller = require("../../controller/contentArchiveManagement/contentCommentController");

router.post("/video/:videoId/comment", verifyToken, controller.createComment);
router.post("/AS/video/:videoId/comment", isAdmin, controller.createComment_AS);

router.post("/video/:videoId/comments/:commentId/replies", verifyToken, controller.createReply);
router.post("/AS/video/:videoId/comments/:commentId/replies", isAdmin, controller.createReply_AS);

router.put("/video/:videoId/comments/:commentId/like", verifyToken, controller.likeComment);
router.put("/AS/video/:videoId/comments/:commentId/like", isAdmin, controller.likeComment_AS);

router.get("/video/:videoId/comments/replies/all", verifyToken, controller.getComments_Replies);
router.get("/AS/video/:videoId/comments/replies/all", isAdmin, controller.getComments_Replies_AS);

router.delete("/video/:videoId/comments/:commentId/delete", verifyToken, controller.deleteCommentsReplies);
router.delete("/AS/video/:videoId/comments/:commentId/delete", isAdmin, controller.deleteCommentsReplies_AS);

router.patch("/video/:videoId/editComment", verifyToken, controller.editComment);
router.patch("/video/:videoId/editComment", isAdmin, controller.editComment);

module.exports = router;
