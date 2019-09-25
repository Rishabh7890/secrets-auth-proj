// jshint esversion:6

const express = require("express");
const ejs = require("ejs");
const mongoose = require("mongoose");
const session = require("express-session");
const passport = require("passport");
const passportLocalMongoose = require("passport-local-mongoose");
require("dotenv").config();
const PORT = process.env.PORT || 3000;

const app = express();

app.set("view engine", "ejs");

// mongoose middleware to be able to use findOne() methods and get rid of dep warning
mongoose.set("useFindAndModify", false);

// middleware to get rid of dep warning when using passport
mongoose.set('useCreateIndex', true);

app.use(express.urlencoded({ extended: true }));
app.use(express.json());
app.use(express.static("public"));

// tell app to use express-session
app.use(session({
  secret: process.env.SECRET,
  resave: false,
  saveUninitialized: false,
}));

// initialize passport
app.use(passport.initialize());
// tell passport to use session
app.use(passport.session());

mongoose.connect("mongodb://localhost:27017/secretsUsersDB", {
  useNewUrlParser: true,
  useUnifiedTopology: true
});

// create schema for users
const userSchema = new mongoose.Schema({
  email: String,
  password: String
});

// enable plugin passport-local-mongoose in userSchema
userSchema.plugin(passportLocalMongoose);

// create model for users collection
const User = mongoose.model("User", userSchema);

// createStrategy is responsible to setup passport-local LocalStrategy with the correct options.
passport.use(User.createStrategy());

// use static serialize and deserialize of model for passport session support
passport.serializeUser(User.serializeUser());
passport.deserializeUser(User.deserializeUser());

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

// route to get secrets route once authenticated
app.get("/secrets", function(req, res){
  if(req.isAuthenticated()){
    res.render("secrets");
  } else {
    res.redirect("/login");
  }
});

// route for logging out
app.get("/logout", function(req, res){
  req.logout();
  res.redirect("/");
});

// route to register new users
app.post("/register", function(req, res) {
  // use passport-local-mongoose register() to register user
  User.register({username: req.body.username}, req.body.password, function(err, user){
    if(err){
      console.log(err);
      res.redirect("/register");
    } else {
      passport.authenticate("local")(req, res, function(){
        res.redirect("/secrets");
      });
    }
  });
});

// route for users to login
app.post("/login", function(req, res) {
  // create user that wishes to login
  const user = new User ({
    username: req.body.username,
    password: req.body.password
  });

  // use passport's login() to login and authenticate user
  req.login(user, function(err){
    if(err){
      console.log(err);
    } else {
      passport.authenticate("local")(req, res, function(){
        res.redirect("/secrets");
      });
    }
  });


});

app.listen(PORT, function() {
  console.log("App listening on PORT: " + PORT);
});
