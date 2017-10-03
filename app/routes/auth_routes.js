const ObjectID = require('mongodb').ObjectID;
const bcrypt = require('bcrypt');

module.exports = function(app, db) {

	app.post('/auth/register', (req, res) => {
		const username = req.body.username;
		const password = req.body.password;
		
		db.collection('users')
			.findOne({'username':username})
			.then((result) => {
				if (result !== null) {
					res.send({'error' : 'Username already existing'});
				} else {
					const hash = bcrypt.hashSync(password, 8);
					const user = {
						username,
						password: hash
					};
					db.collection('users').insertOne(user).then(() => {
						res.send('user successfully registered');
					}).catch((e) => {
						res.send({'error' : 'Failed registering user'});
					});
				}
		});
  	});
	
	app.post('/auth/login', (req, res) => {
		const username = req.body.username;
		const password = req.body.password;
		
		db.collection('users')
			.findOne({'username':username})
			.then((result) => {
				if (result === null) {
					res.send({'error' : 'User not found'});
				} else {
					const hash = result.password;
					console.log(hash);
					if (bcrypt.compareSync(password, hash)) {
						req.session.authenticated = true;
						res.send('user logged in');
					} else {
						res.send({'error' : 'Wrong password'});
					}
					
				}
		});
  	});

  	app.get('/auth/logout', (req, res) => {
  		delete req.session.authenticated;
  		res.send('user logged out');
  	});
};