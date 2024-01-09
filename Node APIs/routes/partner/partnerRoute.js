const express = require("express");
const router = express.Router();
const partnerController = require("../../controller/partner/partnerController")
const { uploadPartnerImages, uploadPartnerImagesS3Bucket } = require("../../utils/mediaUpload");

const { isAdmin, verifyToken } = require("../../middleware/authtoken");

// partner crud operations-admin
router.post("/partner/create", isAdmin, uploadPartnerImages, uploadPartnerImagesS3Bucket, partnerController.createPartner)
router.post("/partner/edit/:id", isAdmin, uploadPartnerImages, uploadPartnerImagesS3Bucket, partnerController.editPartner)
router.patch("/partner/delete/:id", isAdmin, partnerController.deletePartner);
router.get("/partner/list", isAdmin, partnerController.getPartnerList);
router.post("/partner/badgeFilterWiseReOrderPartner", isAdmin, partnerController.badgeFilterWiseReOrderPartner);

router.get("/allPartner/list", isAdmin, partnerController.getAllPartnerList);
router.get("/partner/detail/:id", isAdmin, partnerController.getPartnerById);
router.patch("/updateStatusPartner/:id", isAdmin, partnerController.updateStatusPartner);

//partner-featured or freshdeal apis-admin side
router.get("/partner/getPublishedPartnersList", isAdmin, partnerController.getPublishedPartnersList);
router.get("/partner/getFeaturedOrFreshdealPartnersList", isAdmin, partnerController.getFeaturedOrFreshdealPartnersList);
router.post("/partner/addFeaturedOrFreshDealPartners", isAdmin, partnerController.addFeaturedOrFreshDealPartners);
router.patch("/partner/removeFeaturedOrFreshDealPartners/:partnerId", isAdmin, partnerController.removeFeaturedOrFreshDealPartner);
router.post("/partner/reorderFeaturedOrFreshdealPartner", isAdmin, partnerController.reorderFeaturedOrFreshDealPartner);

//categories for partners
// router.post("/partner/addCategoryForPartnerWithOrder", isAdmin, partnerController.addCategoryForPartnerWithOrder);
// router.post("/partner/addViewsToCategory", isAdmin, partnerController.addViewsToCategory);
// router.patch("/partner/removeSingleCategoryForPartner/:id", isAdmin, partnerController.removeSingleCategoryForPartnerWithOrder);
// router.get("/partner/getNotSelectedCategoryListForPartner", isAdmin, partnerController.getNotSelectedCategoryListForPartner);
// router.get("/partner/getSelectedCategoryListForPartner", isAdmin, partnerController.getSelectedCategoryListForPartner);
// router.post("/partner/redorderCategoryForPartnerWithOrder", isAdmin, partnerController.redorderCategoryForPartnerWithOrder);

//category list for partner
router.get("/partner/categoryListForPartner", isAdmin, partnerController.getCategoryListForPartner);
router.get("/partner/partnerListByCategory/:categoryId", isAdmin, partnerController.getCategoryWisePartnerList);

// partner operations-user
router.get("/user/partner/detail/:id", verifyToken, partnerController.getPartnerByIdForUser);
router.get("/user/partner/featuredOrFreshDealPartnersListForUser", verifyToken, partnerController.getFeaturedOrFreshDealPartnersListForUser);

// category list related routes - user - frontend side
router.get("/partner/categoryListForUser", verifyToken, partnerController.getFrontendCategoryListForPartner);

//User
router.get("/partner/selectPartnerlist", verifyToken, partnerController.getSelectPartnerList);
router.get("/partner/reviewCountByUserId", verifyToken, partnerController.getReviewCountByUserId);

module.exports = router;