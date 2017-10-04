const ObjectID = require('mongodb').ObjectID;
const rp = require('request-promise-native');
const omdbapi = require('../../config/omdbapi.js');


module.exports = function(app, db) {
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
	app.get('/movies/', (req, res) => {
		const id = req.params.id;
		const cursor = db.collection('movies').find({}).toArray(function(err, items) {
			if (err) {
				res.send({'error':'An error has occurred'});
			} else {
				res.send(items);
			}
		});
	});

	// Populate Movies Collection
	app.post('/movies/all', (req, res) => {
		let promises = [];

		for (let page = 1; page <= omdbapi.noOfMovies / 10; page++) {
			promises.push(populateMovies(db, page));
		}

		Promise.all(promises).then(values => {
			res.send(values);
		})
	});

};

const populateMovies = (db, page) => {
	return rp(`${omdbapi.baseurl}&s=a&page=${page}`)
		.then((response) => {
			var movies = JSON.parse(response).Search;
			return db.collection('movies').insertMany(movies)
				.then((result) => {
					return Promise.resolve(result.ops);
				})
				.catch((err) => {
					return Promise.reject({ 'error': 'An error has occurred' });
				});
		})
		.catch((err) => {
			return Promise.reject({'error':'There was an error with the request from OMDB API'});
		});
}