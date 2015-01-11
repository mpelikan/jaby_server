( function () {
	"use strict";

	var mongoose = require( "mongoose" );
	var bcrypt = require( "bcrypt-nodejs" );
	var crypto = require( "crypto" );
	var nools = require( "nools" );
	var path = require( "path" );
	var MongoClient = require( "mongodb" ).MongoClient;

	var secrets = require( path.relative( __dirname, path.join( process.cwd(), "config", "secrets" ) ) );

	var userSchema = new mongoose.Schema( {

		email: {
			type: String,
			unique: true,
			lowercase: true
		},
		password: String,

		facebook: String,
		twitter: String,
		google: String,
		github: String,
		instagram: String,
		linkedin: String,
		tokens: Array,

		profile: {
			name: {
				type: String,
				default: ""
			},
			gender: {
				type: String,
				default: ""
			},
			location: {
				type: String,
				default: ""
			},
			website: {
				type: String,
				default: ""
			},
			picture: {
				type: String,
				default: ""
			}
		},

		resetPasswordToken: String,
		resetPasswordExpires: Date

	} );

	/**
	 * Hash the password for security.
	 * "Pre" is a Mongoose middleware that executes before each user.save() call.
	 */
	userSchema.pre( "save", function ( next ) {
		var user = this;

		if ( !user.isModified( "password" ) ) {
			return next();
		}

		bcrypt.genSalt( 5, function ( err, salt ) {
			if ( err ) {
				return next( err );
			}

			bcrypt.hash( user.password, salt, null, function ( err, hash ) {
				if ( err ) {
					return next( err );
				}

				user.password = hash;
				next();
			} );
		} );
	} );

	/**
	 * Validate user's password.
	 * Used by Passport-Local Strategy for password validation.
	 */
	userSchema.methods.comparePassword = function ( candidatePassword, cb ) {
		bcrypt.compare( candidatePassword, this.password, function ( err, isMatch ) {
			if ( err ) {
				return cb( err );
			}
			cb( null, isMatch );
		} );
	};

	/**
	 * Get URL to a user's gravatar.
	 * Used in Navbar and Account Management page.
	 */
	userSchema.methods.gravatar = function ( size ) {
		size = size || 200;

		if ( !this.email ) {
			return "https://gravatar.com/avatar/?s=" + size + "&d=retro";
		}

		var md5 = crypto.createHash( "md5" ).update( this.email ).digest( "hex" );
		return "https://gravatar.com/avatar/" + md5 + "?s=" + size + "&d=retro";
	};


	userSchema.methods.getDisplayName = function () {
		return this.name || this.id;
	};

	userSchema.methods.isActive = function () {
		return this.hasSockets() || this.hasSession();
	};

	userSchema.methods.hasSession = function () {
		return this.session !== null;
	};

	userSchema.methods.hasSockets = function () {

		if ( !this.sockets ) {
			this.sockets = [];
		}

		return this.sockets.length > 0;

	};

	userSchema.methods.addSocket = function ( socketID ) {

		if ( !socketID || typeof socketID !== "string" ) {
			return;
		}

		if ( !this.sockets ) {
			this.sockets = [];
		}

		if ( this.sockets.indexOf( socketID ) === -1 ) {
			this.sockets.push( socketID );
		}

	};

	userSchema.methods.removeSocket = function ( socketID ) {

		var index;

		if ( !socketID || typeof socketID !== "string" ) {
			return;
		}

		if ( !this.socket ) {
			this.socket = [];
		}

		index = this.sockets.indexOf( socketID );
		if ( index > -1 ) {
			this.sockets.splice( index, 1 );
		}

		if ( !this.hasSockets() ) {

			try {
				this.session.dispose();
				nools.deleteFlow( this.id );
			}
			catch ( e ) {
				this.logger.error( "Couldn't delete flow for user: %s", e );
			}

		}

	};

	userSchema.methods.sendMessage = function ( message, type ) {

		var numSockets;
		var i, socketID;

		if ( !this.sockets ) {
			this.sockets = [];
		}

		numSockets = this.sockets.length;
		type = type || "message";

		if ( numSockets === 0 ) {
			console.info( "No sockets to send message to!" );
		}

		for ( i = 0; i < numSockets; i++ ) {

			socketID = this.sockets[ i ];

			if ( this.io.sockets.connected[ socketID ] ) {

				try {
					this.io.sockets.connected[ socketID ].emit( type, message );
				}
				catch ( e ) {
					this.logger.error( "Could not send message (%s): %s", type, e );
				}

			}

		}

	};

	userSchema.methods.loadFacts = function ( jaby ) {

		var connectionString = secrets.db + "/" + this.id;

		if ( this.hasSession() ) {

			MongoClient.connect( connectionString, function ( err, database ) {

				var factsCollection;

				if ( err ) {
					this.logger.error( "%s:\tCould not connect to MongoDB: %s", new Date(), err );
				}

				if ( database ) {

					factsCollection = database.collection( "facts" );
					factsCollection.findOne( {
						_id: this.id
					}, function ( err, userFacts ) {

						var numFacts, i, fact;
						var factObj, property;

						try {
							database.close();
						}
						catch ( e ) {
							this.logger.error( "Could not close database: %s", e );
						}

						if ( err || !userFacts ) {
							this.logger.error( "%s\tCould not load user facts: %s", new Date(), err );
						}
						else {
							numFacts = userFacts.facts ? userFacts.facts.length : 0;
							for ( i = 0; i < numFacts; i++ ) {
								fact = userFacts.facts[ i ];
								factObj = fact;
								if ( fact.type ) {
									if ( jaby.objects.hasOwnProperty( fact.type ) ) {
										factObj = new fact.type();
										for ( property in fact.fact ) {
											if ( fact.fact.hasOwnProperty( property ) ) {
												factObj[ property ] = fact.fact[ property ];
											}
										}
									}
								}
								this.session.assert( factObj );
							}
						}

					} );

				}

			} );

		}

	};

	module.exports = mongoose.model( "User", userSchema );

} ).call( this );
