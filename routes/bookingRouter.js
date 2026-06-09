const express = require('express');
const bookingRouter = express.Router();
const bookingController = require('../controllers/bookingController');

bookingRouter.get('/book/:homeId', bookingController.getBookingPage);
bookingRouter.post('/book/:homeId', bookingController.postBooking);
bookingRouter.get('/booking/confirm/:bookingId', bookingController.getConfirmPage);
bookingRouter.post('/booking/confirm/:bookingId', bookingController.postConfirmPayment);
bookingRouter.post('/booking/cancel/:bookingId', bookingController.postCancelBooking);
bookingRouter.get('/host/booking-requests', bookingController.getHostRequests);
bookingRouter.post('/booking/accept/:bookingId', bookingController.postAcceptBooking);
bookingRouter.post('/booking/reject/:bookingId', bookingController.postRejectBooking);

module.exports = bookingRouter;