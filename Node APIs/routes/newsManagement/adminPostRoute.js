const express = require("express");
const router = express.Router();
const { verifyToken, isAdmin } = require("../../middleware/authtoken");
const adminPostController = require("../../controller/newsManagement/adminPostController");

router.post("/news/createPost",isAdmin,adminPostController.createPost);
router.patch("/news/editPost/:id", isAdmin, adminPostController.editPost);
router.patch("/news/deletePost/:id", isAdmin, adminPostController.deletePost);
router.get("/news/getAllPost", isAdmin, adminPostController.getAllPost);
router.get("/news/getPostById/:id", isAdmin, adminPostController.getPostDetail);
router.get("/news/getAllPostUsers", verifyToken, adminPostController.getAllPostUsers);

 module.exports = router;  