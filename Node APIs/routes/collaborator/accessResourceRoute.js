const express = require("express");
const router = express.Router();
const { verifyGuestOrUser, isAdmin } = require("../../middleware/authtoken");
const controller = require("../../controller/collaborator/accessResourceController");

router.post("/createAccessResource", isAdmin, controller.createAccessResource);
router.get("/getAllAccessResource", isAdmin, controller.getAllAccessResource);
router.get("/getAccessResourceById/:id", isAdmin, controller.getAccessResourceById);

router.get("/getAllResource", verifyGuestOrUser, controller.getAllResource);

module.exports = router;
