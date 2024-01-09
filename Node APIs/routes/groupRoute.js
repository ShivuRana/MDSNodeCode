const express = require("express");
const router = express.Router();
const {
  groupUploads,
  uploadGrpImgToS3Bucket,
  uploadGroupFile,
  uploadGroupFilesToS3,
} = require("../utils/mediaUpload");
const {
  createGroup,
  updateGroupProfileImg,
  getLoginuser_joingrp_latest5Files,
  updateGroupDetails,
  editGroupSettings,
  getGroupByID,
  getAllGroups,
  deleteGroup,
  joinGroup,
  leaveGroup,
  groupInvitationToFriends,
  getUserFriedsList,
  getallgroupmember,
  getPostsByGroupId,
  getPostsByGroupId_forUsers,
  cloneGroup,
  deleteGroupMember,
  getAnnouncementPosts_forAdmin_byGroup,
  getHidePosts_forAdmin_byGroup,
  getJoinGrouplistforAuthuser,
  starredGroup,
  removeFromStarredGroup,
  getListofStarredGRoupsforUser,
  getListofAllGroupsWITHstarredForUser,
  getAllPosts__ofAllgroupMember_forAuthUser_joinGroups,
  getGroupMedia_ofallPosts_ofAllmembers,
  uploadFiles_group,
  getGroupsAllUploadedFiles,
  deleteGroupFilebyUser,
  getallgroupmember_AS,
  getGroupByID_admin,
  getPostsByGroupIdAndTopicId_forUsers,
  getJoinAccessGrouplistforAuthuser,
} = require("../controller/groupController");

const { verifyToken, isAdmin } = require("../middleware/authtoken");

router.post(
  "/group/create",
  isAdmin,
  groupUploads,
  uploadGrpImgToS3Bucket,
  createGroup
);
router.post("/group/clone", isAdmin, cloneGroup);

router.put(
  "/group/:groupId/update/profileImg",
  isAdmin,
  groupUploads,
  uploadGrpImgToS3Bucket,
  updateGroupProfileImg
);
router.put(
  "/group/:groupId/update",
  isAdmin,
  groupUploads,
  uploadGrpImgToS3Bucket,
  updateGroupDetails
);
router.put("/group/:groupId/settings", isAdmin, editGroupSettings);
router.put(
  "/group/:groupId/memberDelete/:memberId",
  isAdmin,
  deleteGroupMember
);

router.get("/groups/all", isAdmin, getAllGroups);
router.get(
  "/group/:groupId/annoucements",
  isAdmin,
  getAnnouncementPosts_forAdmin_byGroup
);
router.get("/group/:groupId/hidePosts", isAdmin, getHidePosts_forAdmin_byGroup);
router.delete("/group/delete/:groupId", isAdmin, deleteGroup);
// for normal user api
router.post("/group/join", verifyToken, joinGroup);
router.post("/group/:groupId/invite", verifyToken, groupInvitationToFriends);
router.post("/group/starred", verifyToken, starredGroup);
router.post(
  "/group/:groupId/uploadFile",
  verifyToken,
  uploadGroupFile,
  uploadGroupFilesToS3,
  uploadFiles_group
);

router.put("/group/:groupId/leave", verifyToken, leaveGroup);

router.get("/group/:groupId", verifyToken, getGroupByID);
router.get("/user/friendlist", verifyToken, getUserFriedsList);
// get post by group id for admin as well for each user by user id
router.get("/AS/group/:groupId/allPost", isAdmin, getPostsByGroupId);
router.get("/group/:groupId/allPost", verifyToken, getPostsByGroupId_forUsers);
router.get(
  "/group/:groupId/:topicId/allPost",
  verifyToken,
  getPostsByGroupIdAndTopicId_forUsers
);
router.get(
  "/group/:groupId/allPost/media",
  verifyToken,
  getGroupMedia_ofallPosts_ofAllmembers
);
router.get(
  "/user/join/access/group",
  verifyToken,
  getJoinAccessGrouplistforAuthuser
);
router.get("/user/join/group", verifyToken, getJoinGrouplistforAuthuser);
router.get("/group/starred/list", verifyToken, getListofStarredGRoupsforUser);
router.get(
  "/user/group/all",
  verifyToken,
  getListofAllGroupsWITHstarredForUser
);
router.get("/group/getmembers/:groupId", verifyToken, getallgroupmember);
router.get("/AS/group/getmembers/:groupId", isAdmin, getallgroupmember_AS);
router.get(
  "/userJoin/groups/allPosts/allMembers",
  verifyToken,
  getAllPosts__ofAllgroupMember_forAuthUser_joinGroups
);
router.get("/group/:groupId/files", verifyToken, getGroupsAllUploadedFiles);
router.get(
  "/groups/latest/files",
  verifyToken,
  getLoginuser_joingrp_latest5Files
);

router.get("/group_byadmin/:groupId", isAdmin, getGroupByID_admin);

router.delete(
  "/group/remove/starred/:groupId",
  verifyToken,
  removeFromStarredGroup
);
router.delete(
  "/group/:groupId/remove/file/:fileId",
  verifyToken,
  deleteGroupFilebyUser
);

module.exports = router;
