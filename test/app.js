( function () {
	"use strict";

	/* global describe, it */

	var request = require( "supertest" );
	var app = require( "../server.js" );

	describe( "GET /login", function () {
		it( "should return 200 OK", function ( done ) {
			request( app )
				.get( "/login" )
				.expect( 200, done );
		} );
	} );

	describe( "GET /random-url", function () {
		it( "should return 404", function ( done ) {
			request( app )
				.get( "/random" )
				.expect( 404, done );
		} );
	} );

} ).call( this );