const express = require("express");
const router = express.Router();

const {
  createCustomerAndSubscription,
  webhook_forsubscription_invoicePaid,
} = require("../controller/paymentController");

router.post("/handlePayment", createCustomerAndSubscription);
//Webhook for recurring payments paid invoice
router.post("/payment/webhook", webhook_forsubscription_invoicePaid);

// //Parchase subscription for user
// router.post("/make-subscription", auth, paymentController.makeSubscription);

// //Cancel user subscription
// router.post("/cancel-subscription", auth, paymentController.cancelSubscription);

// //Webhook for recurring payments
// router.post(
//   "/webhook",
//   express.raw({ type: "application/json" }),
//   paymentController.webhook
// );

// //getting customer card details
// router.get(
//   "/getting-card-details/:userId",
//   auth,
//   paymentController.gettingCustomerCardDetails
// );

// //getting user plan details
// router.get(
//   "/getting-plan-details/:userId",
//   auth,
//   paymentController.gettingUserPlanDetails
// );

// //Create new card
// router.post("/add-new-card", auth, paymentController.createNewCard);

// //Delete a card
// router.post("/delete-card", auth, paymentController.deleteCard);

// //Upgrade subscription plan
// router.post(
//   "/upgrade-subscription-plan",
//   auth,
//   paymentController.upgradeSubscriptionPlan
// );

module.exports = router;
