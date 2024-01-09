const express = require("express");
const userControllers = require("../../controller/userManagement/userController");
const eventControllers = require("../../controller/eventManagement/eventAttendeeManageController");
const router = express.Router();
const { uploadSignUPQuestionMedia, uploadQuestionsMediaToS3, userProfileImageUpload, uploadprofileImgToS3Bucket, uploadUserprofileImgToS3Bucket, uploadforQnA, bulkfile } = require("../../utils/mediaUpload");
const { verifyToken, isAdmin, verifyGuestOrUser } = require("../../middleware/authtoken");

router.post("/register", userControllers.createUser);
router.post("/userExist", userControllers.userExist);
router.post("/SocialuserExist", userControllers.checkUserbySocialId);
router.post("/sociallogin", userControllers.sociallogin);
router.post("/login", userControllers.userLogin);
router.post("/adminLogin", userControllers.adminLogin);
router.post("/forgot-pwd", userControllers.forgotPwd);
router.get("/getblockeduser", userControllers.getblockeduser);
router.post("/updateprofile", userControllers.updateprofile);
router.post("/deactivateuser", userControllers.deactivateuser);
router.post("/blockuser", userControllers.blockuser);
router.post("/unblockuser", userControllers.unblockuser);
router.post("/deleteuser", userControllers.deleteuser);
router.get("/getallusers", isAdmin, userControllers.getallusers);
router.get("/getAllAttendeeList",userControllers.getAllAttendeeList);
router.get("/getAllSpeakerList",userControllers.getAllSpeakerList);
router.get("/addBaseInProfile", isAdmin, userControllers.addBaseInProfile);
router.get("/getallusersLimitedFields", isAdmin, userControllers.getallusersLimitedFields);
// ** api by zp

router.post("/checkEmail", userControllers.checkUserbyEmail);
router.post("/register-oauth", userControllers.userAddAuth0Step);
router.post("/md/register-oauth", userControllers.userAddAuth0Step_flutter);

router.put("/register/personal-details", userControllers.savePersonaldetails_userStep);
router.put("/plan_payment", userControllers.payment_step);
// router.put("/signup-oauth", userControllers.signupOauthUser_flutter)
router.put("/QnA", uploadforQnA, uploadQuestionsMediaToS3, userControllers.questionAnswerStep);
router.put("/oauth-login", userControllers.userLoginby_oauth);

router.get("/QnA/list/:id", userControllers.getUserQuestionAnswerList);
router.get("/profile/:userId", userControllers.getUserProfile_forAdmin);
router.get("/attendeeProfile/:userId", userControllers.getAttendeeProfile_forAdmin);
router.post("/save/token", userControllers.storeUserToken);
router.post("/getlinkedinuserdetails", userControllers.getlinkedinuserdetails);
router.post("/save/questionsMedia/S3", uploadSignUPQuestionMedia, uploadQuestionsMediaToS3, userControllers.saveSIgnupQuestionsFiles);
router.post("/delete/questionsMedia/S3", userControllers.deleteSignUpQuestionFiles);

router.put("/edit", verifyToken, userProfileImageUpload, uploadprofileImgToS3Bucket, userControllers.editUserOwnProfile);
router.put("/edit/byadmin", isAdmin, userProfileImageUpload, uploadprofileImgToS3Bucket, userControllers.editUserProfilebyAdmin);
router.patch("/edit/attendeeProfileByAdmin", isAdmin, userProfileImageUpload, uploadUserprofileImgToS3Bucket, userControllers.editAttendeeProfilebyAdmin)
/*sheetal*/
router.put("/editimage/byadmin", isAdmin, userProfileImageUpload, uploadUserprofileImgToS3Bucket, userControllers.editUserProfileImagebyAdmin);
/*end*/
router.put("/manage/lastlogin", verifyToken, userControllers.manageUserlastLogin);
router.put("/active", isAdmin, userControllers.activeUserStatusBYadmin);

router.get("/get", verifyGuestOrUser, userControllers.getUserbyId);
router.get("/get/member/:memberId", verifyToken, userControllers.getOtherMemberProfileForLoginUser);
router.get("/get/commonGroup/oFmember/:memberId", verifyToken, userControllers.getCommonGroupListwithMember);
router.get("/get/member/joingroups/:memberId", verifyToken, userControllers.memberJoinGroupList);
router.get("/get/member/posts/:memberId", verifyToken, userControllers.getPosts_onlyPostedByGroupMember_forOtherMemberProfile);
// **

router.delete("/delete/all/exceptadmin", isAdmin, userControllers.deleteAllUsersExceptAdmin);
router.delete("/delete/allMedia", isAdmin, userControllers.deleteFoldersfromS3bucket);

// to verify user idtoken expire or not
router.get("/verify/idtoken", verifyToken, userControllers.verifyUserIDtoken);

router.get("/getalluseremailname", verifyToken, userControllers.getallusersname_email_user);

router.get("/AS/getalluseremailname", isAdmin, userControllers.getallusersname_email_admin);

router.post("/update/migrateduser", userControllers.updatemigrateduserinfo);
router.patch("/delete/migrateduser/:email", userControllers.deletemigrateduser);
router.get("/getauthtoken", userControllers.getaccesstoken);
router.delete("/deleteauthuser/:userid", userControllers.deleteauthuser);

router.post("/usermigration", userControllers.migrateuser);
router.get("/getconnectionid", userControllers.getconnectionid);
router.get("/jobstatus", userControllers.checkjobstatus);

router.get("/getuserfromauth/:authid", userControllers.getuserfromauth0);
router.post("/resend", userControllers.reSendOTP);
router.post("/verify", userControllers.verifyOTP);

router.post("/appletokenconvertdata", userControllers.appleTokenConvertData);

/** code by SJ start **/
router.get("/sendDeactivateRequest", verifyToken, userControllers.sendDeactivateRequest);
router.get("/getDeactivateRequestedUser", isAdmin, userControllers.getDeactivateRequestedUsers);
router.get("/getAllValidUser", verifyToken, userControllers.getAllValidUser);
router.get("/getAllValidUserAndAttendees", userControllers.getAllValidUserAndAttendees);
router.post("/addContactUser", userControllers.addContactUserData);
router.get("/getContactUserList", isAdmin, userControllers.getContactUserData);

router.post("/verifyInAppPurchase", verifyToken, userControllers.verifyInAppPurchase);
router.get("/getPayment", verifyToken, userControllers.getUserPayment);
router.post("/AppStorePurchase", userControllers.AppStorePurchase);
router.post("/GooglePlayPurchase", userControllers.GooglePlayPurchase);

router.get("/downloadUserExcel", isAdmin, userControllers.exportUser);
router.post("/importUserExcel", isAdmin, userControllers.importUser);
router.post("/addNremoveDevice", verifyGuestOrUser, userControllers.addNremoveDeviceToken);
router.get("/getProfile", verifyGuestOrUser, userControllers.getUserProfile);

router.get("/getAllUsersMembersAndAttendees", isAdmin, userControllers.getAllUsersMembersAndAttendees)
/** code by SJ end **/

/** code by sheetal **/
router.post("/airTableEventSyncUpForSingleUser", verifyGuestOrUser, userControllers.airTableEventSyncUpForSingleUser)
router.get("/getUserCollaboratorResources", verifyGuestOrUser, userControllers.userCollaboratorResources);
/*end*/
module.exports = router;
