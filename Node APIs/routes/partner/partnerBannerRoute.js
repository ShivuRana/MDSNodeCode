const express = require("express");
const router = express.Router();
const controller = require("../../controller/partner/partnerBannerController");
const { uploadPartnerBannerImage, uploadPartnerBannerImageS3Bucket } = require("../../utils/mediaUpload");

const { isAdmin, verifyToken, verifyGuestOrUser } = require("../../middleware/authtoken");



/** partner banner admin APIs routes **/
router.get("/partnerBanner/list", isAdmin, controller.getPartnerBanner);
router.post("/createPartnerBanner", isAdmin, uploadPartnerBannerImage, uploadPartnerBannerImageS3Bucket, controller.createPartnerBanner);
router.patch("/updatePartnerBanner/:id", isAdmin, uploadPartnerBannerImage, uploadPartnerBannerImageS3Bucket, controller.updatePartnerBanner);

/** partner banner front end API routes **/
router.get("/getPartnerBanner", verifyGuestOrUser, controller.getPartnerBannerByUser);

module.exports = router;