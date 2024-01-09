const express = require("express");
const router = express.Router();
const { isAdmin, verifyGuestOrUser } = require("../../middleware/authtoken");
const controller = require("../../controller/partner/filterPartnerController")
const statisticController = require("../../controller/partner/partnerStatisticsController")


// partner filter and search routes
router.get("/getPartnerBySearchAndFilter", verifyGuestOrUser, controller.getPartnerBySearchAndFilter);
router.get("/getPartnerByFilter", verifyGuestOrUser, controller.getPartnerByFilter);
router.get("/getPartnerBySorting", verifyGuestOrUser, controller.getPartnerBySorting);
router.get("/getPartnerByFilterAndSorting", verifyGuestOrUser, controller.getPartnerByFilterAndSorting);
router.get("/getPartnerDetails/:id", verifyGuestOrUser, controller.getPartnerDetails);
router.get("/getPartnerReviewDetails/:id", verifyGuestOrUser, controller.getPartnerReviewDetails);

router.get("/getPartnerDetailVideos/:id", verifyGuestOrUser, controller.getPartnerDetailVideos);
router.get("/getPartnerDetailPosts/:id", verifyGuestOrUser, controller.getPartnerDetailPosts);
router.get("/getPartnersInOtherCategories/:id", verifyGuestOrUser, controller.getPartnersInOtherCategories);

/*admi side apis*/
router.get("/getPartnerDetailsForAdmin/:id", isAdmin, controller.getPartnerDetails);
router.get("/getPartnerReviewDetailsForAdmin/:id", isAdmin, controller.getPartnerReviewDetails);
router.get("/getPartnerDetailVideosForAdmin/:id", isAdmin, controller.getPartnerDetailVideos);
router.get("/getPartnerDetailPostsForAdmin/:id", isAdmin, controller.getPartnerDetailPosts);
router.get("/getPartnersInOtherCategoriesForAdmin/:id", isAdmin, controller.getPartnersInOtherCategories);
router.get("/getClaimOfferDetailsForAdmin/:id", isAdmin, statisticController.getClaimOfferDetails);

//category list for drop down - partner listing page
router.get("/AllCategoryListForUser", verifyGuestOrUser, controller.getAllCategoryLists);
module.exports = router;