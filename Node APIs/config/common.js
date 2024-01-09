'use strict';
require('dotenv').config();
const path = require("path");
var nodemailer = require("nodemailer");
const Email_user = process.env.Email_user;
const Email_pass = process.env.Email_pass;
const AdminEmail = process.env.AdminEmail;

exports.sendEmail = async(mail_data) => {
    try {
        let mailOptions = {
            from: process.env.EmailFrom,
            to: mail_data.email,
            subject: mail_data.subject,
            html: mail_data.html
        }
        var smtpTransport = nodemailer.createTransport({
            service: "Gmail",
            auth: {
                user: Email_user,
                pass: Email_pass,
            }
        });
        // Verify the connection
        smtpTransport.verify(function(error, success) {
            if (error) {
                console.log(error);
            } else {
                console.log('Mail server is ready to take our messages');
            }
        });

        await smtpTransport.sendMail(mailOptions);
        console.log("email sent sucessfully");

    } catch (error) {
        console.log(error, "email not sent");
    }
}

exports.sendEmailAdmin = async(mailData) => {
    try {
        let mailOptions = {
            from: process.env.EmailFrom,
            to: AdminEmail,
            subject: mailData.subject,
            html: mailData.html
        }
        var smtpTransport = nodemailer.createTransport({
            service: "Gmail",
            auth: {
                user: Email_user,
                pass: Email_pass,
            }
        });
        // Verify the connection
        smtpTransport.verify(function(error, success) {
            if (error) {
                console.log(error);
            } else {
                console.log('Mail server is ready to take our messages');
            }
        });

        await smtpTransport.sendMail(mailOptions);
        console.log("email sent sucessfully");

    } catch (error) {
        console.log(error, "email not sent");
    }
}

exports.ItemExists = (arr, item) => {
    return arr.some(function(el) {
        return el.user_id === item;
    });
}
