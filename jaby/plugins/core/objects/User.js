( function () {
	"use strict";

	var nools = require( "nools" );
	var path = require( "path" );

	var User = function ( id ) {

		this.id = id;
		this.name = null;
		this.session = null;
		this.sockets = [];

		this.getDisplayName = function getDisplayName() {
			return this.name || this.id;
		};

		this.isActive = function isActive() {
			return this.hasSockets() || this.hasSession();
		};

		this.hasSession = function hasSession() {
			return this.session !== null;
		};

		this.hasSockets = function hasSockets() {
			return this.sockets.length > 0;
		};

		this.addSocket = function addSocket( socketID, jaby ) {

			var flow;
			var options;
			var property;

			if ( !socketID || typeof socketID !== "string" ) {
				return;
			}

			if ( !this.io ) {
				this.io = jaby.io;
			}

			if ( this.sockets.indexOf( socketID ) === -1 ) {
				this.sockets.push( socketID );

				options = {
					name: this.id,
					define: {},
					scope: {
						logger: jaby.logger,
						user: this
					}
				};

				for ( property in jaby.objects ) {
					if ( jaby.objects.hasOwnProperty( property ) ) {
						options.define[ property ] = jaby.objects[ property ];
					}
				}

				try {

					flow = nools.compile( path.resolve( __dirname, "../rules/core.nools" ), options );

				}
				catch ( e ) {
					console.error( "Couldn't compile rules for user: %s", e );
				}

				try {

					if ( flow ) {
						this.session = flow.getSession();
					}

				}
				catch ( e ) {
					console.error( "Couldn't get session for user: %s", e );
				}

				if ( this.session ) {

					try {

						this.session.assert( new jaby.objects.Flags() );
						this.session.match( function ( err ) {
							if ( err ) {
								console.error( "Could not match rules: %s", err );
							}
						} );

					}
					catch ( e ) {
						console.error( "Couldn't add user to rules: %s", e );
					}

				}
				else {
					console.error( "No session for user." );
				}

			}

		};

		this.removeSocket = function removeSocket( socketID ) {

			var index;

			if ( !socketID || typeof socketID !== "string" ) {
				return;
			}

			index = this.sockets.indexOf( socketID );
			if ( index > -1 ) {
				this.sockets.splice( index, 1 );
			}

			if ( !this.hasSockets() ) {

				try {
					nools.deleteFlow( this.id );
				}
				catch ( e ) {
					console.error( "Couldn't delete flow for user: %s", e );
				}

				this.session = null;

			}

		};

		this.sendMessage = function sendMessage( message, type ) {

			var numSockets = this.sockets.length;
			var i, socketID;

			type = type || "message";

			for ( i = 0; i < numSockets; i++ ) {
				socketID = this.sockets[ i ];

				if ( this.io.sockets.connected[ socketID ] ) {
					try {
						this.io.sockets.connected[ socketID ].emit( type, message );
					}
					catch ( e ) {
						console.error( "Could not send message (%s): %s", type, e );
					}
				}
			}

		};

	};

	module.exports = User;

} ).call( this );
