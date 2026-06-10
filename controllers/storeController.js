
const Home = require('../models/home');
const User = require('../models/user');
const Booking = require('../models/booking');

exports.getIndex= (req,res, next)=>{ 
    Home.find().then(registeredHomes=>{  
    res.render('store/index', {
                      registeredHomes: registeredHomes,
                      pageTitle: 'airbnb-home',
                      currentPath: '/index',
                      isLoggedIn: req.isLoggedIn,
                      user: req.session.user,
  })
});  
}

exports.gethomes= (req,res, next)=>{ 
  Home.find().then(registeredHomes=>{
         res.render('store/home-list', {
                      registeredHomes: registeredHomes,
                      pageTitle: 'Homes List',
                      currentPath: '/home',
                      isLoggedIn: req.isLoggedIn,
                      user: req.session.user
  })
  }) 
}

exports.getBookings = async (req, res, next) => {
  try {

    // Guest ne bookings page open kar liya
    // saari unread updates read mark kar do
    await Booking.updateMany(
      {
        userId: req.session.user._id,
        status: { $in: ['confirmed', 'rejected'] },
        guestSeen: false
      },
      {
        guestSeen: true
      }
    );

    const bookings = await Booking.find({
      userId: req.session.user._id
    })
      .populate('homeId')
      .sort({ createdAt: -1 });

    res.render('store/bookings', {
      bookings,
      pageTitle: 'My Bookings',
      currentPath: '/bookings',
      isLoggedIn: req.isLoggedIn,
      user: req.session.user
    });

  } catch (err) {
    console.log(err);
    res.redirect('/');
  }
};

exports.getFavouriteList = async (req, res, next) => {
  if (!req.session.user) {
    return res.redirect('/login');
  }

  const user = await User.findById(req.session.user._id)
    .populate('favourites');

  res.render('store/favourite-list', {
    favouriteHomes: user.favourites,
    pageTitle: 'My Favourites',
    currentPath: '/favourites',
    isLoggedIn: req.isLoggedIn,
    user: req.session.user
  });
};

exports.postAddToFavourite = async (req, res, next) => {
  const homeId = req.body.Id;

  const user = await User.findById(req.session.user._id);

  if (!user.favourites.includes(homeId)) {
    user.favourites.push(homeId);
    await user.save();
  }

  res.redirect('/favourites');
};

exports.postRemoveFromFavourite = async (req, res, next) => {
  const homeId = req.params.homeId;

  const user = await User.findById(req.session.user._id);

  user.favourites = user.favourites.filter(
    favId => favId.toString() !== homeId
  );

  await user.save();

  res.redirect('/favourites');
};

exports.getHomeDetails = (req, res, next) => {
  // Login nahi hai toh login page pe bhejo
  if (!req.session.isLoggedIn) {
    return res.redirect('/login');
  }

  const homeId = req.params.homeId;

  Home.findById(homeId)
    .populate('userId')
    .then(home => {

      if (!home) {
        console.log("Home not found");
        return res.redirect('/homes');
      }

      res.render('store/home-detail', {
        home: home,
        pageTitle: 'Home Detail',
        currentPath: '/home',
        isLoggedIn: req.isLoggedIn,
        user: req.session.user
      });

    })
    .catch(err => {
      console.log(err);
      res.redirect('/homes');
    });
}
