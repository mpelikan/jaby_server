/* global describe, it */

( function () {
	"use strict";

	var chai = require( "chai" );
	var should = chai.should();

	var User = require( "../models/User" );

	describe( "User Model", function () {

		it( "should create a new user", function ( done ) {
			var user = new User( {
				email: "test@gmail.com",
				password: "password"
			} );

			user.save( function ( err ) {
				if ( err ) {
					return done( err );
				}
				done();
			} );
		} );

		it( "should not create a user with the unique email", function ( done ) {
			var user = new User( {
				email: "test@gmail.com",
				password: "password"
			} );

			user.save( function ( err ) {
				should.exist( err );
				err.should.have.property( "code" );
				if ( err ) {
					if ( err.hasOwnProperty( "code" ) ) {
						err.code.should.equal( 11000 );
					}
				}
				done();
			} );
		} );

		it( "should find user by email", function ( done ) {
			User.findOne( {
				email: "test@gmail.com"
			}, function ( err, user ) {
				should.not.exist( err );
				if ( err ) {
					return done( err );
				}
				should.exist( user );
				user.should.have.property( "email" );
				user.email.should.equal( "test@gmail.com" );
				done();
			} );
		} );

		it( "should delete a user", function ( done ) {
			User.remove( {
				email: "test@gmail.com"
			}, function ( err ) {
				should.not.exist( err );
				if ( err ) {
					return done( err );
				}
				done();
			} );
		} );

	} );

} ).call( this );