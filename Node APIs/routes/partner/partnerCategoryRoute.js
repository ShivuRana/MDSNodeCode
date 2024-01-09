const express = require("express");
const router = express.Router();
const controller = require("../../controller/partner/partnerCategoryController");
const mediaUpload = require("../../utils/mediaUpload");

const { verifyToken, isAdmin, verifyGuestOrUser } = require("../../middleware/authtoken");

router.post("/partner/category/create", isAdmin, mediaUpload.uploadCategoryImage, mediaUpload.uploadCategoryImageS3Bucket, controller.createCategoty);
router.put("/partner/category/edit/:id", isAdmin, mediaUpload.uploadCategoryImage, mediaUpload.uploadCategoryImageS3Bucket, controller.editCategory);
router.delete("/partner/category/delete/:id", isAdmin, controller.deleteCategory);
router.get("/partner/category/:id", controller.getCategorybyId);
router.get("/partner/categories", isAdmin, controller.getCategoriesList_as);

module.exports = router;