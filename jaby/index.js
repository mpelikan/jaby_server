( function () {
	"use strict";

	var jaby = {};

	jaby.registerSocket = function registerSocket( io, socket ) {
		if ( !io || !socket ) {
			return;
		}

		console.log( "Socket connected: %s", socket.handshake.address );

		// io.set( "authorization", function ( handshakeData, callback ) {
		// 	if ( handshakeData.xdomain ) {
		// 		callback( "Cross-domain connections are not allowed" );
		// 	}
		// 	else {
		// 		callback( null, true );
		// 	}
		// } );

		socket.on( "start", function () {
			var response = {
				message: "Welcome " + ( socket.request.user.logged_in ? socket.request.user.profile.name : "" )
			};

			console.log( "Start %s: %s", socket.handshake.address, socket.request.user.profile.name );

			io.sockets.emit( "reply", response );
		} );

		socket.on( "message", function ( data ) {
			var response = {
				message: "Got the message: " + data.message
			};

			console.log( "From %s: %s", socket.handshake.address, data.message );

			io.sockets.emit( "reply", response );
		} );

		socket.on( "disconnect", function () {
			console.log( "Socket disconnected: %s", socket.handshake.address );
		} );

		socket.on( "status", function ( data, callback ) {
			var response = {
				message: "online"
			};

			callback( response );
		} );
	};

	module.exports = jaby;

} ).call( this );