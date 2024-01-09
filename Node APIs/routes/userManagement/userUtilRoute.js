const express = require("express");
const router = express.Router();
const utilContoller = require("../../controller/userManagement/userUtilController");
const { isAdmin } = require("../../middleware/authtoken");
router.post("/role/create", utilContoller.createRole);
router.post("/resource/create", utilContoller.createResourse);
router.post("/admin_user/create", utilContoller.createAdminUser);
router.post("/admin_user/login", utilContoller.adminUserLogin);

router.patch("/admin_user/:id/edit", isAdmin, utilContoller.updateAdminUser);
router.patch("/admin_user/:id/delete", isAdmin, utilContoller.deleteAdminUser);

router.get("/roles", utilContoller.getRoleList);
router.get("/resources", utilContoller.getResourceList);
router.get("/admin_users", isAdmin, utilContoller.getAdminUsersList);
router.get("/admin_user/:id", isAdmin, utilContoller.getAdminUsers_byId);

module.exports = router;
