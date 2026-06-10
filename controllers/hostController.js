const Home = require('../models/home');
const User = require('../models/user'); 
const fs = require('fs');
const Booking = require('../models/booking');

exports.getaddhome = (req, res, next) => {
  // Agar guest hai toh become-host page pe bhejo
  if (req.session.user.userType === 'guest') {
    return res.redirect('/host/become-host');
  }

  res.render('host/edit-home', {
    pageTitle: 'addHome',
    currentPath: '/host/add-home',
    editing: false,
    isLoggedIn: req.isLoggedIn,
    user: req.session.user
  });
}

exports.getEditHome = (req, res, next) => {
  const homeId = req.params.homeId;
  const editing = req.query.editing === 'true';

  Home.findById(homeId).then(home => {
    if (!home) {
      return res.redirect("/host/host-home-list");
    }

    // Sirf apna ghar edit kar sakta hai
    if (home.userId.toString() !== req.session.user._id.toString()) {
      return res.redirect("/host/host-home-list");
    }

    res.render('host/edit-home', {
      home: home,
      pageTitle: 'Edit Your Home',
      currentPath: '/host-home',
      editing: 'editing',
      isLoggedIn: req.isLoggedIn,
      user: req.session.user,
    });
  })
}

exports.getHostHomes = (req, res, next) => {
  // Sirf apni homes fetch karo
  Home.find({ userId: req.session.user._id }).then(registeredHomes => {
    res.render('host/host-home-list', {
      registeredHomes: registeredHomes,
      pageTitle: 'Host Homes List',
      currentPath: '/host-home',
      isLoggedIn: req.isLoggedIn,
      user: req.session.user,
    })
  });
}

exports.postaddhome = async (req, res, next) => {
  try {
    console.log("BODY:", req.body);
    console.log("FILE:", req.file);

    const { houseName, price, location, description } = req.body;

    if (!req.file) {
      return res.status(422).send("No image provided");
    }

    const home = new Home({
      houseName,
      price,
      location,
      photo: req.file.path,
      description,
      userId: req.session.user._id
    });

    await home.save();

    console.log("Home saved successfully");
    res.redirect("/host/host-home-list");

  } catch (err) {
    console.error("POST ADD HOME ERROR:", err);
    res.status(500).send(err.message);
  }
};

exports.postEditHome = (req, res, next) => {
  const { id, houseName, price, location, description } = req.body;

  Home.findById(id).then((home) => {
    if (!home) return res.redirect('/host/host-home-list');

    // Sirf apna ghar edit kar sakta hai
    if (home.userId.toString() !== req.session.user._id.toString()) {
      return res.redirect('/host/host-home-list');
    }

    home.houseName = houseName;
    home.price = price;
    home.location = location;
    home.description = description;

    // ✅ Yeh lagaa
        if (req.file) {
          home.photo = req.file.path;
        }

    return home.save();
  }).then((result) => {
    console.log("Home updated", result);
    res.redirect('/host/host-home-list');
  }).catch((err) => {
    console.log("Error:", err);
  });
};

exports.postDeleteHome = async (req, res, next) => {
  const homeId = req.params.homeId;

  try {
    const home = await Home.findById(homeId);
    if (!home) return res.redirect('/host/host-home-list');

    // Sirf apna ghar delete kar sakta hai
    if (home.userId.toString() !== req.session.user._id.toString()) {
      return res.redirect('/host/host-home-list');
    }

    // Active bookings check karo
    const activeBookings = await Booking.findOne({
      homeId: homeId,
      status: { $in: ['pending', 'confirmed'] }
    });

    if (activeBookings) {
      // Active bookings hain toh delete mat karo
      const registeredHomes = await Home.find({ userId: req.session.user._id });
      return res.render('host/host-home-list', {
        registeredHomes,
        pageTitle: 'Host Homes List',
        currentPath: '/host-home',
        isLoggedIn: req.isLoggedIn,
        user: req.session.user,
        errorMessage: 'Cannot delete — this home has active bookings!'
      });
    }

    await Home.findByIdAndDelete(homeId);
    res.redirect('/host/host-home-list');

  } catch (err) {
    console.log(err);
    res.redirect('/host/host-home-list');
  }
}

exports.getBecomeHost = (req, res, next) => {
  res.render('host/become-host', {
    pageTitle: 'Become a Host',
    currentPath: '/host/become-host',
    isLoggedIn: req.isLoggedIn,
    user: req.session.user,
  });
}

exports.postBecomeHost = async (req, res, next) => {
  try {
    const user = await User.findByIdAndUpdate(
      req.session.user._id,
      { userType: 'host' },
      { new: true }
    );

    req.session.user = user;
    await req.session.save();
    res.redirect('/host/add-home');
  } catch (err) {
    console.log(err);
    res.redirect('/');
  }
}

exports.getDashboard = async (req, res, next) => {
  try {
    const hostId = req.session.user._id;

    // Host ki homes
    const homes = await Home.find({ userId: hostId });

    const homeIds = homes.map(home => home._id);

    // Bookings
    const bookings = await Booking.find({
      homeId: { $in: homeIds }
    })
      .populate('homeId')
      .populate('userId')
      .sort({ createdAt: -1 });

    const pendingCount = bookings.filter(
      booking => booking.status === 'pending'
    ).length;

    const confirmedCount = bookings.filter(
      booking => booking.status === 'confirmed'
    ).length;

    const rejectedCount = bookings.filter(
      booking => booking.status === 'rejected'
    ).length;

    const totalEarnings = bookings
      .filter(booking => booking.status === 'confirmed')
      .reduce((sum, booking) => sum + booking.totalPrice, 0);

    const recentBookings = bookings.slice(0, 5);

    res.render('host/dashboard', {
      pageTitle: 'Host Dashboard',
      currentPath: '/host/dashboard',
      isLoggedIn: req.isLoggedIn,
      user: req.session.user,

      totalHomes: homes.length,
      pendingCount,
      confirmedCount,
      rejectedCount,
      totalEarnings,
      recentBookings
    });

  } catch (err) {
    console.log(err);
    res.redirect('/');
  }
};