const bcrypt = require('bcrypt');

module.exports = function(app, db) {
  app.use(function(req, res, next) {
    res.header("Access-Control-Allow-Origin", "*");
    res.header("Access-Control-Allow-Headers", "Origin, X-Requested-With, Content-Type, Accept, X-Auth-Token");
    res.header("Access-Control-Allow-Methods", "GET, POST, OPTIONS, PUT, PATCH, DELETE");
    next();
  });

	app.post('/auth/register', (req, res) => {
		const username = req.body.username;
		const password = req.body.password;

		console.log(username, password);
		
		db.collection('users')
			.findOne({'username':username})
			.then((result) => {
				if (result !== null) {
			  		res.status(409)
					res.send({'message' : 'Username already existing'});
				} else {
					const hash = bcrypt.hashSync(password, 8);
					const user = {
						username,
						password: hash
					};
					db.collection('users').insertOne(user).then(() => {
						req.session.save();
						res.status(200);
						res.json({
							"authenticated": true,
							"accessToken": req.sessionID,
						});
					}).catch((e) => {
						res.status(500);
						res.send({'message' : 'Failed registering user'});
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
					res.status(401);
					res.send({'message' : 'User not found'});
				} else {
					const hash = result.password;
					if (bcrypt.compareSync(password, hash)) {
						req.session.save();
						res.status(200);
						res.json({
							"authenticated": true,
							"accessToken": req.sessionID,
						});
					} else {
						res.status(401);
						res.send({'message' : 'Wrong password'});
					}
					
				}
		});
  	});

	app.get('/sessioncount', (req, res) => {
		db.collection('session').count({}).then((sessionsCount)=>{
				//db.collection('session').findOne({}).then((usersRes)=>{
					res.status(200);
					res.json({"sessionsCount": sessionsCount});
					//res.json({"usersCount": usersCount, "users": usersRes});
				//})
		})
	});

	app.get('/userscount', (req, res) => {
		db.collection('users').count({}).then((usersCount)=>{
				//db.collection('session').findOne({}).then((usersRes)=>{
					res.status(200);
					res.json({"usersCount": usersCount});
					//res.json({"usersCount": usersCount, "users": usersRes});
				//})
		})
	});

  	app.get('/auth/logout', (req, res) => {
  		const authToken = req.get('x-auth-token');
  		db.collection('session').findOne({'_id': authToken}, (err, item) => {
  			if (err) {
				res.status(500);
			} else {
				if (item) {
			  		db.collection('session').remove({
			  			'_id': authToken,
			  		}).then(() => {
			  			res.status(200);
			  			res.json({
			  				message: "User logged out successfully"
			  			});
			  		});
				} else {
					res.status(403);
			    	res.json({
			    		message: "You have to be logged-in in order to log out",
			    	});
				}
			}
  		});
  	});
};