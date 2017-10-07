const ObjectID = require('mongodb').ObjectID;
const rp = require('request-promise-native');
const omdbapi = require('../../config/omdbapi.js');


module.exports = function(app, db) {
  app.use(function(req, res, next) {
    res.header("Access-Control-Allow-Origin", "*");
    res.header("Access-Control-Allow-Headers", "Origin, X-Requested-With, Content-Type, Accept");
    next();
  });

	/****** MOVIE ******/
	// GET
	app.get('/movies/:id', (req, res) => {
		const id = req.params.id;
	    const details = { '_id': new ObjectID(id) };
	    db.collection('movies').findOne(details, (err, item) => {
	      if (err) {
	        res.send({'error':'An error has occurred'});
	      } else {
	        res.send(item);
	      }
	    });
	});

	// DELETE
	app.delete('/movies/:id', (req, res) => {
		const id = req.params.id;
	    const details = { '_id': new ObjectID(id) };
	    const authToken = req.get('x-auth-token');
		//PROTECTED ROUTE check if user is logged in
		db.collection('session').findOne({'_id': authToken}, (err, item) => {
			if (err) {
				res.status(500);
			} else {
				console.log(item);
				if (item) {
					db.collection('movies').remove(details, (err, item) => {
				      if (err) {
				        res.send({'error':'An error has occurred'});
				      } else {
				        res.send('Movie ' + id + ' deleted!');
				      }
				    });
				} else {
					res.status(403);
			    	res.json({
			    		message: "You need to be authenticated to be able to delete a movie",
			    	});
				}
			}
		});
	});

	// CREATE
	app.post('/movies', (req, res) => {
		const authToken = req.get('x-auth-token');
		//PROTECTED ROUTE check if user is logged in
		db.collection('session').findOne({'_id': authToken}, (err, item) => {
			if (err) {
				res.status(500);
			} else {
				console.log(item);
				if (item) {
					db.collection('movies').insert(req.body, (err, result) => {
						if (err) { 
							res.send({ 'error': 'An error has occurred' }); 
						} else {
							res.send(result.ops[0]);
						}
					});
				} else {
					res.status(403);
			    	res.json({
			    		message: "You need to be authenticated to be able to create a movie",
			    	});
				}
			}
		});
	});
	
	// UPDATE
	app.put('/movies/:id', (req, res) => {
		const id = req.params.id;
		let details;
		try {
			details = { '_id': new ObjectID(id) };
		} catch(e) {
			res.status(400)
			return res.json({'message':'Invalid movie id'});
		}
		const authToken = req.get('x-auth-token');
		//PROTECTED ROUTE check if user is logged in
		db.collection('session').findOne({'_id': authToken}, (err, item) => {
			if (err) {
				res.status(500);
			} else {
				if (item) {
					// need to validate movie id
					db.collection('movies').update(details, { $set : req.body}, (err, result) => {
						if (err) {
								res.send({'message':'An error has occurred'});
						} else {
								res.send(req.body);
						} 
					});
				} else {
					res.status(403);
			    	res.json({
			    		message: "You need to be authenticated to be able to update a movie",
			    	});
				}
			}
		});
	});

	/****** MOVIE ******/
	// GET Movies
	app.get('/movies', (req, res) => {
		const projection = {
      Title: true,
      Year: true,
      Runtime: true,
      Genre: true,
      Language: true,
      Country: true,
      Poster: true,
      imdbRating: true,
      imdbVotes: true,
      imdbID: true,
      Type: true
    };

		const query = req.query;
		for (let field in query) {
			if (!projection.hasOwnProperty(field)) {
				res.status(400);
				res.send(`'${field}' does not exist for a movie or is not a searchable field`);
			}
		}

		if (query.Title) {
			try {
				let title = new RegExp(query.Title);
        query.Title = {
          $regex: title,
          $options: 'i'
        }
			}
			catch (e) {
				res.status(400);
				res.send('An invalid regular expression was supplied');
			}
		}

		if (query.Genre) {
      try {
        let genre = new RegExp(query.Genre);
        query.Genre = {
          $regex: genre,
          $options: 'i'
        }
      }
      catch (e) {
        res.status(400);
        res.send('An invalid regular expression was supplied');
      }
		}

		const cursor = db.collection('movies').find(query, projection).toArray(function(err, items) {
			if (err) {
				res.send({'error':'An error has occurred'});
			} else {
				res.send(items);
			}
		});
	});

  app.delete('/private/movies/', (req, res) => {
    const authToken = req.get('x-auth-token');
    //PROTECTED ROUTE check if user is logged in
    db.collection('session').findOne({'_id': authToken}, (err, item) => {
      if (err) {
        res.status(500);
      } else {
        console.log(item);
        if (item) {
          db.collection('movies').remove({}, (err, item) => {
            if (err) {
              res.send({'error':'An error has occurred'});
            } else {
              res.send('Movies deleted!');
            }
          });
        } else {
          res.status(403);
          res.json({
            message: "You need to be authenticated to be able to delete a movie",
          });
        }
      }
    });
  });

	// Populate Movies Collection
	app.post('/movies/all', (req, res) => {
		let promises = [];

		for (let page = 1; page <= omdbapi.noOfMovies / 10; page++) {
			promises.push(getAllMoviesDetails(db, page));
		}

		Promise.all(promises).then(arraysOfMovies => {
			const movies = arraysOfMovies
											.reduce((acc, arrayOfMovies) => {
												console.log('array of movies length', arrayOfMovies.length);
												return acc.concat(arrayOfMovies);
											}, [])
											.map((movieString) => JSON.parse(movieString));
      db.collection('movies').insertMany(movies)
        .then((result) => {
          console.log('success',result.ops.length);
          res.send(result.ops);
        })
        .catch((err) => {
          console.log('error');
          res.send({ 'error': 'An error has occurred when populating movies' });
        });
		})
	});
};

const getAllMoviesDetails = (db, page) => {
  return rp(`${omdbapi.baseurl}&s=a&page=${page}`)
    .then((response) => {
      const movies = JSON.parse(response).Search;

      let detailsPromises = movies.map((movie) => {
        return rp(`${omdbapi.baseurl}&i=${movie.imdbID}`);
      });

      console.log(detailsPromises.length);

			return Promise.all(detailsPromises)
        .catch((err) => {
          return Promise.reject({'error':'There was an error with the details request from OMDB API'});
        });
    })
    .catch((err) => {
        return Promise.reject({'error':'There was an error with the request from OMDB API'});
    });
};