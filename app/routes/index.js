const movieRoutes = require('./movie_routes');
const authRoutes = require('./auth_routes');
module.exports = function(app, db) {
  movieRoutes(app, db);
  authRoutes(app, db);
  // Other route groups could go here, in the future
};