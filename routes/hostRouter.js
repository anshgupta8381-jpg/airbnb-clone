const express = require('express');
const hostRouter = express.Router();
const hostController = require('../controllers/hostController');
const multer = require('multer');
const { storage, fileFilter } = require('../utils/cloudinary');
const upload = multer({ storage, fileFilter });

const handleUpload = (req, res, next) => {
  upload.single('photo')(req, res, (err) => {
    if (err) {
      req.fileError = err.message;
    }
    next();
  });
};

hostRouter.get("/host/add-home", hostController.getaddhome);
hostRouter.post("/host/add-home", handleUpload, hostController.postaddhome);
hostRouter.get("/host/host-home-list", hostController.getHostHomes);
hostRouter.get("/host/edit-home/:homeId", hostController.getEditHome);
hostRouter.post("/host/edit-home", handleUpload, hostController.postEditHome);
hostRouter.post("/host/delete-home/:homeId", hostController.postDeleteHome);
hostRouter.get('/host/become-host', hostController.getBecomeHost);
hostRouter.post('/host/become-host', hostController.postBecomeHost);
hostRouter.get('/host/dashboard', hostController.getDashboard);

module.exports = hostRouter;