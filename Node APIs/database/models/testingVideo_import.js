const mongoose = require("mongoose");
const testingVideo_import = mongoose.Schema(
    {
        video_url: {
            type: String,
            require: true
        },
        metadata: {
            type: Object,
            require: true
        }
    },
    { timestamps: true }
)

module.exports = mongoose.model("testingVideo_import", testingVideo_import)