( function () {
	"use strict";

	var usage = require( "usage" );
	var path = require( "path" );
	var nools = require( "nools" );
	var MongoClient = require( "mongodb" ).MongoClient;

	var User = require( "../../../models/User" );
	var Message = require( "../../../models/Message" );
	var Question = require( "../../../models/Question" );
	var Answer = require( "../../../models/Answer" );
	var Flags = require( "./objects/Flags" );

	var secrets = require( "../../../config/secrets" );

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

			jaby.getUser = function ( socket ) {
				return socket && socket.request && socket.request.user ? socket.request.user : undefined;
			};

			jaby.getUserDB = function ( socket ) {
				var userID = socket.request.user._id.toString();
				return secrets.db + "/" + userID;
			};

			jaby.loadUser = function ( socket ) {

				function loadFacts() {

					var connectionString = jaby.getUserDB( socket );

					if ( user.hasSession() && connectionString ) {

						MongoClient.connect( connectionString, function ( err, database ) {

							var factsCollection;

							if ( err ) {
								jaby.logger.error( "%s:\tCould not connect to MongoDB: %s", new Date(), err );
							}

							if ( database ) {

								factsCollection = database.collection( "facts" );
								factsCollection.findOne( {
									_id: user.id
								}, function ( err, userFacts ) {

									try {
										database.close();
									}
									catch ( e ) {
										jaby.logger.error( "Could not close database: %s", e );
									}

									if ( err || !userFacts ) {
										jaby.logger.error( "%s\tCould not load user facts: %s", new Date(), err || "none" );
									}
									else {
										//	TODO: Implement
									}

								} );

							}

						} );

					}

				}

				var user = socket.request.user;
				var userID = user.id;
				var flow, options, property;
				var self = this;

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
					this.users[ userID ] = user;

					user.logger = this.logger;
					user.io = this.io;
				}

				user.addSocket( socket.id, jaby );

				if ( !user.session ) {

					//	Setup the knowledge for user (Nools)
					options = {
						name: userID,
						define: {},
						scope: {
							logger: this.logger,
							user: user
						}
					};

					for ( property in this.objects ) {
						if ( this.objects.hasOwnProperty( property ) ) {
							options.define[ property ] = this.objects[ property ];
						}
					}

					try {

						flow = nools.compile( path.resolve( __dirname, "./rules/core.nools" ), options );

					}
					catch ( e ) {
						this.logger.error( "Couldn't compile rules for user: %s", e );
					}

					try {

						if ( flow ) {
							user.session = flow.getSession();
						}

					}
					catch ( e ) {
						this.logger.error( "Couldn't get session for user: %s", e );
					}

					if ( user.session ) {

						try {

							user.session.assert( new Flags() );

							loadFacts();
							user.session.match( function ( err ) {
								if ( err ) {
									console.error( err );
									self.logger.error( "Could not match rules: %s", err );
								}
							} );

						}
						catch ( e ) {
							this.logger.error( "Couldn't add user to rules: %s", e );
						}

					}
					else {
						this.logger.error( "No session for user." );
					}
				}

			};

			jaby.saveSession = function ( socket ) {

				var user = jaby.getUser( socket );
				var sessionFacts, numFacts, i, fact;

				if ( user && user.hasSession() ) {

					sessionFacts = user.session.getFacts();
					numFacts = sessionFacts.length;
					for ( i = 0; i < numFacts; i++ ) {
						fact = sessionFacts[ i ];

						if ( fact.save ) {
							fact.save();
						}
						else {
							console.error( "Cannot save fact (%s), since not a Mongoose object.", typeof fact );
							console.info( JSON.stringify( fact, null, "\t" ) );
						}
					}

				}
			};

			jaby.unloadUser = function ( socket ) {

				var user = socket && socket.request && socket.request.user ? socket.request.user : undefined;
				var userID = user.id;

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

					questionObject = new Question();
					questionObject.question = question;
					questionObject.answers = answers;

					jaby.assert( userID, questionObject, true );

				}

				var user, userID;

				if ( !io || !socket ) {
					return;
				}

				user = this.getUser( socket );
				userID = user.id;

				jaby.logger.info( "Socket connected: %s for %s", socket.handshake.address, userID );
				jaby.io = io;

				try {
					jaby.loadUser( socket );
				}
				catch ( e ) {
					console.error( "Could not load user: %s", e );
					if ( e.stack ) {
						console.info( e.stack );
					}
				}

				socket.on( "start", function () {

					var connectionString = jaby.getUserDB( socket );

					if ( connectionString ) {

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

						console.error( socket.request );

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

						jaby.saveSession( socket );
						jaby.unloadUser( socket );
						jaby.logger.info( "User disconnected: %s", userID );

					}
					else {

						jaby.logger.info( "Socket disconnected: %s", socket.handshake.address );

					}

				} );

				socket.on( "status", function ( context ) {

					var connectionString = jaby.getUserDB( socket );
					var now = new Date();
					var response;
					var pid = process.pid;
					var options = {
						keepHistory: true
					};

					if ( context.hasOwnProperty( "ttl" ) && context.ttl < now ) {
						return;
					}

					if ( connectionString ) {
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
