const config = {
  production: {
    SECRET: process.env.SECRET,
    DATABASE: process.env.MONGODB_URI,
  },
  default: {
    SECRET: "mysecretkey",
    DATABASE:
      "mongodb+srv://komaldecodeup:QzkSP34iZbNO8VbD@cluster0.xbuww.mongodb.net/MillionDollarSellers_test?retryWrites=true&w=majority",
  },
};
exports.get = function get(env) {
  return config[env] || config.default;
};
