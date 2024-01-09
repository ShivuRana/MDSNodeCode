const express = require("express");
const router = express.Router();
const controller = require("../../controller/partner/partnerReasonsController")
const { isAdmin, verifyToken, verifyGuestOrUser } = require("../../middleware/authtoken");

// partner post crud operations
router.post("/partner/createReason", isAdmin, controller.createPartnerReason);
router.post("/partner/editReason/:id", isAdmin, controller.editPartnerReason);
router.patch("/partner/deleteReason/:id", isAdmin, controller.deletePartnerReason);
router.get("/partner/getReasonList", isAdmin, controller.getAllPartnerReason);
router.get("/partner/getReasonDetail/:id", isAdmin, controller.getPartnerReasonById);

router.post("/addVidosInPartners", isAdmin, controller.addVidosInPartners);
router.patch("/removeVidosFromPartner/:id", isAdmin, controller.removeVidosFromPartner);
router.get("/getContentVideolistForPartner", isAdmin, controller.getContentVideolistForPartner);
router.get("/getVideoListByPartner/:id", isAdmin, controller.getVideoListByPartner);
router.post("/partner/updateRelatedVideoStatus/:id", isAdmin, controller.updateRelatedVideoStatus);
router.post("/partner/reorderVideosInPartners/:id", isAdmin, controller.reorderVideosInPartners);
router.post("/partner/addVideosByTagInPartners", isAdmin, controller.addVideosByTagInPartners);

module.exports = router;