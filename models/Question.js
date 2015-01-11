( function () {
	"use strict";

	var mongoose = require( "mongoose" );

	var questionSchema = new mongoose.Schema( {

		question: String,
		answers: Array

	} );

	module.exports = mongoose.model( "Question", questionSchema, "facts" );

} ).call( this );
