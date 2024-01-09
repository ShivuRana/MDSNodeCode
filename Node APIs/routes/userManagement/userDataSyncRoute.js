const express = require("express");
const userDataSyncControllers = require("../../controller/userManagement/userDataSyncController");
const router = express.Router();
const { verifyToken, isAdmin } = require("../../middleware/authtoken");

router.get("/mergeUsers", isAdmin, userDataSyncControllers.mergeUsers);
router.post("/updateRegistrationDetailOnDashboard", verifyToken, userDataSyncControllers.updateRegistrationDetailOnDashboard);
router.post("/updateAllUsersRegistrationDetails", isAdmin, userDataSyncControllers.updateAllUsersRegistrationDetailsForAPI);
router.get("/airTableEventSyncUp", isAdmin, userDataSyncControllers.airTableEventSyncUp);
module.exports = router;