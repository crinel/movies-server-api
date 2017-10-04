const express        = require('express');
const session        = require('express-session');
const MongoStore     = require('connect-mongo')(session);
const MongoClient    = require('mongodb').MongoClient;
const bodyParser     = require('body-parser');
const db             = require('./config/db');
const app            = express();
const port = process.env.PORT || 8000;

app.use(bodyParser.urlencoded({ extended: true }));


MongoClient.connect(db.url, (err, database) => {
  if (err) return console.log(err);
  app.use(session({
    secret: 'SIIT_FE_MOVIES_API',
    resave: false,
    saveUninitialized: false,
    cookie: { secure: true },
    store: new MongoStore({ db: database , collection: 'session'})
  }));
  require('./app/routes')(app, database);
  app.listen(port, () => {
    console.log('We are live on ' + port);
  });               
})