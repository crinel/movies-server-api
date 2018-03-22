const ObjectID = require('mongodb').ObjectID;
const rp = require('request-promise-native');
const omdbapi = require('../../config/omdbapi.js');


module.exports = function(app, db) {
  app.use(function(req, res, next) {
    res.header("Access-Control-Allow-Origin", "*");
    res.header("Access-Control-Allow-Headers", "Origin, X-Requested-With, Content-Type, Accept, X-Auth-Token");
    res.header("Access-Control-Allow-Methods", "GET, POST, OPTIONS, PUT, PATCH, DELETE");
    next();
  });

	/****** MOVIE ******/
	// GET
	app.get('/movies/:id', (req, res) => {
		const id = req.params.id;
		try {
	    	const details = { '_id': new ObjectID(id) };
	    	db.collection('movies').findOne(details, (err, item) => {
		      if (err) {
		        res.send({'error':'An error has occurred'});
		      } else {
		        res.send(item);
		      }
		    });
	    } catch (error) {
	    	res.status(400);
	    	res.json({'error' : 'Invalid movie ID'});
	    }
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
		if (req.body && req.body._id) {
			res.status(400);
			res.json({'error': 'You should not provide an _id for a new movie, it will be automatically generated on Server Side'});
			return;
			
		}
		//PROTECTED ROUTE check if user is logged in
		db.collection('session').findOne({'_id': authToken}, (err, item) => {
			if (err) {
				res.status(500);
			} else {
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
		if (req.body && req.body._id) {
			res.status(400);
			res.json({'error': 'You should not update _id property on movie object'});
			return;
			
		}
		try {
			details = { '_id': new ObjectID(id) };
			const authToken = req.get('x-auth-token');
			//PROTECTED ROUTE check if user is logged in
			db.collection('session').findOne({'_id': authToken}, (err, item) => {
				if (err) {
					res.status(500);
				} else {
					if (item) {
						// need to validate movie id
						db.collection('movies').update(details, { $set : req.body}, (err, response) => {
							if (err) {
									res.status(500);
									res.send({'message':'An error has occurred'});
							} else {
									if (response.result.nModified == 0) {
										res.status(400);
										res.json({'message': 'Nothing to update'})
									} else {
										res.status(200);
										res.json(req.body);
									}
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
		} catch(e) {
			res.status(400)
			return res.json({'message':'Invalid movie id'});
		}
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
		let take = query.take;
		let skip = query.skip;
		delete query.take;
		delete query.skip;

		for (let field in query) {
			if (field !== 'take' && field !== 'skip' && !projection.hasOwnProperty(field)) {
				res.status(400);
				res.send(`'${field}' does not exist for a movie or is not a searchable field`);
				return;
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
				res.send(paginate(items, req, take, skip));
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
			db.collection('movies').remove({}).then(() => {
				 db.collection('movies').insertMany(movies)
	        .then((result) => {
	          console.log('success',result.ops.length);
	          res.send(result.ops);
	        })
	        .catch((err) => {
	          console.log('error');
	          res.send({ 'error': 'An error has occurred when populating movies' });
	        });
				
			}).catch((err) => {
					console.log('Error removing items from DB', err);
					res.status(500).json({'error': err});
			});
		}).catch((err) => {
			res.status(500).json({'error': 'Not good :('})
			console.log(err);
		})
	});
};

const getAllMoviesDetails = (db, page) => {
  return rp(`${omdbapi.baseurl}&s=Batman&page=${page}`)
    .then((response) => {
      const movies = JSON.parse(response).Search;

      let detailsPromises = movies.map((movie) => {
        return rp(`${omdbapi.baseurl}&i=${movie.imdbID}`);
      });

			return Promise.all(detailsPromises)
        .catch((err) => {
        	console.log(err);
          return Promise.reject({'error':'There was an error with the details request from OMDB API'});
        });
    })
    .catch((err) => {
    	console.log(err);
        return Promise.reject({'error':'There was an error with the request from OMDB API'});
    });
};

const paginate = (items, req, take = 10, skip = 0) => {
	take = parseInt(take);
  skip = parseInt(skip);

  const numberOfPages = Math.ceil(items.length / take);
	const currentPage = skip === 0 ? 1 : skip > items.length - take ? numberOfPages : Math.ceil(skip / take + 1);
	const results = items.slice(skip, + skip + take);

	// 23 => 3 pages, skip = 20, take = 10
	// 23 => skip = 15, take = 5 => 5 pages, currentpage = 4
  let fullUrl = req.headers['x-forwarded-proto'] + "://" + req.get('host') + req.originalUrl;
  if (fullUrl.indexOf('take') === -1){
  	fullUrl = fullUrl.indexOf('?') === -1 ? fullUrl.concat(`?take=${take}`) : fullUrl.concat(`&take=${take}`);
	}

	if (fullUrl.indexOf('skip') === -1){
  	fullUrl = fullUrl.indexOf('?') === -1 ? fullUrl.concat(`?skip=${skip}`) : fullUrl.concat(`&skip=${skip}`);
	}

  const prev = skip >= take ? fullUrl.replace(`skip=${skip}`, `skip=${skip - take}`) : null;
  const next = skip < take * (numberOfPages-1) ? fullUrl.replace(`skip=${skip}`, `skip=${skip + take}`) : null;

  return {
  	pagination: {
      numberOfPages,
			currentPage,
			links: {
      	self: fullUrl,
				prev,
				next
			}
    },
		results
	}

};