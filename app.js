require('dotenv').config();

//core module
const path = require('path');
const rootDir = require("./utils/pathUtil");
const session = require('express-session');
const  MongoStore = require('connect-mongo');
const passport = require('passport');
const GoogleStrategy = require('passport-google-oauth20').Strategy;

//external module
const express = require('express');
const mongoose = require('mongoose');
const cookieParser = require('cookie-parser');
const multer = require('multer');

//local module
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

const randomString = (length) => {
  const characters = 'abcdefghijklmnopqrstuvwxyz';
  let result = '';
  for (let i = 0; i < length; i++) {
    result += characters.charAt(Math.floor(Math.random() * characters.length));
  }
  return result;
}

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, "uploads/");
  },
  filename: (req, file, cb) => {
    cb(null, randomString(10) + '-' + file.originalname);
  }
});

const fileFilter = (req, file, cb) => {
  if (file.mimetype === 'image/jpg' || file.mimetype === 'image/jpeg' || file.mimetype === 'image/png') {
    cb(null, true);
  } else {
    cb(null, false);
  }
}

const multerOptions = { storage, fileFilter }

app.use(express.urlencoded({ extended: false }));
app.use(express.static(path.join(__dirname, 'public')));
app.use(multer(multerOptions).single('photo'));
app.use("/uploads", express.static(path.join(rootDir, 'uploads')));
app.use("/host/uploads", express.static(path.join(rootDir, 'uploads')));
app.use("homes/uploads", express.static(path.join(rootDir, 'uploads')));

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

// Google Strategy
passport.use(new GoogleStrategy({
  clientID: process.env.GOOGLE_CLIENT_ID,
  clientSecret: process.env.GOOGLE_CLIENT_SECRET,
  callbackURL: "/auth/google/callback"
}, async (accessToken, refreshToken, profile, done) => {
  try {
    let user = await User.findOne({ googleId: profile.id });

    if (user) {
      return done(null, user);
    }

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

// Pending count middleware — har request pe update hoga
app.use(async (req, res, next) => {
  req.isLoggedIn = req.session.isLoggedIn || req.isAuthenticated();

  if (req.session.user && req.session.user.userType === 'host') {
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

// Google OAuth Routes
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