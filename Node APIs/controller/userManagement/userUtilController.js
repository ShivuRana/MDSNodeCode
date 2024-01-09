const { AdminUser, AdminResource } = require("../../database/models/adminuser");
const UserRole = require("../../database/models/userRole");

const {
  verify_connection,
  email_create_admin_user,
} = require("../../utils/nodmailer");

const config = require("config");
const auth0 = config.get("auth0");
var axios = require("axios").default;
var OAUTH_TOKEN_API = auth0.oauth_token;
var CLIENT_ID = auth0.client_id;
var CLIENT_SECRET = auth0.client_secret;
var AUDIENCE = auth0.audience;
var OAUTH_CONNECTION = auth0.connection;

async function getAuth0Token() {
  return new Promise(async (resolve, reject) => {
    try {
      var options = {
        method: "POST",
        url: OAUTH_TOKEN_API,
        headers: { "content-type": "application/json" },
        data: {
          grant_type: "client_credentials",
          client_id: CLIENT_ID,
          client_secret: CLIENT_SECRET,
          audience: AUDIENCE,
        },
      };
      axios
        .request(options)
        .then(function (response) {
          var token = "Bearer " + response.data.access_token;
          resolve(token);
        })
        .catch(function (error) {
          reject(`Something wrong. ${error}`);
        });
    } catch (error) {
      reject(`Something wrong. ${error}`);
    }
  });
}

exports.createRole = async (req, res) => {
  try {
    const { role_name } = req.body;
    await getAuth0Token()
      .then((token) => {
        var options = {
          method: "POST",
          url: AUDIENCE + "roles",
          headers: {
            "content-type": "application/json",
            authorization: token,
            "cache-control": "no-cache",
          },
          data: { name: role_name, description: role_name },
        };

        axios
          .request(options)
          .then(async function (response) {
            const newEntry = new UserRole({
              role_name: role_name,
              role_description: role_name,
              auth0_role_id: response.data.id,
            });
            const result = await newEntry.save();
            return res
              .status(200)
              .send({ status: true, message: "Role created.", data: result });
          })
          .catch(function (error) {
            return res
              .status(200)
              .json({
                status: false,
                message: `Something wrong while creating role in auth0. ${error.message}`,
              });
          });
      })
      .catch((error) => {
        return res
          .status(200)
          .json({
            status: false,
            message: `Something wrong. ${error.message}`,
          });
      });
  } catch (error) {
    return res
      .status(200)
      .json({
        status: false,
        message: `Something wrong while creating role. ${error.message}`,
      });
  }
};

exports.getRoleList = async (req, res) => {
  try {
    await getAuth0Token()
      .then((token) => {
        var options = {
          method: "GET",
          url: AUDIENCE + "roles",
          headers: {
            "content-type": "application/json",
            authorization: token,
            "cache-control": "no-cache",
          },
        };
        axios
          .request(options, {})
          .then(async function (response) {
            const roles_ids = response.data.map((item) => {
              return item.id;
            });
            const result = await UserRole.find({
              auth0_role_id: { $in: roles_ids },
              isDelete: false,
            }).select("role_name");
            return res
              .status(200)
              .send({ status: true, message: "Roles list.", data: result });
          })
          .catch(function (error) {
            return res
              .status(200)
              .json({
                status: false,
                message: `Something wrong while creating role in auth0. ${error.message}`,
              });
          });
      })
      .catch((error) => {
        return res
          .status(200)
          .json({
            status: false,
            message: `Something wrong. ${error.message}`,
          });
      });
  } catch (error) {
    return res
      .status(200)
      .json({
        status: false,
        message: `Something wrong while getting roles. ${error.message}`,
      });
  }
};

exports.createResourse = async (req, res) => {
  try {
    const newentry = new AdminResource({
      resource_name: req.body.resource_name,
    });
    const data = await newentry.save();
    return res
      .status(200)
      .json({ status: true, message: "Resorce created.", data });
  } catch (error) {
    return res
      .status(200)
      .json({
        status: false,
        message: `Something wrong creating resource. ${error.message}`,
      });
  }
};

exports.getResourceList = async (req, res) => {
  try {
    const data = await AdminResource.find({ isDelete: false }).select(
      "-__v -createdAt -updatedAt -isDelete"
    );
    return res
      .status(200)
      .json({ status: true, message: "List of resource.", data });
  } catch (error) {
    return res.status(200).json({ status: false, message: `${error.message}` });
  }
};

exports.createAdminUser = async (req, res) => {
  try {
    const body = req.body;
    await getAuth0Token()
      .then(async (token) => {
        var options = {
          method: "POST",
          url: AUDIENCE + "users",
          headers: {
            "content-type": "application/json",
            authorization: token,
            "cache-control": "no-cache",
          },
          data: {
            email: body.email,
            password: body.password,
            connection: OAUTH_CONNECTION,
          },
        };
        const role_data = await UserRole.findOne({
          _id: body.role,
          isDelete: false,
        });
        if (!role_data)
          return res
            .status(200)
            .json({ status: false, message: `User role not found.` });
        // assign role to user
        axios
          .request(options)
          .then(async function (response) {
            var options = {
              method: "POST",
              url: AUDIENCE + "users/" + response.data.user_id + "/roles",
              headers: {
                "content-type": "application/json",
                authorization: token,
                "cache-control": "no-cache",
              },
              data: { roles: [role_data.auth0_role_id] },
            };
            axios
              .request(options)
              .then(async function (result) {
                // var auth_user_id = response.data.user_id.split("|")
                const newentry = new AdminUser({
                  ...body,
                  oauthId: response.data.user_id,
                });
                const data = await newentry.save();

                // verify smtp connecting or not
                await verify_connection()
                  .then(async (resonse) => {
                    const email_data = {
                      email: body.email,
                      fullname: body.first_name + " " + body.last_name,
                      password: body.password,
                    };
                    await email_create_admin_user(email_data)
                      .then(async (response) => {
                        return res
                          .status(200)
                          .json({
                            status: true,
                            message:
                              "New user created and email has been send to their email address.",
                            data,
                          });
                      })
                      .catch((error) => {
                        return res
                          .status(400)
                          .send({
                            status: false,
                            message: `Error while sending email. ${error}`,
                          });
                      });
                  })
                  .catch((error) => {
                    return res
                      .status(400)
                      .send({
                        status: false,
                        message: `Error while connecting smtp... ${error}`,
                      });
                  });
              })
              .catch(function (error) {
                return res
                  .status(200)
                  .json({
                    status: false,
                    message: `Something wrong while assigning role to user. ${error.message}`,
                  });
              });
          })
          .catch(function (error) {
            console.log(error);
            return res
              .status(200)
              .json({
                status: false,
                message: `Something wrong while creating user. ${error.message}`,
              });
          });
      })
      .catch((error) => {
        return res
          .status(200)
          .json({
            status: false,
            message: `Something wrong. ${error.message}`,
          });
      });
  } catch (error) {
    return res.status(200).json({ status: false, message: `${error.message}` });
  }
};

exports.updateAdminUser = async (req, res) => {
  try {
    const { id } = req.params;
    var user_data = await AdminUser.findById(id).select(
      "isDelete oauthId email role"
    );
    if (!user_data)
      return res
        .status(200)
        .json({ status: false, message: "User not found." });
    if (user_data.isDelete)
      return res
        .status(200)
        .json({ status: false, message: "User in archive cann't updated." });

    if (req.body.role === user_data.role.toString()) {
      const data = await AdminUser.findByIdAndUpdate(
        id,
        {
          first_name: req.body.first_name,
          last_name: req.body.last_name,
          username: req.body.username,
          contact_number: req.body.contact_number,
          resource: req.body.resource,
        },
        { new: true }
      );
      return res
        .status(200)
        .json({ status: true, message: "User updated.", data });
    } else {
      var role = req.body.role;
      const new_role_data = await UserRole.findOne({
        _id: role,
        isDelete: false,
      });
      if (!new_role_data)
        return res
          .status(200)
          .json({
            status: false,
            message: "Role cann't be changes becasue this in not valid role.",
          });
      const old_role_data = await UserRole.findOne({
        _id: user_data.role,
        isDelete: false,
      });
      await getAuth0Token()
        .then(async (token) => {
          var options = {
            method: "GET",
            url: AUDIENCE + "roles/" + new_role_data.auth0_role_id,
            headers: {
              "content-type": "application/json",
              authorization: token,
              "cache-control": "no-cache",
            },
          };
          //find role in oauth
          axios
            .request(options)
            .then(async function (result) {
              var options = {
                method: "DELETE",
                url: AUDIENCE + "users/" + user_data.oauthId + "/roles",
                headers: {
                  "content-type": "application/json",
                  authorization: token,
                  "cache-control": "no-cache",
                },
                data: { roles: [old_role_data.auth0_role_id] },
              };
              // remove role from user
              axios
                .request(options)
                .then(async function (result) {
                  var options = {
                    method: "POST",
                    url: AUDIENCE + "users/" + user_data.oauthId + "/roles",
                    headers: {
                      "content-type": "application/json",
                      authorization: token,
                      "cache-control": "no-cache",
                    },
                    data: { roles: [new_role_data.auth0_role_id] },
                  };
                  // assign new role to user
                  axios
                    .request(options)
                    .then(async function (result) {
                      const data = await AdminUser.findByIdAndUpdate(
                        id,
                        {
                          first_name: req.body.first_name,
                          last_name: req.body.last_name,
                          username: req.body.username,
                          contact_number: req.body.contact_number,
                          resource: req.body.resource,
                          role: role,
                        },
                        { new: true }
                      );
                      return res
                        .status(200)
                        .json({ status: true, message: "User updated.", data });
                    })
                    .catch(function (error) {
                      return res
                        .status(200)
                        .json({
                          status: false,
                          message: `Something wrong while assign new role to user in oauth. ${error.message}`,
                        });
                    });
                })
                .catch(function (error) {
                  console.log(error);
                  return res
                    .status(200)
                    .json({
                      status: false,
                      message: `Something wrong while remove role from user in oauth. ${error.message}`,
                    });
                });
            })
            .catch(function (error) {
              return res
                .status(200)
                .json({
                  status: false,
                  message: `Something wrong while getting role info from oauth. ${error.message}`,
                });
            });
        })
        .catch((error) => {
          return res
            .status(200)
            .json({
              status: false,
              message: `Something wrong. ${error.message}`,
            });
        });
    }
  } catch (error) {
    return res.status(200).json({ status: false, message: `${error.message}` });
  }
};

exports.getAdminUsersList = async (req, res) => {
  try {
    const data = await AdminUser.find({ isDelete: false })
      .populate("resource", "-__v -createdAt -updatedAt -isDelete")
      .populate("role", "-__v -createdAt -updatedAt  -isDelete")
      .select("-__v -isDelete");
    return res
      .status(200)
      .json({ status: true, message: "List of admin users.", data });
  } catch (error) {
    return res.status(200).json({ status: false, message: `${error.message}` });
  }
};

exports.getAdminUsers_byId = async (req, res) => {
  try {
    const data = await AdminUser.findOne({
      _id: req.params.id,
      isDelete: false,
    })
      .populate("resource", "-__v -createdAt -updatedAt -isDelete")
      .populate("role", "-__v -createdAt -updatedAt  -isDelete")
      .select("-__v -isDelete");
    return res
      .status(200)
      .json({ status: true, message: "Get admin user.", data });
  } catch (error) {
    return res.status(200).json({ status: false, message: `${error.message}` });
  }
};

exports.deleteAdminUser = async (req, res) => {
  try {
    const data = await AdminUser.findOneAndUpdate(
      { _id: req.params.id },
      { isDelete: true },
      { new: true }
    )
      .populate("resource", "-__v -createdAt -updatedAt -isDelete")
      .populate("role", "-__v -createdAt -updatedAt  -isDelete")
      .select("-__v");
    return res
      .status(200)
      .json({ status: true, message: "Admin user deleted.", data });
  } catch (error) {
    return res.status(200).json({ status: false, message: `${error.message}` });
  }
};

exports.adminUserLogin = async (req, res) => {
  try {
    const { email, password } = req.body;
    const user = await AdminUser.findOne({ email: email, isDelete: false });
    if (!user)
      return res
        .status(200)
        .json({ status: false, message: "User not found." });
    var options = {
      method: "POST",
      url: OAUTH_TOKEN_API,
      headers: { "content-type": "application/json" },
      data: {
        grant_type: "password",
        scope: "openid email",
        username: email,
        password: password,
        client_id: CLIENT_ID,
        client_secret: CLIENT_SECRET,
        audience: AUDIENCE,
      },
    };
    axios
      .request(options)
      .then(async function (result) {
        return res
          .status(200)
          .json({
            status: true,
            message: "User login.",
            data: { ...result.data, user },
          });
      })
      .catch((error) => {
        console.log(error);
        return res
          .status(200)
          .json({ status: false, message: `Wrong email or password.` });
      });
  } catch (error) {
    return res.status(200).json({ status: false, message: `${error.message}` });
  }
};
