( function () {
	"use strict";

	var mongoose = require( "mongoose" );

	var questionSchema = new mongoose.Schema( {

		question: String,
		answers: Array,
		asked: {
			type: Boolean,
			default: false
		},
		answer: String

	} );

	questionSchema.set( "toJSON", {
		virtuals: true
	} );

	module.exports = mongoose.model( "Question", questionSchema, "facts" );

} ).call( this );
