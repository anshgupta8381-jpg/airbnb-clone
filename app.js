process.on('uncaughtException', (err) => {
  console.error('UNCAUGHT EXCEPTION');
  console.error(err);
  console.error(err.stack);
});

process.on('unhandledRejection', (err) => {
  console.error('UNHANDLED REJECTION');
  console.error(err);
  console.error(err.stack);
});

require('dotenv').config();

const path = require('path');
const session = require('express-session');
const MongoStore = require('connect-mongo').default;
const passport = require('passport');
const GoogleStrategy = require('passport-google-oauth20').Strategy;
const express = require('express');
const mongoose = require('mongoose');
const cookieParser = require('cookie-parser');

const storeRouter = require("./routes/storeRouter");
const hostRouter = require("./routes/hostRouter");
const authRouter = require('./routes/authRouter');
const errorsController = require('./controllers/errors');
const User = require('./models/user');
const Home = require('./models/home');
const Booking = require('./models/booking');
const bookingRouter = require('./routes/bookingRouter');

const DB_PATH = process.env.MONGO_URL;

const app = express();

app.set('view engine', 'ejs');
app.set('views', 'views');

app.use(express.urlencoded({ extended: false }));
app.use(express.static(path.join(__dirname, 'public')));

app.use(session({
  secret: process.env.SESSION_SECRET,
  resave: false,
  saveUninitialized: false,
  store: MongoStore.create({
    mongoUrl: DB_PATH,
    collectionName: 'sessions'
  })
}));

app.use(cookieParser());
app.use(passport.initialize());
app.use(passport.session());

passport.use(new GoogleStrategy({
  clientID: process.env.GOOGLE_CLIENT_ID,
  clientSecret: process.env.GOOGLE_CLIENT_SECRET,
  callbackURL: process.env.CALLBACK_URL || "/auth/google/callback"
}, async (accessToken, refreshToken, profile, done) => {
  try {
    let user = await User.findOne({ googleId: profile.id });
    if (user) return done(null, user);
    user = await User.create({
      googleId: profile.id,
      firstName: profile.displayName,
      email: profile.emails[0].value,
      roleSelected: false
    });
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

app.use(async (req, res, next) => {
  req.isLoggedIn = req.session?.isLoggedIn || req.isAuthenticated();

  if (req.session?.user?.userType === 'host') {
    try {
      const hostHomes = await Home.find({ userId: req.session.user._id });
      const homeIds = hostHomes.map(h => h._id);
      const pendingCount = await Booking.countDocuments({
        homeId: { $in: homeIds },
        status: 'pending'
      });
      res.locals.pendingCount = pendingCount;
    } catch (err) {
      res.locals.pendingCount = 0;
    }
  } else {
    res.locals.pendingCount = 0;
  }

  next();
});

app.use(authRouter);
app.use(storeRouter);

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

app.use((req, res, next) => {
  if (req.isLoggedIn) {
    next();
  } else {
    res.redirect('/login');
  }
});

app.use(hostRouter);
app.use(bookingRouter);
app.use(errorsController.pageNotFound);

const PORT = process.env.PORT || 3002;

mongoose.connect(DB_PATH).then(() => {
  console.log("connected to mongo db");
  app.listen(PORT, () => {
    console.log(`SERVER IS RUNNING ON http://localhost:${PORT}`);
  });
}).catch(err => {
  console.log('error while connecting', err);
});