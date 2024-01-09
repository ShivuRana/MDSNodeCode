const express = require("express");
const router = express.Router();
const { verifyGuestOrUser, verifyToken, isAdmin } = require("../../middleware/authtoken");
const controller = require("../../controller/membershipPlanManagement/membershipPlanController");

router.post("/membership/plan/create", isAdmin, controller.createMembershipPlan);
router.post("/payment/webhook", express.raw({ type: "application/json" }), controller.webhook);

router.put("/membership/plan/delete/:planId", isAdmin, controller.deleteMembershipPlan);
router.put("/membership/plan/update/:planId", isAdmin, controller.editMembershipPlan);
router.put("/cancel/subscription", verifyToken, controller.cancelSubscription);
router.put("/plan/upgrade", verifyToken, controller.upgradeSubscriptionPlan);

router.get("/membership/plan", isAdmin, controller.getAllMembershipPlanList);
router.get("/membership/list", isAdmin, controller.getAllPlanList);
router.get("/membership/allplan", controller.getAllMembershipPlanListAtReg);
router.get("/membership/plan/:planId", controller.getMembershipPlan);

router.get("/user/purchased_plan", verifyToken, controller.getloginUserSubscription_planDetails);
router.get("/user/getInApppurchasedPlan", verifyToken, controller.getUserInAppPlanDetails);
router.get("/getUsers/list/:id", isAdmin, controller.getUserListFromPlanDetails);

module.exports = router;
