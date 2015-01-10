( function () {
	"use strict";

	var usage = require( "usage" );
	var path = require( "path" );
	var MongoClient = require( "mongodb" ).MongoClient;

	var Flags = require( "./objects/Flags" );
	var User = require( "./objects/User" );
	var Message = require( "./objects/Message" );
	var Question = require( "./objects/Question" );
	var Answer = require( "./objects/Answer" );

	var secrets = require( path.relative( __dirname, path.join( process.cwd(), "config", "secrets" ) ) );

	var coreRules = {

		name: "Core",

		//	`exports.attach` gets called by Broadway on `app.use`
		attach: function ( jaby ) {

			jaby.objects = {};
			jaby.objects.Flags = Flags;
			jaby.objects.Message = Message;
			jaby.objects.User = User;
			jaby.objects.Question = Question;
			jaby.objects.Answer = Answer;

			jaby.loadUser = function ( socket ) {

				var userID = socket && socket.request && socket.request.user ? socket.request.user._id.toString() : undefined;
				var user;

				if ( !userID ) {
					return;
				}

				if ( !this.hasOwnProperty( "users" ) ) {
					this.users = {};
				}

				if ( this.users.hasOwnProperty( userID ) ) {
					user = this.users[ userID ];
				}
				else {
					user = new User( userID, jaby );
					this.users[ userID ] = user;
				}

				if ( user ) {
					user.addSocket( socket.id, jaby );
				}

			};

			jaby.unloadUser = function ( socket ) {

				var userID = socket && socket.request && socket.request.user ? socket.request.user._id.toString() : undefined;
				var user;

				if ( !userID ) {
					return;
				}

				if ( !this.hasOwnProperty( "users" ) ) {
					this.users = {};
				}

				if ( this.users.hasOwnProperty( userID ) ) {

					user = this.users[ userID ];
					user.removeSocket( socket.id );

					if ( !user.isActive() ) {
						delete this.users[ userID ];
					}

				}

			};

			jaby.assert = function ( userID, assertion, match ) {

				var user;

				if ( !userID || typeof userID !== "string" || !assertion ) {
					return;
				}

				if ( !this.users || !this.users.hasOwnProperty( userID ) ) {
					return;
				}
				else {

					try {
						user = this.users[ userID ];

						if ( user.isActive() ) {
							user.session.assert( assertion );

							if ( match ) {
								this.match( userID );
							}
						}
					}
					catch ( e ) {
						console.error( "There was an error adding assertion to rules: %s", e );
					}
				}

			};

			jaby.match = function ( userID ) {

				var user;

				if ( !userID || typeof userID !== "string" ) {
					return;
				}

				if ( !this.users || !this.users.hasOwnProperty( userID ) ) {
					return;
				}
				else {

					try {

						user = this.users[ userID ];

						if ( user.isActive() ) {
							user.session.match();
						}

					}
					catch ( e ) {
						console.error( "There was an error matching rules: %s", e );
					}

				}

			};

			jaby.registerSocket = function ( io, socket ) {

				function askQuestion() {

					var questionObject;

					var question = "Does the QA function work?";
					var answers = [ {
						id: 123,
						text: "Testing One"
					}, {
						id: 456,
						text: "Testing Two"
					}, {
						id: 789,
						text: "Testing Three"
					} ];

					questionObject = new Question( question, answers );

					jaby.assert( userID, questionObject, true );

				}

				var userID = socket.request.user && socket.request.user._id ? socket.request.user._id.toString() : undefined;

				if ( !io || !socket ) {
					return;
				}

				jaby.logger.info( "Socket connected: %s", socket.handshake.address );
				jaby.io = io;

				try {
					jaby.loadUser( socket );
				}
				catch ( e ) {
					console.error( "Could not load user: %s", e );
				}

				socket.on( "start", function () {

					var connectionString;

					if ( userID ) {

						connectionString = secrets.db + "/" + userID;

						MongoClient.connect( connectionString, function ( err, database ) {
							var contextCollection;

							if ( err ) {
								jaby.logger.error( "%s:\tCould not connect to MongoDB: %s", new Date(), err );
							}

							if ( database ) {
								contextCollection = database.collection( "context" );
								contextCollection.ensureIndex( {
									"when": 1
								}, {
									expireAfterSeconds: 3600
								}, function ( err ) {
									if ( err ) {
										jaby.logger.error( "%s\tCould not add expiration to context collection: %s", new Date(), err );
									}
									else {
										jaby.logger.info( "Start %s: %s", socket.handshake.address, socket.request.user.profile.name );

										try {
											database.close();
										}
										catch ( e ) {
											jaby.logger.error( "Could not close database: %s", e );
										}

										askQuestion();
									}
								} );
							}
						} );

					}
					else {

						jaby.logger.error( "Could not obtain user from socket." );

					}

				} );

				socket.on( "message", function ( data ) {

					var message = data && data.message ? data.message : null;

					if ( userID && message ) {

						console.info( "Got \"%s\" from %s", message, userID );
						jaby.assert( userID, message, true );

					}

				} );

				socket.on( "answer", function ( data ) {

					var answerObject;

					jaby.logger.info( "Received answer \"%s\" from %s: \"%s\"", data.question, socket.handshake.address, data.answer );

					if ( data.question && data.answer ) {

						answerObject = new Answer( data.question, data.answer );
						jaby.assert( userID, answerObject, true );
					}

				} );

				socket.on( "disconnect", function () {

					if ( userID ) {

						jaby.unloadUser( socket );
						jaby.logger.info( "User disconnected: %s", userID );

					}
					else {

						jaby.logger.info( "Socket disconnected: %s", socket.handshake.address );

					}

				} );

				socket.on( "status", function ( context ) {
					var now = new Date();
					var response;
					var connectionString;
					var pid = process.pid;
					var options = {
						keepHistory: true
					};

					if ( context.hasOwnProperty( "ttl" ) && context.ttl < now ) {
						return;
					}
					else {
						response = {
							message: "online"
						};

						usage.lookup( pid, options, function ( err, result ) {
							if ( err ) {
								jaby.logger.error( "Could not get machine usage: %s", err );
							}
							else {
								if ( result ) {
									response.usage = result;
								}
							}

							connectionString = secrets.db + "/" + socket.request.user._id.toString();

							MongoClient.connect( connectionString, function ( err, database ) {
								var contextCollection;

								if ( err ) {
									jaby.logger.error( "%s:\tCould not connect to MongoDB: %s", new Date(), err );
								}

								if ( database ) {
									contextCollection = database.collection( "context" );
									if ( context ) {
										context.when = new Date();
										contextCollection.save( context, function ( err ) {
											try {
												database.close();
											}
											catch ( e ) {
												jaby.logger.error( "Could not close database: %s", e );
											}

											if ( err ) {
												jaby.logger.error( "%s\tCould not save context: %s", new Date(), err );
											}

											jaby.logger.info( "%s\t%s: %s", new Date(), socket.request.user._id, JSON.stringify( response ) );
											io.sockets.emit( "status", response );
										} );
									}
								}
							} );
						} );
					}
				} );
			};

		},

		//	`exports.init` gets called by Broadway on `app.init`.
		init: function ( done ) {
			return done();
		}

	};

	module.exports = coreRules;

} ).call( this );
