( function () {
	"use strict";

	var nools = require( "nools" );
	var io = require( "socket.io" );

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
			var options = {
				name: this.id,
				define: {},
				scope: {
					logger: jaby.logger,
					user: this
				}
			};
			var property;

			for ( property in jaby.objects ) {
				if ( jaby.objects.hasOwnProperty( property ) ) {
					options.define[ property ] = jaby.objects[ property ];
				}
			}

			if ( !socketID || typeof socketID !== "string" ) {
				return;
			}

			if ( this.sockets.indexOf( socketID ) === -1 ) {
				this.sockets.push( socketID );

				try {

					flow = nools.compile( __dirname + "/rules/core.nools", options );

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

		this.sendMessage = function sendMessage( message ) {

			var i, socket;
			var numSockets = this.sockets.length;

			for ( i = 0; i < numSockets; i++ ) {
				socket = this.sockets[ i ];

				if ( io.sockets.connected[ socket ] ) {
					io.sockets.connected[ socket ].emit( "message", message );
				}
			}

		};

	};

	module.exports = User;

} ).call( this );
