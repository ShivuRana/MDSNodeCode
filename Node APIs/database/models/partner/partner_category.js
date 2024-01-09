const mongoose = require("mongoose");

const categorySchema = mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
    },
    subcategory: {
      type: [{ type: mongoose.Schema.Types.ObjectId, ref: 'partner_subcategory' }],
      default: []
    },
    categoryImage: {
      type: String,
      default: null
    },
    isDelete: {
      type: Boolean,
      default: false,
    },
    views:  { type: Number, default: 0 },
  },
  { timestamps: true }
);


var autoPopulateChildren = function (next) {
  this.populate("subcategory name", { isDelete: false });
  next();
};

categorySchema
  .pre("findOne", autoPopulateChildren)
  .pre("find", autoPopulateChildren);

module.exports = mongoose.model("partner_category", categorySchema);
