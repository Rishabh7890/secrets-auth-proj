// jshint esversion:6

const express = require("express");
const ejs = require("ejs");
const mongoose = require("mongoose");
const encrypt = require("mongoose-encryption");
const md5 = require("md5");
require("dotenv").config();
const PORT = process.env.PORT || 3000;

const app = express();

app.set("view engine", "ejs");

// mongoose middleware to be able to use findOne() methods and get rid of dep warning
mongoose.set("useFindAndModify", false);

app.use(express.urlencoded({ extended: true }));
app.use(express.json());
app.use(express.static("public"));

mongoose.connect("mongodb://localhost:27017/secretsUsersDB", {
  useNewUrlParser: true,
  useUnifiedTopology: true
});

// create schema for users
const userSchema = new mongoose.Schema({
  email: String,
  password: String
});

// // plugin encrypt so we can encrypt passwords using SECRET in .env file USING mongoose-encryption
// userSchema.plugin(encrypt, {
//   secret: process.env.SECRET,
//   encryptedFields: ["password"]
// });

// create model for users collection
const User = mongoose.model("User", userSchema);

// route to get root route
app.get("/", function(req, res) {
  res.render("home");
});

// route to get login route
app.get("/login", function(req, res) {
  res.render("login");
});

// route to get register route
app.get("/register", function(req, res) {
  res.render("register");
});

// route to register new users
app.post("/register", function(req, res) {
  const username = req.body.username;
  const password = md5(req.body.password);

  // create newUser document in db
  const newUser = new User({
    email: username,
    password: password
  });
  // save newUser to db
  newUser.save(function(err) {
    if (err) {
      res.json(err);
    } else {
      // if no errors render secrets page
      res.render("secrets");
    }
  });
});

// route for users to login
app.post("/login", function(req, res) {
  const username = req.body.username;
  const password = md5(req.body.password);

  // look through db for a user with value entered in email field
  User.findOne({ email: username }, function(err, foundUser) {
    if (err) {
      res.json(err);
    } else {
      if (foundUser) {
        if (foundUser.password === password) {
          res.render("secrets");
        } else {
          res.status(401).json("Invalid Email or Password");
        }
      }
    }
  });
});

app.listen(PORT, function() {
  console.log("App listening on PORT: " + PORT);
});
