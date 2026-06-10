const Home = require('../models/home');
const User = require('../models/user');
const Booking = require('../models/booking');
const { cloudinary } = require('../utils/cloudinary');

exports.getaddhome = (req, res, next) => {
  if (req.session.user.userType === 'guest') {
    return res.redirect('/host/become-host');
  }
  res.render('host/edit-home', {
    pageTitle: 'addHome',
    currentPath: '/host/add-home',
    editing: false,
    isLoggedIn: req.isLoggedIn,
    user: req.session.user,
    errorMessage: null
  });
}

exports.getEditHome = (req, res, next) => {
  const homeId = req.params.homeId;

  Home.findById(homeId).then(home => {
    if (!home) return res.redirect("/host/host-home-list");

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
      errorMessage: null
    });
  });
}

exports.getHostHomes = (req, res, next) => {
  Home.find({ userId: req.session.user._id }).then(registeredHomes => {
    res.render('host/host-home-list', {
      registeredHomes: registeredHomes,
      pageTitle: 'Host Homes List',
      currentPath: '/host-home',
      isLoggedIn: req.isLoggedIn,
      user: req.session.user,
    });
  });
}

exports.postaddhome = async (req, res, next) => {
  try {
    const { houseName, price, location, description } = req.body;

    if (!req.file) {
      return res.render('host/edit-home', {
        pageTitle: 'Add Home',
        currentPath: '/host/add-home',
        editing: false,
        isLoggedIn: req.isLoggedIn,
        user: req.session.user,
        errorMessage: 'Please upload an image in JPG, JPEG, or PNG format only.'
      });
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
    res.redirect("/host/host-home-list");

  } catch (err) {
    console.error("POST ADD HOME ERROR:", err);
    res.status(500).send(err.message);
  }
};

exports.postEditHome = async (req, res, next) => {
  try {
    const { id, houseName, price, location, description } = req.body;

    const home = await Home.findById(id);
    if (!home) return res.redirect('/host/host-home-list');

    if (home.userId.toString() !== req.session.user._id.toString()) {
      return res.redirect('/host/host-home-list');
    }

    // Wrong format check — file choose ki but rejected hui fileFilter se
    if (req.body.photo === '' && !req.file && req.headers['content-type']?.includes('multipart')) {
      // koi file upload attempt hua lekin reject hua
    }

    home.houseName = houseName;
    home.price = price;
    home.location = location;
    home.description = description;

    if (req.file) {
      home.photo = req.file.path;
    }

    await home.save();
    res.redirect('/host/host-home-list');

  } catch (err) {
    console.log("Error:", err);
    res.status(500).send(err.message);
  }
};

exports.postDeleteHome = async (req, res, next) => {
  const homeId = req.params.homeId;

  try {
    const home = await Home.findById(homeId);
    if (!home) return res.redirect('/host/host-home-list');

    if (home.userId.toString() !== req.session.user._id.toString()) {
      return res.redirect('/host/host-home-list');
    }

    const activeBookings = await Booking.findOne({
      homeId: homeId,
      status: { $in: ['pending', 'confirmed'] }
    });

    if (activeBookings) {
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

    if (home.photo) {
      const publicId = home.photo.split('/').pop().split('.')[0];
      await cloudinary.uploader.destroy(`airbnb-clone/${publicId}`);
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
    const homes = await Home.find({ userId: hostId });
    const homeIds = homes.map(home => home._id);

    const bookings = await Booking.find({ homeId: { $in: homeIds } })
      .populate('homeId')
      .populate('userId')
      .sort({ createdAt: -1 });

    const pendingCount = bookings.filter(b => b.status === 'pending').length;
    const confirmedCount = bookings.filter(b => b.status === 'confirmed').length;
    const rejectedCount = bookings.filter(b => b.status === 'rejected').length;
    const totalEarnings = bookings
      .filter(b => b.status === 'confirmed')
      .reduce((sum, b) => sum + b.totalPrice, 0);

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