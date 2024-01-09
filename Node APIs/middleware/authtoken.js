const jwt = require("jsonwebtoken");
const User = require("../database/models/airTableSync");

const { AdminUser } = require("../database/models/adminuser");

const pemCert = `-----BEGIN CERTIFICATE-----
MIIDDTCCAfWgAwIBAgIJSJB81dlfbaTEMA0GCSqGSIb3DQEBCwUAMCQxIjAgBgNV
BAMTGWRldi15YzRrNC11ZC51cy5hdXRoMC5jb20wHhcNMjIwNDE2MjEwNjUzWhcN
MzUxMjI0MjEwNjUzWjAkMSIwIAYDVQQDExlkZXYteWM0azQtdWQudXMuYXV0aDAu
Y29tMIIBIjANBgkqhkiG9w0BAQEFAAOCAQ8AMIIBCgKCAQEAyQlpEUHIGyCyg1MA
gyo5DPlJDv6iiVEKADw30trDE43PlYM99eC2Voxk64WGI1d4o5z+m8J0f5pg2k60
ZUtCIq2m7UllLCL6On/IGT9XZXWwSk1sMe+sbCZKsM85N25hXl2UNYvQtcZ33HD0
45eBxjS5hFuoArhZq6r+N5zd2063oYYKk9ik21LmF1zM6Rg164gtXYyeyGPh8UF0
Xyi/ka1HmFvzdwa7tGOqZ2AwLroZK1i5F5tsrFK+aYwsfsr1QWuJHtkE6dbvN60w
VhUB8ioi5Am/cdZnU1so67PiicvGAvIA/19TKWYveTZ8fwUmuoKWWYoRLWIjCgpU
WndZQwIDAQABo0IwQDAPBgNVHRMBAf8EBTADAQH/MB0GA1UdDgQWBBTwh19JD28L
Nn/4+ag2WVU7Zr5e6jAOBgNVHQ8BAf8EBAMCAoQwDQYJKoZIhvcNAQELBQADggEB
AIi+9XYHH78tXKNKMRmzqKlRyNeArTT0/TBh3y4xQ9QrEerbKLeQ78K/B11Sq5A0
oFp85cAZAyrGW13RCp/6rO+1rBBvz3xgRTTbJBstWHF5q+oRIrqkQIr5MX+fI0b7
Dd2n4KV6QSiXr1xzaJM0lCVyDgQ8GtFrNxmMBnN3cbhoksXYYn+cCqyhcye/SvLo
P7Ak0vQPWDfqucVY8PmFRMhIfE9XewiChJc31lPOCO1b1Y/EX5sWvy94+gr88SSU
ovmdDu2Us8r/UUQJOARmVF4OWF3l1GEcpCH6ayjB6/KmEOstmEwiqG2HNwwreAeM
laB1FgImCC7VirzP8E3UELI=
-----END CERTIFICATE-----`;

const verifyToken = async (req, res, next) => {
  let token = req.headers.authorization;
  // console.log(token, "token");
  if (!token || token.length === 0) {
    return res.status(200).send({ status: false, message: "No token provided!", invalidToken: true, });
  }

  var tokenCrop = token.replace("Bearer ", "");
  jwt.verify(
    tokenCrop,
    pemCert,
    { algorithm: "RS256" },
    async (err, decoded) => {
      if (err) {
        return res
          .status(200)
          .send({
            status: false,
            message: "Invalid token!",
            err: err,
            invalidToken: true,
          });
      }
      var authDetail = decoded.sub.split("|");
      var authId = authDetail[1];
      var auth_provider = authDetail[0];

      var userData = await User.findOne({
        $or: [
          { auth0Id: authId }, { facebookLinkedinId: authId }
        ],
        // provider: auth_provider,
        isDelete: false,
      }).select("email");
      if (!userData)
        return res.status(200).json({ status: false, message: "User not found.", invalidToken: true, });
      req.authUserId = userData._id;
      next();
    }
  );
};

const isAdmin = async (req, res, next) => {
  let token = req.headers.authorization;
  if (!token || token.length === 0) {
    return res
      .status(200)
      .send({
        status: false,
        message: "No token provided!",
        invalidToken: true,
      });
  }

  const tokenCrop = token.replace("Bearer ", "");
  jwt.verify(
    tokenCrop,
    pemCert,
    { algorithm: "RS256" },
    async (err, decoded) => {
      if (err) {
        return res
          .status(200)
          .send({
            status: false,
            message: "Invalid token!",
            invalidToken: true,
          });
      }
      const adminId = decoded.sub;
      var adminData = await AdminUser.findOne({
        oauthId: adminId,
        isDelete: false,
      });
      if (!adminData)
        return res
          .status(200)
          .json({
            status: false,
            message: "You are not admin.",
            invalidToken: true,
          });
      req.admin_Id = adminData._id;
      next();
    }
  );
};

const verifyGuest = async (req, res, next) => {
  let token
  const { authorization } = req.headers
  if (authorization && authorization.startsWith('Bearer')) {
    try {
      token = req.headers.authorization.split(' ')[1]
      const { userID } = jwt.verify(token, process.env.JWT_SECRET)
      const userData = await User.findById(userID).select('-password');
      req.authUserId = userData._id;
      next()
    } catch (error) {
      console.log(error)
      res.status(401).send({ "status": "failed", "message": "Unauthorised User!" })
    }
  }
  if (!token) {
    res.status(401).send({ "status": "failed", "message": "Unauthorised User, No Token!" })
  }
};

const verifyGuestOrUser = async (req, res, next) => {

  let token = req.headers.authorization;
  if (!token || token.length === 0) {
    return res.status(200).send({ status: false, message: "No token provided!", invalidToken: true, });
  }
  var tokenCrop = token.replace("Bearer ", "");

  if (token.length > 200) {
    jwt.verify(
      tokenCrop,
      pemCert,
      { algorithm: "RS256" },
      async (err, decoded) => {
        if (err) {
          return res.status(200).send({ status: false, message: "Invalid token!", err: err, invalidToken: true, });
        }
        var authDetail = decoded.sub.split("|");
        var authId = authDetail[1];
        var authUserData = await User.findOne({
          $or: [
            { auth0Id: authId }, { facebookLinkedinId: authId }
          ],
          isDelete: false,
        }).select("email");

        if (!authUserData) {
          return res.status(200).json({ status: false, message: "User not found.", invalidToken: true, });
        }
        req.authUserId = authUserData._id;
        next();
      }
    );
  } else {
    if (token && token.startsWith('Bearer')) {
      try {
        const { userID } = jwt.verify(tokenCrop, process.env.JWT_SECRET);
        const userData = await User.findById(userID).select('-password');
        req.authUserId = userData._id;
        next();
      } catch (error) {
        console.log(error)
        res.status(401).send({ "status": "failed", "message": "Unauthorised User!" })
      }
    }
  }

  if (!token) {
    res.status(401).send({ "status": "failed", "message": "Unauthorised User, No Token!" })
  }
};

module.exports = {
  verifyToken: verifyToken,
  isAdmin: isAdmin,
  verifyGuest: verifyGuest,
  verifyGuestOrUser: verifyGuestOrUser,
};
