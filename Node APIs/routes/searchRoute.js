const express = require("express");
const router = express.Router();
const searchController = require("../controller/searchContoller");
const { verifyToken } = require("../middleware/authtoken");


// router.get("/GS/join_groups/:userId", searchController.listOfJoinGroup_authUser);
router.get("/GS/topics", verifyToken, searchController.accessibleTopicsListForAuthUser);
router.get("/GS/user-friends", verifyToken, searchController.loginUserFriendsList);
router.get("/GS/global-search", verifyToken, searchController.globalSearchStage1);

module.exports = router;
