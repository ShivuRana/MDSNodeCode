const mongoose = require("mongoose");

const subCategorySchema = mongoose.Schema(
    {
        name: {
            type: String,
            required: true,
            trim: true,
        },
        isDelete: {
            type: Boolean,
            default: false,
        },
    },
    { timestamps: true }
);

module.exports = mongoose.model("partner_subcategory", subCategorySchema);
