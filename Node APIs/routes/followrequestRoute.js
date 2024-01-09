const express = require("express");
const router = express.Router();
const { verifyToken } = require("../middleware/authtoken");
const {
  acceptFollowRequest,
  unfollowUser,
  sendFollowRequest,
  undoFollowRequest,
  getFollowersbyUser,
  getFollowingbyUser,
  getlistofusers_fromloginusergetRequest,
  getFollowersforMember,
  getFollowingsforMember,
  searchFollowerFollowingUsers,
  cancleFollowRequest,
  getlistofusers_requestsendbyLoginuser,
} = require("../controller/followController");

router.post("/send/follow_request/:followId", verifyToken, sendFollowRequest);

router.put("/accept_follow_request/:id", verifyToken, acceptFollowRequest);
router.put("/unfollow_user/:id", verifyToken, unfollowUser);

router.get("/user/followers", verifyToken, getFollowersbyUser);
router.get("/user/following", verifyToken, getFollowingbyUser);
router.get(
  "/user/request/list",
  verifyToken,
  getlistofusers_fromloginusergetRequest
);
router.get(
  "/sendbyuser/request/list",
  verifyToken,
  getlistofusers_requestsendbyLoginuser
);
router.get("/member/followers/:memberId", verifyToken, getFollowersforMember);
router.get("/member/following/:memberId", verifyToken, getFollowingsforMember);
router.get(
  "/search/follower/:memberId",
  verifyToken,
  searchFollowerFollowingUsers
);

router.delete("/undo/follow/request/:followId", verifyToken, undoFollowRequest);
router.delete(
  "/cancel/followRequest/:followId",
  verifyToken,
  cancleFollowRequest
);

module.exports = router;
