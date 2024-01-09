const express = require("express");
const router = express.Router();
const controller = require("../../controller/partner/partnerReviewController");
const { uploadPartnerImages, uploadPartnerImagesS3Bucket } = require("../../utils/mediaUpload");

const { isAdmin, verifyToken, verifyGuestOrUser } = require("../../middleware/authtoken");

// partner review crud operations from the user side
router.post("/createPartnerReview", verifyGuestOrUser, controller.createPartnerReview);
router.post("/editPartnerReview/:id", verifyGuestOrUser, controller.editPartnerReview);
router.patch("/deletePartnerReview/:id", verifyGuestOrUser, controller.deletePartnerReview);
router.get("/getAllPartnerReview/list", verifyGuestOrUser, controller.getAllPartnerReviewList);
router.post("/reportReview", verifyGuestOrUser, controller.reportReview);


// partner review admin APIs routes
router.get("/partnerReview/list", isAdmin, controller.getPartnerReviewList);
router.get("/reviewDetail/:id", isAdmin, controller.getPartnerReviewDetail);
router.get("/reviewsByPartner/:id", isAdmin, controller.getPartnerReviewListById);
router.patch("/deleteReview/:id", isAdmin, controller.deleteReview);
router.post("/approveOrRejectReview/:id", isAdmin, controller.approveOrRejectPartnerReview);
router.post("/sendApproveOrRejectReviewEmail/:id", isAdmin, controller.sendApproveOrRejectPartnerReviewEmail);

//partner new review
router.get("/getNewPartnerReview", isAdmin, controller.getNewPartnerReviewCount);
router.post("/UpdateNewPartnerReviewFlag", isAdmin, controller.UpdateNewPartnerReviewFlag);
router.get("/getPartnerReviewReportUserList/:id", isAdmin, controller.getPartnerReviewReportUserList);

module.exports = router;