( function () {
	"use strict";

	var usage = require( "usage" );
	var path = require( "path" );
	var nools = require( "nools" );
	var cuid = require( "cuid" );
	var MongoClient = require( "mongodb" ).MongoClient;

	var User = require( "../../../models/User" );
	var Knowledge = require( "../../../models/Knowledge" );

	var secrets = require( "../../../config/secrets" );

	var coreRules = {

		name: "Core",

		//	`exports.attach` gets called by Broadway on `app.use`
		attach: function ( jaby ) {

			jaby.sessions = {};

			jaby.getUser = function ( socket ) {
				return socket && socket.request && socket.request.user ? socket.request.user : undefined;
			};

			jaby.getUserID = function ( socket ) {
				var user = this.getUser( socket );
				return user ? user.id : undefined;
			};

			jaby.getUserConnectionString = function ( socket ) {
				var userID = typeof socket === "string" ? socket : this.getUserID( socket );
				return secrets.db + "/" + userID;
			};

			jaby.getUserSession = function ( socket ) {
				var userID = typeof socket === "string" ? socket : this.getUserID( socket );

				if ( !userID ) {
					return null;
				}

				return this.sessions.hasOwnProperty( userID ) ? this.sessions[ userID ] : null;
			};

			jaby.getSessionUser = function ( session ) {
				var facts = session ? session.getFacts( User ) : null;
				return facts && facts.length ? facts[ 0 ] : null;
			};

			jaby.ruleFire = function ( name, rule ) {
				this.logger.debug( "Fired %s - %j", name, rule, {} );
			};

			jaby.factAssert = function ( fact ) {
				this.logger.debug( "Fact asserted: %j", fact, {} );
			};

			jaby.factRetract = function ( fact ) {
				this.logger.debug( "Fact retracted: %j", fact, {} );
			};

			jaby.factModify = function ( fact ) {
				this.logger.debug( "Fact modified: %j", fact, {} );
			};

			jaby.rulesMatched = function ( err ) {

				if ( err ) {
					this.logger.error( "Could not match rules: %s", err, {} );
				}
				else {
					this.logger.debug( "Rules matched." );
				}

			};

			jaby.loadUser = function ( socket ) {

				function setupSession() {

					function loadFacts() {

						var connectionString = jaby.getUserConnectionString( socket );
						var flagsObject;

						if ( user && user.session ) {

							jaby.assert( user.id, user );

							if ( connectionString ) {

								MongoClient.connect( connectionString, function ( err, database ) {

									var factsCollection;

									if ( err ) {
										jaby.logger.error( "Could not connect to MongoDB: %s", err, {} );
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
												jaby.logger.error( "Could not close database: %s", e, {} );
											}

											if ( err ) {
												jaby.logger.error( "Could not load user facts: %s", err || "There are no facts in database", {} );
											}
											else {
												flagsObject = new Knowledge( "flags" );
												jaby.assert( userID, flagsObject );
												jaby.match( userID );

												if ( userFacts ) {
													//	TODO: Implement
												}
											}

										} );

									}

								} );

							}

						}

					}

					var flow;
					var userID = user.id;
					var options = {
						name: userID,
						define: {
							User: User,
							Knowledge: Knowledge
						},
						scope: {
							logger: jaby.logger
						}
					};

					user.logger = jaby.logger;
					user.io = jaby.io;
					user.addSocket( socket );

					jaby.logger.debug( "Creating session for user." );

					try {

						if ( nools.hasFlow( userID ) ) {
							jaby.logger.debug( "Using existing flow for %s", userID, {} );
							flow = nools.getFlow( userID );
						}
						else {
							jaby.logger.debug( "Compiling new set of rules..." );
							flow = nools.compile( path.resolve( __dirname, "./rules/core.nools" ), options );
						}

					}
					catch ( e ) {
						jaby.logger.error( "Couldn't compile rules for user: %s", e, {} );
					}

					if ( flow ) {
						user.session = flow.getSession();
						jaby.sessions[ userID ] = user.session;

						user.session.on( "fire", jaby.ruleFire.bind( jaby ) );
						user.session.on( "assert", jaby.factAssert.bind( jaby ) );
						user.session.on( "retract", jaby.factRetract.bind( jaby ) );
						user.session.on( "modify", jaby.factModify.bind( jaby ) );

						try {
							loadFacts();
						}
						catch ( e ) {
							jaby.logger.error( "Couldn't add user to rules: %s", e );
						}
					}

					if ( !user.session ) {
						jaby.logger.error( "No session for user." );
					}
				}

				var session, sessionUser;
				var user = this.getUser( socket );

				if ( !user ) {
					return;
				}

				session = this.getUserSession( socket );
				sessionUser = this.getSessionUser( session );
				if ( sessionUser ) {

					this.logger.debug( "Using existing session for user." );

					user.logger = sessionUser.logger;
					user.io = sessionUser.io;
					user.sockets = sessionUser.sockets;

					if ( !sessionUser.hasSocket( socket ) ) {
						user.addSocket( socket );
						sessionUser.addSocket( socket );
						session.modify( sessionUser );
					}

				}
				else {
					setupSession();
				}

			};

			jaby.saveSession = function ( socket ) {

				var userID = this.getUserID( socket );
				var session = userID ? this.getUserSession( userID ) : undefined;
				var sessionFacts, numFacts, i, fact;

				if ( session ) {

					sessionFacts = session.getFacts();
					numFacts = sessionFacts.length;
					for ( i = 0; i < numFacts; i++ ) {
						fact = sessionFacts[ i ];

						if ( fact instanceof Knowledge ) {
							// fact.save();
							this.logger.info( "Need to save: %j", fact, {} );
						}
					}

				}
			};

			jaby.unloadUser = function ( socket ) {

				var session = this.getUserSession( socket );
				var user = this.getUser( socket );
				var sessionUser;

				if ( user ) {
					user.removeSocket( socket );
				}

				if ( session ) {

					sessionUser = this.getSessionUser( session );
					if ( sessionUser ) {

						if ( sessionUser.hasSocket( socket ) ) {

							sessionUser.removeSocket( socket );
							session.modify( sessionUser );

						}

					}

				}

			};

			jaby.assert = function ( userID, assertion, match ) {

				var session = this.getUserSession( userID );

				if ( !session ) {
					return;
				}

				if ( assertion === undefined || assertion === null ) {
					return;
				}

				try {
					session.assert( assertion );

					if ( match ) {
						this.match( userID );
					}

				}
				catch ( e ) {
					this.logger.error( "There was an error adding assertion to rules: %s", e, {} );
				}

			};

			jaby.match = function ( userID ) {

				var session = this.getUserSession( userID );

				if ( !session ) {
					return;
				}

				try {

					session.match( this.rulesMatched.bind( this ) );

				}
				catch ( e ) {
					this.logger.error( "There was an error matching rules: %s", e, {} );
				}

			};

			jaby.registerSocket = function ( io, socket ) {

				function askQuestion() {

					var questionObject = new Knowledge( "question", {
						id: cuid(),
						question: "Does the QA function work?",
						answers: [ {
							id: 123,
							text: "Testing One"
						}, {
							id: 456,
							text: "Testing Two"
						}, {
							id: 789,
							text: "Testing Three"
						} ]
					} );

					jaby.logger.debug( "Asserting question..." );
					jaby.assert( userID, questionObject, true );

				}

				var user, userID;

				if ( !io || !socket ) {
					return;
				}

				user = this.getUser( socket );
				userID = user.id;

				this.logger.info( "Socket (%s) connected: %s for %s", socket.id, socket.handshake.address, userID );
				this.io = io;

				try {
					this.loadUser( socket );
				}
				catch ( e ) {
					this.logger.error( "Could not load user: %s", e, {} );
					if ( e.stack ) {
						this.logger.debug( e.stack );
					}
				}

				socket.on( "start", function () {

					var user = jaby.getUser( socket );
					var connectionString = jaby.getUserConnectionString( socket );

					if ( connectionString ) {

						MongoClient.connect( connectionString, function ( err, database ) {
							var contextCollection;

							if ( err ) {
								jaby.logger.error( "Could not connect to MongoDB: %s", err, {} );
							}

							if ( database ) {
								contextCollection = database.collection( "context" );
								contextCollection.ensureIndex( {
									"when": 1
								}, {
									expireAfterSeconds: 3600
								}, function ( err ) {
									if ( err ) {
										jaby.logger.error( "Could not add expiration to context collection: %s", err, {} );
									}
									else {
										jaby.logger.debug( "Start %s: %s", socket.handshake.address, user.profile.name );

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

						jaby.assert( userID, message, true );

					}

				} );

				socket.on( "answer", function ( data ) {

					var answerObject;

					jaby.logger.info( "Received answer \"%s\" from %s: \"%s\"", data.question, socket.handshake.address, data.answer, {} );

					if ( data.question && data.answer ) {

						answerObject = new Knowledge( "answer", {
							question: data.question,
							answer: data.answer
						} );
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

					var user = jaby.getUser( socket );
					var connectionString = jaby.getUserConnectionString( socket );
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
									jaby.logger.error( "Could not connect to MongoDB: %s", err, {} );
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
												jaby.logger.error( "Could not save context: %s", err, {} );
											}

											jaby.logger.debug( "%s: %j", user._id, response, {} );
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
