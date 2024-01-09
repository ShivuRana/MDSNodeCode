const mongoose = require("mongoose");
Schema = mongoose.Schema;

const adminPostSchema = new mongoose.Schema({
    title: { type: String, default: "" },
    name: { type: String, default: "" },
    url: { type: String, default: "" },
    date: { type: String, default: "" },
    isDelete: { type: Boolean, default: false },

}, {
    timestamps: true
});


module.exports = mongoose.model("adminPost", adminPostSchema);
