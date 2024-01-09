const User = require("../database/models/airTableSync");

const manageUserLog = async (userId) => {
  await User.findByIdAndUpdate(
    { _id: userId },
    { $set: { last_activity_log: Date.now() } }
  );
};

module.exports = {
  manageUserLog: manageUserLog,
};
