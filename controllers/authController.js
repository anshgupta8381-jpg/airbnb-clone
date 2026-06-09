const { check, validationResult } = require('express-validator');
const User = require('../models/user')
const bcrypt = require('bcryptjs')

exports.getLogin = (req, res, next) => {
  res.render('auth/login', {
    pageTitle: 'Login',
    currentPath: 'login',
    isLoggedIn: false,
    errorMessages: [],        
    oldInput: { email: '' },
    user: {},
  });
}

exports.getSignup = (req, res, next) => {
  res.render('auth/signup', {
    pageTitle: 'Sign Up',
    currentPath: 'signup',
    isLoggedIn: false,
    errorMessages: [],
    oldInput: { firstName: '', lastName: '', email: '', userType: 'guest' },
    user: {},
  });
}

exports.postSignup = [
  check("firstName")
    .trim()
    .isLength({ min: 2 })                         
    .withMessage("First name should be atleast 2 characters long")
    .matches(/^[A-Za-z\s]+$/)
    .withMessage("First name should be alphabets only"),

  check("lastName")
    .trim()
    .matches(/^[A-Za-z\s]*$/)                      
    .withMessage("Last name should be alphabets only"),

  check("email")
    .isEmail()                                     
    .withMessage("Enter a valid email address")
    .normalizeEmail(),

  check("password")
    .isLength({ min: 6 })                        
    .withMessage("Password should be minimum 6 characters")
    .matches(/[A-Z]/)                             
    .withMessage("Password should contain atleast one uppercase letter")
    .matches(/[a-z]/)                              
    .withMessage("Password should contain atleast one lowercase letter")
    .matches(/[0-9]/)                             
    .withMessage("Password should contain atleast one number")
    .matches(/[@#$%^&*?/><.]/)
    .withMessage("Password should contain atleast 1 special character")
    .trim(),

  check("confirmPassword")
    .custom((value, { req }) => {
      if (value !== req.body.password) {
        throw new Error("Passwords do not match");
      }
      return true;
    }),

  check("userType")
    .notEmpty()
    .isIn(['guest', 'host'])
    .withMessage("Invalid user type"),

  check("terms")
    .custom((value) => {                        
      if (value !== 'on') {
        throw new Error("Please accept the terms and conditions");
      }
      return true;
    }),

  (req, res, next) => {
    const { firstName, lastName, email, password, userType } = req.body;
    const errors = validationResult(req);

    if (!errors.isEmpty()) {
      return res.status(422).render("auth/signup", {
        pageTitle: "Sign Up",
        currentPath: "signup",
        isLoggedIn: false,
        errorMessages: errors.array().map(err => err.msg),  
        oldInput: { firstName, lastName, email, password, userType },
        user: {},
      });
    }

    bcrypt.hash(password, 12)
    .then(hashedPassword => {
      const user = new User({
        firstName, lastName, email,
        password: hashedPassword,
        userType,
        roleSelected: true  // Normal signup mein role already select hota hai
      });
      return user.save();
    })
    .then(() => {
      res.redirect("/login");
    })
    .catch(err => {
      return res.status(422).render("auth/signup", {
        pageTitle: "Sign Up",
        currentPath: "signup",
        isLoggedIn: false,
        errorMessages: [err.message],
        oldInput: { firstName, lastName, email, userType },
        user: {},
      })
    })
  }
]

exports.postLogin = async (req, res, next) => {
  const { email, password } = req.body;  

  try {
    const user = await User.findOne({ email: email });

    if (!user) {
      return res.status(422).render("auth/login", {  
        pageTitle: "Login",
        currentPath: "login",
        isLoggedIn: false,
        errorMessages: ["User does not exist"],
        oldInput: { email: email },
        user: {},
      });
    }

    // Google user ne password se login karne ki koshish ki
    if (!user.password) {
      return res.status(422).render("auth/login", {
        pageTitle: "Login",
        currentPath: "login",
        isLoggedIn: false,
        errorMessages: ["This account uses Google login. Please use 'Continue with Google'."],
        oldInput: { email: email },
        user: {}
      });
    }

    const isMatch = await bcrypt.compare(password, user.password);  

    if (!isMatch) {
      return res.status(422).render("auth/login", {
        pageTitle: "Login",
        currentPath: "login",
        isLoggedIn: false,
        errorMessages: ["Incorrect password"],
        oldInput: { email: email },
        user: {}
      });
    }

    req.session.isLoggedIn = true;
    req.session.user = user;      
    await req.session.save();
    res.redirect("/");

  } catch (err) {
    return res.status(422).render("auth/login", {
      pageTitle: "Login",
      currentPath: "login",
      isLoggedIn: false,
      errorMessages: [err.message],
      oldInput: { email: email },
      user: {}                      
    });
  }
}

exports.postLogout = (req, res, next) => {
  req.session.destroy(() => {
    res.redirect("/login");
  });
}

// Google OAuth - Role Select
exports.getSelectRole = (req, res, next) => {
  res.render('auth/select-role', {
    pageTitle: 'Select Role',
    currentPath: 'select-role',
    isLoggedIn: true,
    user: req.session.user,
    errorMessages: [],
  });
}

exports.postSelectRole = async (req, res, next) => {
  const { userType } = req.body;

  if (!['guest', 'host'].includes(userType)) {
    return res.redirect('/auth/select-role');
  }

  try {
    const user = await User.findByIdAndUpdate(
      req.session.user._id,
      { userType: userType, roleSelected: true },
      { new: true }
    );

    req.session.user = user;
    await req.session.save();
    res.redirect('/');
  } catch (err) {
    console.log(err);
    res.redirect('/auth/select-role');
  }
}