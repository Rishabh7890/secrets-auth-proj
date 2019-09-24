// jshint esversion:6

const express = require("express");
const ejs = require("ejs");
const mongoose = require("mongoose");
const bcrypt = require("bcrypt");
const saltRounds = 10;
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
  const password = req.body.password;

  // use bcrypt to hash entered password with 10 saltRounds
  bcrypt.hash(password, saltRounds, function(err, hash) {
    // Store hash in your password DB.
    // create newUser document in db
    const newUser = new User({
      email: username,
      password: hash
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
});

// route for users to login
app.post("/login", function(req, res) {
  const username = req.body.username;
  const password = req.body.password;

  // look through db for a user with value entered in email field
  User.findOne({ email: username }, function(err, foundUser) {
    if (err) {
      res.json(err);
    } else {
      if (foundUser) {
        // use bcrypt.compare to load hash from db and compare
        bcrypt.compare(password, foundUser.password, function(err, result) {
          // check if hash for 'password' is === hash in db
          if(result === true){
            res.render("secrets");
          }
        });
      }
    }
  });
});

app.listen(PORT, function() {
  console.log("App listening on PORT: " + PORT);
});
