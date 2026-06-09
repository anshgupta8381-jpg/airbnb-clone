const mongoose = require('mongoose');

const userSchema = mongoose.Schema({
  firstName: {
    type: String,
    required: false
  },

  lastName: String,

  email: {
    type: String,
    required: [true, 'Email is required'],
    unique: true
  },

  password: {
    type: String,
    required: false
  },

  googleId: {
    type: String,
    default: null
  },

  roleSelected: {
    type: Boolean,
    default: false
  },

  userType: {
    type: String,
    enum: ['guest', 'host'],
    default: 'guest'
  },

  favourites: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Home'
  }]
});

module.exports = mongoose.model('User', userSchema);