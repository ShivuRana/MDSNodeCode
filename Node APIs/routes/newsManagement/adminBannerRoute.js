const express = require("express");
const router = express.Router();
const { verifyToken, isAdmin } = require("../../middleware/authtoken");
const { uploadBannerImage, uploadBannerImageS3Bucket } = require("../../utils/mediaUpload");
const adminBannerController = require("../../controller/newsManagement/adminBannerController");

router.post("/news/createBanner", isAdmin, uploadBannerImage, uploadBannerImageS3Bucket, adminBannerController.createBanner);
router.patch("/news/editBanner/:id", isAdmin, uploadBannerImage, uploadBannerImageS3Bucket, adminBannerController.editBanner);
router.patch("/news/deleteBanner/:id", isAdmin, adminBannerController.deleteBanner);
router.get("/news/getAllBanner", isAdmin, adminBannerController.getAllBanner);
router.get("/news/getBannerById/:id", isAdmin, adminBannerController.getBannerDetail);
router.post("/news/reOrderBanner", isAdmin, adminBannerController.reorderBanner);
router.get("/news/getAllBannerUsers", verifyToken, adminBannerController.getAllBannerUsers);
module.exports = router;  