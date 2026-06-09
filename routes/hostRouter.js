const express = require('express');
const hostRouter = express.Router();
const hostController = require('../controllers/hostController');

hostRouter.get("/host/add-home",hostController.getaddhome);
hostRouter.post("/host/add-home", hostController.postaddhome);
hostRouter.get("/host/host-home-list", hostController.getHostHomes);
hostRouter.get("/host/edit-home/:homeId", hostController.getEditHome);
hostRouter.post("/host/edit-home", hostController.postEditHome)
hostRouter.post("/host/delete-home/:homeId", hostController.postDeleteHome);
hostRouter.get('/host/become-host', hostController.getBecomeHost);
hostRouter.post('/host/become-host', hostController.postBecomeHost);
hostRouter.get('/host/dashboard', hostController.getDashboard);

module.exports= hostRouter;