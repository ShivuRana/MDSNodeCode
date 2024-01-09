const nodemailer = require("nodemailer");

var Email_user = process.env.Email_user;
var Email_pass = process.env.Email_pass;

var smtpTransport = nodemailer.createTransport({
  service: "gmail",
  host: "smtp.gmail.com",
  port: 465,
  secure: true,
  auth: {
    user: Email_user,
    pass: Email_pass,
  },
});

const verify_connection = async () => {
  return new Promise(async (resolve, reject) => {
    try {
      smtpTransport.verify(function (error, success) {
        if (error) {
          console.log(`Error while verify smtp. ${error}`);
          reject(`Error while verify smtp. ${error}`);
        } else {
          console.log("Mail server is ready to take our messages");
          resolve("Mail server is ready to take our messages");
        }
      });
    } catch (error) {
      reject(`Something wrong while verifying connection. ${error}`);
    }
  });
};

const email_create_admin_user = async (mailData) => {
  return new Promise(async (resolve, reject) => {
    try {
      let mailOptions = {
        from: Email_user,
        to: mailData.email,
        subject: "Account Created",
        html: `<p>Hello ${mailData.fullname}, </p>
                        <p> Your new account is created in Million Dollar Sellers.  </p>
                        <p>You can login in dashboard using this password: ${mailData.password}</p>
                        </br>
                        </br>`,
      };
      smtpTransport.sendMail(mailOptions, function (error, data) {
        if (error) {
          reject(`Something wrong while sending email. ${error}`);
        } else {
          resolve(
            `Email has been sent to ${mailData.email}, kindly follow the instructions`
          );
        }
      });
    } catch (error) {
      reject(`Something wrong connecting email. ${error}`);
    }
  });
};

module.exports = {
  verify_connection: verify_connection,
  email_create_admin_user: email_create_admin_user,
};
