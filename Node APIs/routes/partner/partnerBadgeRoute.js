const express = require("express");
const router = express.Router();
const partnerBadgeController = require("../../controller/partner/partnerBadgesController")

const { isAdmin, verifyGuestOrUser } = require("../../middleware/authtoken");

// partner Badge crud operations
router.post("/partner/Badge/create", isAdmin, partnerBadgeController.createPartnerBadge);
router.post("/partner/Badge/edit/:id", isAdmin, partnerBadgeController.editPartnerBadge);
router.patch("/partner/Badge/delete/:id", isAdmin, partnerBadgeController.deletePartnerBadge);
router.get("/partner/Badge/list", isAdmin, partnerBadgeController.getAllPartnerBadge);
router.get("/partner/Badge/detail/:id", isAdmin, partnerBadgeController.getPartnerBadgeById);
router.post("/partner/badgesReorder", isAdmin, partnerBadgeController.badgesReorder);
router.get("/partner/Badge/partnerBadgelist", partnerBadgeController.getAllPartnerBadgeList);

// clone partner API route for admin
router.post("/partner/clonePartner", isAdmin, partnerBadgeController.clonePartner);

// user partner search API routes
router.post("/addPartnerSearch", verifyGuestOrUser, partnerBadgeController.addPartnerSearchHistory);
router.post("/removePartnerSearch/:id", verifyGuestOrUser, partnerBadgeController.removePartnerSearchHistory);
router.get("/topPartnerSearch", verifyGuestOrUser, partnerBadgeController.topPartnerSearchHistory);
router.get("/allPartnerList", verifyGuestOrUser, partnerBadgeController.allPartnerList);

module.exports = router;