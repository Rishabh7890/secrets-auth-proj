// jshint esversion:6

const express = require("express");
const ejs = require("ejs");
const mongoose = require("mongoose");
const session = require("express-session");
const passport = require("passport");
const passportLocalMongoose = require("passport-local-mongoose");
const GoogleStrategy = require("passport-google-oauth20").Strategy;
const TwitterStrategy = require("passport-twitter").Strategy;
const InstagramStrategy = require("passport-instagram").Strategy;
const findOrCreate = require("mongoose-findorcreate");
require("dotenv").config();
const PORT = process.env.PORT || 3000;

const app = express();

app.set("view engine", "ejs");

// mongoose middleware to be able to use findOne() methods and get rid of dep warning
mongoose.set("useFindAndModify", false);

// middleware to get rid of dep warning when using passport
mongoose.set("useCreateIndex", true);

app.use(express.urlencoded({ extended: true }));
app.use(express.json());
app.use(express.static("public"));

// tell app to use express-session
app.use(
  session({
    secret: process.env.SECRET,
    resave: false,
    saveUninitialized: false
  })
);

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
  password: String,
  googleId: String,
  twitterId: String,
  instagramId: String,
  secret: String
});

// enable plugin passport-local-mongoose in userSchema
userSchema.plugin(passportLocalMongoose);

// enable plugin findOrCreate so we can use it for GoogleStrategy
userSchema.plugin(findOrCreate);

// create model for users collection
const User = mongoose.model("User", userSchema);

// createStrategy is responsible to setup passport-local LocalStrategy with the correct options.
passport.use(User.createStrategy());

// serialize and deserialize user so that it works for all strategies.
// Directly from Passport Docs
passport.serializeUser(function(user, done) {
  done(null, user.id);
});

passport.deserializeUser(function(id, done) {
  User.findById(id, function(err, user) {
    done(err, user);
  });
});

// configure GoogleStrategy
passport.use(
  new GoogleStrategy(
    {
      clientID: process.env.CLIENT_ID,
      clientSecret: process.env.CLIENT_SECRET,
      callbackURL: "http://localhost:3000/auth/google/secrets"
    },
    function(accessToken, refreshToken, profile, cb) {
      // console log profile so we can use that data to create them in our db
      console.log(profile);

      User.findOrCreate({ googleId: profile.id }, function(err, user) {
        return cb(err, user);
      });
    }
  )
);

// configure TwitterStrategy
passport.use(
  new TwitterStrategy(
    {
      consumerKey: process.env.TWITTER_CONSUMER_KEY,
      consumerSecret: process.env.TWITTER_CONSUMER_SECRET,
      callbackURL: "http://localhost:3000/auth/twitter/secrets"
    },
    function(token, tokenSecret, profile, cb) {
      User.findOrCreate({ twitterId: profile.id }, function(err, user) {
        return cb(err, user);
      });
    }
  )
);

// configure InstagramStrategy
passport.use(
  new InstagramStrategy(
    {
      clientID: process.env.INSTAGRAM_CLIENT_ID,
      clientSecret: process.env.INSTAGRAM_CLIENT_SECRET,
      callbackURL: "http://localhost:3000/auth/instagram/secrets"
    },
    function(accessToken, refreshToken, profile, done) {
      User.findOrCreate({ instagramId: profile.id }, function(err, user) {
        return done(err, user);
      });
    }
  )
);

// route to get root route
app.get("/", function(req, res) {
  res.render("home");
});

// route for google login. Use passport to authenticate user
app.get(
  "/auth/google",
  passport.authenticate("google", { scope: ["profile"] })
);

// route for redirecting after google authentication
app.get(
  "/auth/google/secrets",
  passport.authenticate("google", { failureRedirect: "/login" }),
  function(req, res) {
    // Successful authentication, redirect to secrets page.
    res.redirect("/secrets");
  }
);

// route for twitter login. Use passport to auth user
app.get("/auth/twitter", passport.authenticate("twitter"));

// route for redirecting after twitter authentication
app.get(
  "/auth/twitter/secrets",
  passport.authenticate("twitter", { failureRedirect: "/login" }),
  function(req, res) {
    // Successful authentication, redirect home.
    res.redirect("/secrets");
  }
);

// route for instagram login. Use passport to auth user
app.get("/auth/instagram", passport.authenticate("instagram"));

// route gor redirecting after instagram authentication
app.get(
  "/auth/instagram/secrets",
  passport.authenticate("instagram", { failureRedirect: "/login" }),
  function(req, res) {
    // Successful authentication, redirect home.
    res.redirect("/secrets");
  }
);

// route to get login route
app.get("/login", function(req, res) {
  res.render("login");
});

// route to get register route
app.get("/register", function(req, res) {
  res.render("register");
});

// route to get secrets route
app.get("/secrets", function(req, res) {
  // go through db and find all documents with secret not null
  User.find({"secret": {$ne: null} }, function(err, foundUsers){
    if(err){
      console.log(err);
    } else {
      if(foundUsers){
        // usersWithSecrets correlates to ejs marker in secrets.ejs
        res.render("secrets", {usersWithSecrets: foundUsers});
      }
    }
  })
});

// get route for submit page if authenticated
app.get("/submit", function(req, res){
  // check to see if user is authenticated. If so take to submit page, if not take to login page
  if (req.isAuthenticated()) {
    res.render("submit");
  } else {
    res.redirect("/login");
  }
});

// route for logging out
app.get("/logout", function(req, res) {
  req.logout();
  res.redirect("/");
});

// route to register new users
app.post("/register", function(req, res) {
  // use passport-local-mongoose register() to register user
  User.register({ username: req.body.username }, req.body.password, function(
    err,
    user
  ) {
    if (err) {
      console.log(err);
      res.redirect("/register");
    } else {
      passport.authenticate("local")(req, res, function() {
        res.redirect("/secrets");
      });
    }
  });
});

// route for users to login
app.post("/login", function(req, res) {
  // create user that wishes to login
  const user = new User({
    username: req.body.username,
    password: req.body.password
  });

  // use passport's login() to login and authenticate user
  req.login(user, function(err) {
    if (err) {
      console.log(err);
    } else {
      passport.authenticate("local")(req, res, function() {
        res.redirect("/secrets");
      });
    }
  });
});

// route to post new secret
app.post("/submit", function(req, res){
  // create const for secret user inputted
  const submittedSecret = req.body.secret;

  // console user's id when we click submit to use in findById function
  console.log(req.user.id);

  // find current logged in user in db and save secret to their file
  User.findById(req.user.id, function(err, foundUser){
    if(err){
      console.log(err);
    } else {
      foundUser.secret = submittedSecret;
      foundUser.save(function(){
        res.redirect("/secrets");
      });
    }
  });
});

app.listen(PORT, function() {
  console.log("App listening on PORT: " + PORT);
});
