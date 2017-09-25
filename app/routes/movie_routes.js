var ObjectID = require('mongodb').ObjectID;
var rp = require('request-promise-native');
var omdbapi = require('../../config/omdbapi.js');

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
	    db.collection('movies').remove(details, (err, item) => {
	      if (err) {
	        res.send({'error':'An error has occurred'});
	      } else {
	        res.send('Movie ' + id + ' deleted!');
	      }
	    });
	});

	// CREATE
	app.post('/movies', (req, res) => {
		db.collection('movies').insert(req.body, (err, result) => {
			if (err) { 
				res.send({ 'error': 'An error has occurred' }); 
			} else {
				res.send(result.ops[0]);
			}
		});
	});
	
	// UPDATE
	app.put('/movies/:id', (req, res) => {
		const id = req.params.id;
		const details = { '_id': new ObjectID(id) };
		db.collection('movies').update(details, req.body, (err, result) => {
			if (err) {
					res.send({'error':'An error has occurred'});
			} else {
					res.send(req.body);
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