const express = require("express");
const router = express.Router();
const partnerPostController = require("../../controller/partner/partnerPostController")

const { isAdmin, verifyToken } = require("../../middleware/authtoken");

// partner post crud operations
router.post("/partner/post/create", isAdmin, partnerPostController.createPartnerPost)
router.post("/partner/post/edit/:id", isAdmin, partnerPostController.editPartnerPost)
router.post("/partner/post/applyurltoposts", isAdmin, partnerPostController.applyUrlToPost)
router.patch("/partner/post/delete/:id", isAdmin, partnerPostController.deletePartnerPost);
router.get("/partner/post/list/:partnerId", isAdmin, partnerPostController.getPartnerPostByPartnerId);
router.get("/partner/post/detail/:id", isAdmin, partnerPostController.getPartnerPostById);
router.post("/partner/post/applyurltoallpostsbtn", isAdmin, partnerPostController.applyUrlToAllPostsBtn)
module.exports = router;