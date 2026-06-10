// =======================
// ERROR HANDLERS
// =======================
process.on('uncaughtException', (err) => {
  console.error('UNCAUGHT EXCEPTION');
  console.error(err);
});

process.on('unhandledRejection', (err) => {
  console.error('UNHANDLED REJECTION');
  console.error(err);
});

// =======================
// ENV CONFIG
// =======================
require('dotenv').config();

// =======================
// CORE IMPORTS
// =======================
const path = require('path');
const express = require('express');
const mongoose = require('mongoose');
const session = require('express-session');
const MongoStore = require('connect-mongo').default;
const passport = require('passport');
const GoogleStrategy = require('passport-google-oauth20').Strategy;
const cookieParser = require('cookie-parser');

// =======================
// ROUTES
// =======================
const storeRouter = require("./routes/storeRouter");
const hostRouter = require("./routes/hostRouter");
const authRouter = require('./routes/authRouter');
const bookingRouter = require('./routes/bookingRouter');
const errorsController = require('./controllers/errors');

// =======================
// MODELS
// =======================
const User = require('./models/user');
const Home = require('./models/home');
const Booking = require('./models/booking');

// =======================
// APP INIT
// =======================
const app = express();
const DB_PATH = process.env.MONGO_URL;

// =======================
// VIEW ENGINE
// =======================
app.set('view engine', 'ejs');
app.set('views', 'views');

// =======================
// BASIC MIDDLEWARE
// =======================
app.use(express.urlencoded({ extended: false }));
app.use(express.static(path.join(__dirname, 'public')));
app.use(cookieParser());

// =======================
// SESSION
// =======================
app.use(session({
  secret: process.env.SESSION_SECRET,
  resave: false,
  saveUninitialized: false,
  store: MongoStore.create({
    mongoUrl: DB_PATH,
    collectionName: 'sessions'
  })
}));

// =======================
// PASSPORT
// =======================
app.use(passport.initialize());
app.use(passport.session());

// =======================
// GOOGLE STRATEGY
// =======================
passport.use(new GoogleStrategy({
  clientID: process.env.GOOGLE_CLIENT_ID,
  clientSecret: process.env.GOOGLE_CLIENT_SECRET,
  callbackURL: process.env.CALLBACK_URL || "/auth/google/callback"
}, async (accessToken, refreshToken, profile, done) => {
  try {
    let user = await User.findOne({ googleId: profile.id });

    if (!user) {
      user = await User.create({
        googleId: profile.id,
        firstName: profile.displayName,
        email: profile.emails[0].value,
        userType: 'guest',
        roleSelected: false
      });
    }

    return done(null, user);
  } catch (err) {
    return done(err, null);
  }
}));

passport.serializeUser((user, done) => {
  done(null, user._id);
});

passport.deserializeUser(async (id, done) => {
  try {
    const user = await User.findById(id);
    done(null, user);
  } catch (err) {
    done(err, null);
  }
});

// =======================
// GLOBAL LOCALS (UI DATA)
// =======================
app.use((req, res, next) => {
  res.locals.user = req.session.user || null;
  res.locals.isLoggedIn = req.session.isLoggedIn || req.isAuthenticated();
  next();
});

// =======================
// MAIN DASHBOARD MIDDLEWARE (COUNTS)
// =======================
app.use(async (req, res, next) => {

  req.isLoggedIn = req.session?.isLoggedIn || req.isAuthenticated();

  // ================= HOST REQUEST COUNT =================
  if (req.session?.user?.userType === 'host') {
    try {
      const hostHomes = await Home.find({ userId: req.session.user._id });
      const homeIds = hostHomes.map(h => h._id);

      res.locals.pendingCount = await Booking.countDocuments({
        homeId: { $in: homeIds },
        status: 'pending'
      });
    } catch {
      res.locals.pendingCount = 0;
    }
  } else {
    res.locals.pendingCount = 0;
  }

  // ================= GUEST UPDATE COUNT =================
  if (req.session?.user?.userType === 'guest') {
    try {
      res.locals.bookingUpdateCount = await Booking.countDocuments({
        userId: req.session.user._id,
        status: { $in: ['confirmed', 'rejected'] }
      });
    } catch {
      res.locals.bookingUpdateCount = 0;
    }
  } else {
    res.locals.bookingUpdateCount = 0;
  }

  next();
});

// =======================
// AUTH ROUTES
// =======================
app.use(authRouter);

// =======================
// GOOGLE AUTH
// =======================
app.get('/auth/google',
  passport.authenticate('google', { scope: ['profile', 'email'] })
);

app.get('/auth/google/callback',
  passport.authenticate('google', { failureRedirect: '/login' }),
  (req, res) => {
    req.session.isLoggedIn = true;
    req.session.user = req.user;

    req.session.save(() => {
      if (!req.user.roleSelected) {
        return res.redirect('/auth/select-role');
      }
      res.redirect('/');
    });
  }
);

// =======================
// STORE ROUTES (PUBLIC PAGES)
// =======================
app.use(storeRouter);

// =======================
// LOGIN GUARD (PROTECTED ROUTES)
// =======================
app.use((req, res, next) => {
  if (req.isLoggedIn) next();
  else res.redirect('/login');
});

// =======================
// HOST + BOOKING ROUTES
// =======================
app.use(hostRouter);
app.use(bookingRouter);

// =======================
// 404
// =======================
app.use(errorsController.pageNotFound);

// =======================
// SERVER START
// =======================
const PORT = process.env.PORT || 3002;

mongoose.connect(DB_PATH)
  .then(() => {
    console.log("connected to mongo db");
    app.listen(PORT, () => {
      console.log(`SERVER RUNNING http://localhost:${PORT}`);
    });
  })
  .catch(err => {
    console.log('DB connection error', err);
  });