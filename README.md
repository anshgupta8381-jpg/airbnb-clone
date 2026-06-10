# Airbnb Clone 🏠

[Live Demo](https://airbnb-clone-production-9912.up.railway.app/)

A full-stack Airbnb-inspired web application built using Node.js, Express.js, MongoDB Atlas, EJS, Cloudinary, and Passport Google OAuth.

📖 Description

This project is a complete Airbnb-style rental platform built with Node.js, Express.js, MongoDB Atlas, EJS, and Cloudinary.

Users can browse available homes, create bookings, save favourite properties, and manage their account through Google Authentication.

A key feature of this application is the complete separation between hosts and guests:

Every host manages only their own properties.
Every guest sees only their own bookings and favourites.
Booking requests are isolated to the respective property owner.
No data is shared across users, ensuring an independent experience for each account.

The project follows MVC architecture and uses MongoDB Atlas for persistent cloud storage.

✨ Features
🔐 Authentication
Google OAuth Login using Passport.js
Session-based authentication
Persistent login sessions
Role selection after signup
👤 Guest Features
Browse all available homes
View property details
Add/remove favourites
Book homes
View booking history
Receive booking status updates
Secure access to personal bookings only
🏠 Host Features
Become a host
Add new properties
Upload property images using Cloudinary
Edit property listings
Delete property listings
View only their own homes
Receive booking requests for their homes
Accept or reject booking requests
🔔 Notification System
Host request counter
Guest booking update counter
Notification badges in navigation menu
Real-time style unread tracking using database flags
❤️ Favourites System
Add properties to favourites
Remove favourites
User-specific favourites list
No cross-user data leakage
📸 Image Management
Cloudinary integration
Secure image uploads
Cloud-hosted property images
🛡️ User Data Isolation

The application ensures complete user separation:

Hosts
Can only view their own listings
Can only manage their own listings
Can only receive requests for their own properties
Guests
Can only view their own bookings
Can only manage their own favourites
Can only receive updates related to their bookings

This prevents one user's data from appearing in another user's account.

🏗️ Tech Stack
Backend
Node.js
Express.js
Database
MongoDB Atlas
Mongoose
Frontend
EJS
HTML5
CSS3
JavaScript
Authentication
Passport.js
Google OAuth 2.0
Cloud Storage
Cloudinary
Session Management
Express Session

roject Structure
Airbnb-Clone/
│
├── controllers/
├── models/
├── routes/
├── views/
├── public/
├── middleware/
├── config/
├── .env
├── app.js
├── package.json
└── README.md

🎯 Future Improvements
Real-time notifications using Socket.io
Payment Gateway Integration
Property Search Filters
Property Reviews & Ratings
Wishlist Sharing
Email Notifications
Admin Dashboard
Availability Calendar


👨‍💻 Author

Ansh Gupta

Built as a full-stack learning project to explore:

Authentication
Session Management
MongoDB Relationships
Cloudinary Integration
MVC Architecture
Deployment on Railway
Connect Mongo
Deployment
Railway
