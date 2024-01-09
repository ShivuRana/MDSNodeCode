const mongoose = require("mongoose");

//Plan user data in schema
const paymentSchema = mongoose.Schema(
  {
    membership_plan_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "membership_plan",
      default: null
    },
    user_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "airtable-syncs",
    },
    name_on_card: {
      type: String,
      default: "",
    },
    subscriptionId: {
      type: String,
      // required: true,
      default: "",
    },
    paymentMethodId: {
      type: String,
      // required: true,
      default: "",
    },
    customerId: {
      type: String,
      // required: true,
      default: "",
    },
    invoice_payment_intent_status: {
      type: String,
      default: "",
    },
    card_number: {
      type: String,
      default: "",
    },
    card_expiry_date: {
      type: String,
      default: "",
    },
    card_brand: {
      type: String,
      default: "",
    },
    country: {
      type: String,
      default: "",
    },
    postal_code: {
      type: String,
      default: "",
    },
    expire_date: {
      type: Date,
      default: "",
    },
    cancel_subscription: {
      type: Boolean,
      default: false,
    },
    inAppProductId: {
      type: String,
      default: "",
    },
    originalTransactionId: {
      type: String,
      default: "",
    },
    autoRenewProductId: {
      type: String,
      default: "",
    },
    originalStartDate: {
      type: Date,
      default: "",
    },
    startDate: {
      type: Date,
      default: "",
    },
    inAppToken: {
      type: String,
      default: "",
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model("payment", paymentSchema);
