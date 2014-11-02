( function() {
	"use strict";

	var express = require( "express" );
	var app = express();
	var server = require( "http" ).createServer( app );
	var io = require( "socket.io" )( server );
	var port = process.env.PORT || 3000;

	server.listen( port, function () {
		console.log( "Jaby listening on port %d", port );
	} );

	app.use( express.static( __dirname + "/public" ) );

	io.on( "connection", function ( socket ) {

		socket.on( "message", function ( data, callback ) {
			var response = {
				message: "Got the message: " + data.message
			};

			callback( response );
		} );

	} );

	module.exports = app;

} ).call( this );