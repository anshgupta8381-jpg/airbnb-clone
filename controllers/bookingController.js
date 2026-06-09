const Home = require('../models/home');
const Booking = require('../models/booking');

// Booking page — checkIn/checkOut select karo
exports.getBookingPage = async (req, res, next) => {
  try {
    const home = await Home.findById(req.params.homeId);

    if (!home) {
      return res.redirect('/homes');
    }

    // Apna ghar book nahi kar sakta
   if (home.userId.toString() === req.session.user._id.toString()) {
  return res.render('store/booking-payment', {
    home: home,
    pageTitle: 'Book Home',
    currentPath: '/book',
    isLoggedIn: req.isLoggedIn,
    user: req.session.user,
    errorMessages: ['❌ You cannot book your own property']
  });
}

    res.render('store/booking-payment', {
      home: home,
      pageTitle: 'Book Home',
      currentPath: '/book',
      isLoggedIn: req.isLoggedIn,
      user: req.session.user,
      errorMessages: []
    });

  } catch (err) {
    console.log(err);
    res.redirect('/homes');
  }
}

// Booking form submit — dates select karke aage jao
exports.postBooking = async (req, res, next) => {
  try {
    const { checkIn, checkOut } = req.body;
    const home = await Home.findById(req.params.homeId);

    if (!home) {
      return res.redirect('/homes');
    }

    // Apna ghar book nahi kar sakta
    if (home.userId.toString() === req.session.user._id.toString()) {
      return res.redirect('/homes');
    }

    const checkInDate = new Date(checkIn);
    const checkOutDate = new Date(checkOut);

    if (checkInDate >= checkOutDate) {
      return res.render('store/booking-payment', {
        home: home,
        pageTitle: 'Book Home',
        currentPath: '/book',
        isLoggedIn: req.isLoggedIn,
        user: req.session.user,
        errorMessages: ['Check-out date must be after check-in date']
      });
    }

    const nights = Math.ceil(
      (checkOutDate - checkInDate) / (1000 * 60 * 60 * 24)
    );

    const totalPrice = nights * home.price;

    const booking = await Booking.create({
      homeId: home._id,
      userId: req.session.user._id,
      checkIn: checkInDate,
      checkOut: checkOutDate,
      totalPrice,
      status: 'pending'
    });

    res.redirect(`/booking/confirm/${booking._id}`);

  } catch (err) {
    console.log(err);
    res.redirect('/homes');
  }
}
// Payment page — QR code + total dikhao
exports.getConfirmPage = async (req, res, next) => {
  try {
    const booking = await Booking.findById(req.params.bookingId).populate('homeId');
    if (!booking) return res.redirect('/homes');

    // Sirf apni booking dekh sakta hai
    if (booking.userId.toString() !== req.session.user._id.toString()) {
      return res.redirect('/homes');
    }

    res.render('store/booking-confirm', {
      booking: booking,
      home: booking.homeId,
      pageTitle: 'Complete Payment',
      currentPath: '/booking',
      isLoggedIn: req.isLoggedIn,
      user: req.session.user,
    });
  } catch (err) {
    console.log(err);
    res.redirect('/homes');
  }
}

// "I have Paid" button — booking confirm karo
exports.postConfirmPayment = async (req, res, next) => {
  try {
    const booking = await Booking.findById(req.params.bookingId);
    if (!booking) return res.redirect('/homes');

    // Sirf apni booking confirm kar sakta hai
    if (booking.userId.toString() !== req.session.user._id.toString()) {
      return res.redirect('/homes');
    }

    booking.status = 'confirmed';
    await booking.save();

    res.redirect('/bookings');
  } catch (err) {
    console.log(err);
    res.redirect('/homes');
  }
}

exports.postConfirmPayment = async (req, res, next) => {
  try {
    const booking = await Booking.findById(req.params.bookingId);
    if (!booking) return res.redirect('/homes');

    if (booking.userId.toString() !== req.session.user._id.toString()) {
      return res.redirect('/homes');
    }

    // Confirmed nahi, sirf pending rakho — host accept karega
    booking.status = 'pending';
    await booking.save();

    res.redirect('/bookings');
  } catch (err) {
    console.log(err);
    res.redirect('/homes');
  }
}

exports.postCancelBooking = async (req, res, next) => {
  try {
    const booking = await Booking.findById(req.params.bookingId);
    if (!booking) return res.redirect('/bookings');

    // Sirf apni booking cancel kar sakta hai
    if (booking.userId.toString() !== req.session.user._id.toString()) {
      return res.redirect('/bookings');
    }

    // Sirf pending booking cancel ho sakti hai
    if (booking.status === 'confirmed') {
      return res.redirect('/bookings');
    }

    await Booking.findByIdAndDelete(req.params.bookingId);
    res.redirect('/bookings');
  } catch (err) {
    console.log(err);
    res.redirect('/bookings');
  }
}

// Host ke pending requests
exports.getHostRequests = async (req, res, next) => {
  try {
    // Host ki saari homes ke IDs nikalo
    const hostHomes = await Home.find({ userId: req.session.user._id });
    const homeIds = hostHomes.map(home => home._id);

    // Un homes ki saari bookings nikalo
    const requests = await Booking.find({ homeId: { $in: homeIds } })
      .populate('homeId')
      .populate('userId')
      .sort({ createdAt: -1 });

    res.render('host/booking-requests', {
      requests,
      pageTitle: 'Booking Requests',
      currentPath: '/host/booking-requests',
      isLoggedIn: req.isLoggedIn,
      user: req.session.user,
    });
  } catch (err) {
    console.log(err);
    res.redirect('/');
  }
}

// Accept booking
exports.postAcceptBooking = async (req, res, next) => {
  try {
    const booking = await Booking.findById(req.params.bookingId).populate('homeId');
    if (!booking) return res.redirect('/host/booking-requests');

    // Sirf apni home ki booking accept kar sakta hai
    if (booking.homeId.userId.toString() !== req.session.user._id.toString()) {
      return res.redirect('/host/booking-requests');
    }

    booking.status = 'confirmed';
    await booking.save();
    res.redirect('/host/booking-requests');
  } catch (err) {
    console.log(err);
    res.redirect('/host/booking-requests');
  }
}

// Reject booking
exports.postRejectBooking = async (req, res, next) => {
  try {
    const booking = await Booking.findById(req.params.bookingId).populate('homeId');
    if (!booking) return res.redirect('/host/booking-requests');

    // Sirf apni home ki booking reject kar sakta hai
    if (booking.homeId.userId.toString() !== req.session.user._id.toString()) {
      return res.redirect('/host/booking-requests');
    }

    booking.status = 'rejected';
    await booking.save();
    res.redirect('/host/booking-requests');
  } catch (err) {
    console.log(err);
    res.redirect('/host/booking-requests');
  }
}