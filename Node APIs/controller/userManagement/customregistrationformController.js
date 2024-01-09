require("dotenv").config();
const mongoose = require("mongoose");
const db = require("../../config/config").get(process.env.NODE_ENV);

mongoose.Promise = global.Promise;

const customregistrationform = require("../../database/models/customregistrationform");

/** add new fields in registration form */

exports.addfieldsregistrationform = async (req, res) => {
  if (req.body.length > 0) {
    var succes = true;
    var err = "";
    var arr = [];
    var i = 0;
    req.body.map(async (field) => {
      const newField = await new customregistrationform(field);
      if (succes) {
        newField.save((error, doc) => {
          if (error) {
            succes = false;
            err = error;
          } else {
            console.log(doc, "doc");
            arr[i] = doc;
            i++;
          }
        });
      }
    });

    succes
      ? res.status(200).json({ success: succes, data: arr })
      : res.status(400).json({ success: succes, err: err });
  }
};

/** get fields in registration form */

exports.retrivefieldsregistrationform = async (req, res) => {
  var ids = [];
  ids.push(process.env.USER_MAIN_FN_LN);
  ids.push(process.env.USER_MAIN_EMAIL);
  customregistrationform.find({
    _id: { '$nin': ids }
  }, (err, doc) => {
    if (err) res.status(400).send({ success: false, error: err });
    else res.status(200).send({ success: true, data: doc });
  });
};

/** delete field from registration form */

exports.deletefieldregistrationform = async (req, res) => {
  customregistrationform.deleteOne({ _id: req.body.id }, (err, doc) => {
    if (err) res.status(400).send({ success: false, error: err });
    else res.status(200).send({ success: true, data: doc });
  });
};

/** update field in registration form */

exports.updatefieldregistrationform = async (req, res) => {
  customregistrationform.updateOne(
    { _id: req.body.id },
    { $set: { fields: req.body.field } },
    (err, doc) => {
      if (err) res.status(400).send({ success: false, error: err });
      else res.status(200).send({ success: true, data: doc });
    }
  );
};
