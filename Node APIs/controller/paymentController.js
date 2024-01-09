const stripe = require("stripe")(
  "sk_test_51LDYk4B9a9of99tJroUat5LgIFe0TnOCWQ0tw7BvFzw0wGkW5eOxVEbL5KXvRxbyvAzvnfPlLkOa0kgVQhCG29ll00Jof8hf6f"
);
const MembershipPlan = require("../database/models/membershipPlanManagement/membership_plan");
const Payment = require("../database/models/payment");

exports.createCustomerAndSubscription = async (req, res) => {
  try {
    const customerInfo = {
      name: req.body.name,
      plan_price_id: req.body.plan_price_id,
    };
    const paymentMethodId = req.body.paymentMethodId;

    const membership_plan = await MembershipPlan.findOne({
      stripe_price_id: customerInfo.plan_price_id,
    }).select("_id");
    if (!membership_plan)
      return res.status(200).json({ status: false, message: "Not valid membership plan id." });
    /* Create customer and set default payment method */
    const customer = await stripe.customers.create({
      payment_method: paymentMethodId,
      name: customerInfo.name,
      invoice_settings: {
        default_payment_method: paymentMethodId,
      },
    });

    /* Create subscription and expand the latest invoice's Payment Intent
     * We'll check this Payment Intent's status to determine if this payment needs SCA
     */
    const subscription = await stripe.subscriptions.create({
      customer: customer.id,
      items: [
        {
          plan: customerInfo.plan_price_id,
        },
      ],
      trial_from_plan: false /* Use trial period specified in plan */,
      expand: ["latest_invoice.payment_intent"],
    });

    const payment_entry = new Payment({
      membership_plan_id: membership_plan._id,
      name_on_card: req.body.name,
      country: req.body.country,
      postal_code: req.body.postal_code,
      subscriptionId: subscription.id,
      customerId: customer.id,
      card_number: "**** **** **** " + req.body.card_last4,
      card_expiry_date: req.body.card_expiry_date,
      card_brand: req.body.card_brand,
      invoice_payment_intent_status:
        subscription.latest_invoice.payment_intent.status,
      expire_date: Date.now(),
    });
    if (!payment_entry)
      return res.status(200).json({ status: false, message: "smothing went wrong !!" });
    const savedEntry = await payment_entry.save();
    if (savedEntry) {
      return res.status(200).json({ status: true, message: "subscription and customer created", data: [{ id: savedEntry._id, subscription, savedEntry }], });
    }
  } catch (error) {
    return res.status(200).json({ status: false, message: error.message });
  }
};

exports.webhook_forsubscription_invoicePaid = async (req, res) => {
  try {
    const webhooksecret = "we_1LAuUxHxVkkfTxNhwRoXwpVM";
    const event = await stripe.webhooks.constructEvent(
      req.body,
      signature,
      webhooksecret
    );
    let signature = req.headers["stripe-signature"];

    event = await stripe.webhooks.constructEvent(
      req.body,
      signature,
      webhooksecret
    );
  } catch (error) {
    return res.status(200).json({ status: false, message: error.message });
  }
  console.log("testing");
};
