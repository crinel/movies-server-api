var ObjectID = require('mongodb').ObjectID;

module.exports = function(app, db) {
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
};