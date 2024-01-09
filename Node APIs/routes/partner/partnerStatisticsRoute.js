const express = require("express");
const router = express.Router();
const controller = require("../../controller/partner/partnerStatisticsController");

const { isAdmin, verifyToken, verifyGuestOrUser } = require("../../middleware/authtoken");

// partner review admin APIs routes
router.get("/whoClickPartnerData/:id", isAdmin, controller.whoClickPartnerData);
router.get("/whoClickGetDetails/:id", isAdmin, controller.whoClickPartnerGetDetails);
router.get("/videoBasedOnPartner/:id", isAdmin, controller.nrOfVideoBasedOnPartner);
router.get("/partnerListClaimCount/:id", isAdmin, controller.partnerListWithClaimCount);
router.get("/partnerListViewCount/:id", isAdmin, controller.partnerListWithViewCount);
router.get("/postBasedOnPartner/:id", isAdmin, controller.nrOfPostBasedOnPartner);
router.get("/updateUserViewCountOfPartner/:id", verifyGuestOrUser, controller.updateUserViewCountOfPartner);
router.get("/updateUserClaimCountOfPartner/:id", verifyGuestOrUser, controller.updateUserClaimCountOfPartner);
router.get("/getClaimOfferDetails/:id", verifyGuestOrUser, controller.getClaimOfferDetails);
router.get("/partnerStatisticFieldcountDatewiseForAdmin", isAdmin, controller.partnerStatisticFieldCountByDateWiseForAdmin);
router.get("/partnerStatisticListForAdmin", isAdmin, controller.partnerStatisticListForAdmin);
router.get("/partnerStatisticAllCountForAdmin", isAdmin, controller.partnerStatisticAllCountForAdmin);
router.get("/partnerStatisticDateWiseFilterCountForAdmin", isAdmin, controller.partnerStatisticDateWiseFilterCountForAdmin);

module.exports = router;