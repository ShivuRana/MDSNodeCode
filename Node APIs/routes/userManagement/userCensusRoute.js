const express = require("express");
const router = express.Router();
const userCensusController = require("../../controller/userManagement/userCensusController");
const { verifyGuestOrUser } = require("../../middleware/authtoken");

router.get("/getDaysSinceMDSOnlyCensus", verifyGuestOrUser, userCensusController.getDaysSinceMDSOnlyCensus);

router.get("/getUsersMDSOnlyCensusExpiryNear",  userCensusController.getUsersMDSOnlyCensusExpiryNearAPI);

module.exports = router;