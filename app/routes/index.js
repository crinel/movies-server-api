const movieRoutes = require('./movie_routes');
module.exports = function(app, db) {
  movieRoutes(app, db);
  // Other route groups could go here, in the future
};