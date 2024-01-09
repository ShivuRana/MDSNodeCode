let mongoose = require("mongoose");

const membershipSchema = mongoose.Schema(
  {
    plan_name: { type: String, default: "", },
    plan_price: { type: Number, default: 0, },
    stripe_price_id: { type: String, default: "", },
    stripe_product_id: { type: String, default: "", },
    plan_description: { type: String, default: "", },
    recurring_timeframe: { type: String, default: "month", enum: ["day", "month", "year"], },
    plan_status: { type: String, default: "Active", enum: ["Active", "Deactive"], },
    automatic_renewal: { type: Boolean, default: true, },
    plan_resource: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "plan_resource",
    },
    total_member_who_purchased_plan: [{ type: mongoose.Schema.Types.ObjectId, ref: "airtable-syncs", },],
    forMigratedUser: { type: Boolean, default: false, },
    plan_id_by_admin: { type: String, unique: true, default: "", },
    auth0_plan_id: { type: String, unique: true, default: "", },
    apple_plan_id: { type: String, unique: true, default: "", },
    play_store_plan_id: { type: String, unique: true, default: "", },
    isDelete: { type: Boolean, default: false, },
    isTeamMate: { type: Boolean, default: false, },
    no_of_team_mate: { type: String, default: "0", },
    accessResources: [{ type: mongoose.Schema.Types.ObjectId, ref: "accessResource", default: [] }],
  },
  { timestamps: true }
);

// accessResources

const autoPopulateChildren = function (next) {
  this.populate("accessResources", "name", { isDelete: false });
  next();
}

membershipSchema.pre("findOne", autoPopulateChildren).pre("findById", autoPopulateChildren).pre("find", autoPopulateChildren);
module.exports = mongoose.model("membership_plan", membershipSchema);
