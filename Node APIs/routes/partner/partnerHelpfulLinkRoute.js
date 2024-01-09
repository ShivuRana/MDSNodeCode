const express = require("express");
const router = express.Router();
const parterHelpfulLinksController = require("../../controller/partner/helpfulLinkController")
const {uploadPartnerHelpfulLinkIcon, uploadPartnerHelpfulLinkIconS3Bucket} = require("../../utils/mediaUpload");
const { isAdmin } = require("../../middleware/authtoken");

// helpful links crud operations
router.post("/partner/helpfullinks/create", isAdmin, uploadPartnerHelpfulLinkIcon, uploadPartnerHelpfulLinkIconS3Bucket, parterHelpfulLinksController.createParnerHelpFulLinks);
router.post("/partner/helpfullinks/edit/:id", isAdmin, uploadPartnerHelpfulLinkIcon, uploadPartnerHelpfulLinkIconS3Bucket, parterHelpfulLinksController.editParnerHelpFulLinks);
router.patch("/partner/helpfullinks/delete/:id", isAdmin, parterHelpfulLinksController.deletePartnerhelpfulLinks);
router.get("/partner/helpfullinks/list/:partnerId", isAdmin, parterHelpfulLinksController.getPartnerhelpfulLinksByPartnerId);
router.get("/partner/helpfullinks/detail/:id", isAdmin, parterHelpfulLinksController.getPartnerhelpfulLinksById);
module.exports = router;