const mongoose = require('mongoose');

const bookingSchema = mongoose.Schema({
  homeId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Home',
    required: true
  },
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  checkIn: {
    type: Date,
    required: true
  },
  checkOut: {
    type: Date,
    required: true
  },
  totalPrice: {
    type: Number,
    required: true
  },
  status: {
  type: String,
  enum: ['pending', 'confirmed', 'rejected'],
  default: 'pending'
  }
  
}, { timestamps: true });

module.exports = mongoose.model('Booking', bookingSchema);