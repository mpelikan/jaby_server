( function () {
	"use strict";

	var usage = require( "usage" );
	var path = require( "path" );
	var MongoClient = require( "mongodb" ).MongoClient;

	var Flags = require( "./objects/Flags" );
	var User = require( "./objects/User" );
	var Message = require( "./objects/Message" );

	var secrets = require( path.relative( __dirname, path.join( process.cwd(), "config", "secrets" ) ) );

	var coreRules = {

		name: "Core",

		//	`exports.attach` gets called by Broadway on `app.use`
		attach: function ( jaby ) {

			jaby.objects = {};
			jaby.objects.Flags = Flags;
			jaby.objects.Message = Message;
			jaby.objects.User = User;

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

				function generateUUID() {
					/*jslint bitwise: true */

					var d = new Date().getTime();
					var uuid = "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace( /[xy]/g, function ( c ) {
						var r = ( d + Math.random() * 16 ) % 16 | 0;
						d = Math.floor( d / 16 );

						return ( c === "x" ? r : ( r & 0x3 | 0x8 ) ).toString( 16 );
					} );

					return uuid;
				}

				function askQuestion() {

					var id = "question_" + generateUUID();
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

					io.sockets.emit( "question", {
						id: id,
						question: question,
						answers: answers
					} );

				}

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

					var user = socket.request.user && socket.request.user._id ? socket.request.user._id.toString() : undefined;
					var connectionString;

					if ( user ) {

						if ( jaby.bot ) {
							jaby.bot.userConnect( user );
						}

						connectionString = secrets.db + "/" + user;

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

					var user = socket.request.user && socket.request.user._id ? socket.request.user._id.toString() : undefined;
					var message = data && data.message ? data.message : null;

					if ( user && message ) {

						console.info( "Got \"%s\" from %s", message, user );
						jaby.assert( user, message, true );

					}

				} );

				socket.on( "answer", function ( data ) {

					jaby.logger.info( "Received answer \"%s\" from %s: \"%s\"", data.question, socket.handshake.address, data.answer );

				} );

				socket.on( "disconnect", function () {

					var user = socket.request.user && socket.request.user._id ? socket.request.user._id.toString() : undefined;

					if ( user ) {

						jaby.unloadUser( socket );
						jaby.logger.info( "User disconnected: %s", user );

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
