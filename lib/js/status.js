/* jshint browser:true, devel:true */
( function () {
	"use strict";

	var io = require( "socket.io-client" );

	window.onload = function () {

		function onStatus( data ) {
			if ( data && data.message ) {
				jaby.lastStatus = Date.now();
				jaby.setStatus( data.message );
			}
		}

		var jaby = ( function () {

			var jabyOrb = {
				orb: document.getElementById( "orb" ),
				on: false,
				online: true,
				error: false,
				warning: false,
				lastStatus: null,
				waitStatus: 10 * 1000,
				waitStatusBeforeOffline: 30 * 1000,
				rotated_sphere: document.getElementById( "sphere_holes" ),
				rotateStep: 1,
				rotateDeg: 0,
				inner_core: document.getElementById( "inner_core" ),
				inner_power: document.getElementById( "inner_power" ),
				core_radius: 0,
				pulseMax: 15,
				pulseDirection: 1,
				pulse: 0,
				shadow: document.getElementById( "sphere_shadow" ),
				sphere: document.getElementById( "jaby_sphere" ),
				stops: document.getElementsByClassName( "core_color" )
			};

			jabyOrb.core_radius = parseInt( jabyOrb.inner_core.getAttribute( "r" ), 10 );

			jabyOrb.pulseCore = function pulseCore() {
				this.pulse = this.pulse + this.pulseDirection;
				this.inner_core.setAttribute( "r", this.core_radius + this.pulse );
				this.inner_power.setAttribute( "r", this.core_radius + this.pulse );

				if ( this.pulse >= this.pulseMax || this.pulse <= 0 ) {
					this.pulseDirection *= -1;
				}
			};

			jabyOrb.rotateSphere = function rotateSphere() {
				this.rotateDeg = ( this.rotateDeg + this.rotateStep ) % 360;
				this.rotated_sphere.setAttribute( "transform", "rotate( " + this.rotateDeg + ", 350, 350 )" );
			};

			jabyOrb.animate = function animate() {
				if ( this.on ) {
					this.pulseCore();
					this.rotateSphere();

					if ( this.raised < 1 ) {
						this.raised += 0.1;
						this.raiseOrb();
					}
				}
				else {
					if ( this.raised > 0 ) {
						this.raised -= 0.1;
						this.raiseOrb();
					}
				}
			};

			jabyOrb.raiseOrb = function raiseOrb() {
				var raiseBy, radiusRatio;

				if ( this.raised > 0.99 ) {
					this.raised = 1;
				}
				if ( this.raised < 0.01 ) {
					this.raised = 0;
				}

				raiseBy = this.raisedHeight - ( this.raised * this.raisedHeight );
				this.sphere.setAttribute( "transform", "translate( 0 " + raiseBy + " )" );

				radiusRatio = 1 + ( ( 1 - this.raised ) * 0.2 );
				this.shadow.setAttribute( "rx", radiusRatio * this.shadowRadiusX );
				this.shadow.setAttribute( "ry", radiusRatio * this.shadowRadiusY );

				if ( this.off && this.raised === 0 ) {
					this.turnOffAnimation();
				}
			};

			jabyOrb.turnOnAnimation = function turnOnAnimation() {
				var self = this;

				if ( !this.animationTimer ) {
					this.animationTimer = setInterval( function () {
						self.animate();
					}, 100 );
				}
			};

			jabyOrb.turnOffAnimation = function turnOffAnimation() {
				if ( this.animationTimer ) {
					clearInterval( this.animationTimer );
					delete( this.animationTimer );
				}
			};

			jabyOrb.turnOnPolling = function turnOnPolling() {
				var self = this;

				self.status();

				if ( !this.pollingTimer ) {
					this.pollingTimer = setInterval( function () {
						self.status();
					}, 10000 );
				}
			};

			jabyOrb.turnOffPolling = function turnOffPolling() {
				if ( this.pollingTimer ) {
					clearInterval( this.pollingTimer );
					delete( this.pollingTimer );
				}
			};

			jabyOrb.setCoreColor = function setCoreColor( color ) {
				var i;
				var numStops = this.stops.length;

				for ( i = 0; i < numStops; i++ ) {
					this.stops[ i ].setAttribute( "stop-color", color );
				}
			};

			jabyOrb.setPowerColor = function setInnerColor( color ) {
				this.inner_power.setAttribute( "fill", color );
			};

			jabyOrb.setOrbColor = function animate() {
				if ( this.on ) {
					this.setPowerColor( "#ff0" );

					if ( this.error ) {
						this.setCoreColor( "#900" );
					}
					else {
						if ( this.warning ) {
							this.setCoreColor( "#960" );
						}
						else {
							if ( this.notification ) {
								this.setCoreColor( "#009" );
							}
							else {
								if ( this.online ) {
									this.setCoreColor( "#090" );
								}
								else {
									this.setCoreColor( "#666" );
								}
							}
						}
					}
				}
				else {
					this.setPowerColor( "#fff" );
					this.setCoreColor( "#000" );
				}
			};

			jabyOrb.toggleOnOff = function toggleOnOff() {
				if ( this.on ) {
					this.turnOff();
				}
				else {
					this.turnOn();
				}
			};

			jabyOrb.turnOn = function turnOn() {
				this.on = true;

				this.setOrbColor();

				this.turnOnAnimation();
				this.turnOnPolling();
			};

			jabyOrb.turnOff = function turnOff() {
				this.on = false;

				this.setOrbColor();
			};

			jabyOrb.setOnline = function setOnline() {
				this.online = true;
				this.setOrbColor();
			};

			jabyOrb.clearOnline = function clearOnline() {
				this.online = false;
				this.setOrbColor();
			};

			jabyOrb.setOffline = function setOffline() {
				this.clearOnline();
			};

			jabyOrb.setError = function setError() {
				this.error = true;
				this.setOrbColor();
			};

			jabyOrb.clearError = function clearError() {
				this.error = false;
				this.setOrbColor();
			};

			jabyOrb.setWarning = function setWarning() {
				this.warning = true;
				this.setOrbColor();
			};

			jabyOrb.clearWarning = function clearWarning() {
				this.warning = false;
				this.setOrbColor();
			};

			jabyOrb.setNotification = function setNotification() {
				this.notification = true;
				this.setOrbColor();
			};

			jabyOrb.clearNotification = function clearNotification() {
				this.notification = false;
				this.setOrbColor();
			};

			jabyOrb.initialize = function initialize() {
				var height = parseFloat( this.orb.getAttribute( "height" ) );
				var sphereHeight = parseFloat( this.orb.getAttribute( "width" ) );

				this.shadowRadiusY = parseFloat( this.shadow.getAttribute( "ry" ) );
				this.shadowRadiusX = parseFloat( this.shadow.getAttribute( "rx" ) );

				this.raisedHeight = height - sphereHeight - this.shadowRadiusY;

				this.raised = 0;
				this.raiseOrb();

				this.online = false;
				this.error = false;
				this.warning = false;

				this.turnOff();
			};

			jabyOrb.status = function status() {
				if ( !this.lastStatus ) {
					this.lastStatus = Date.now();
				}

				if ( this.lastStatus ) {
					if ( Date.now() - this.lastStatus > this.waitStatusBeforeOffline ) {
						this.setOffline();
					}
				}

				socket.emit( "status", "status", onStatus );
			};

			jabyOrb.setStatus = function setStatus( status ) {
				switch ( status ) {
					case "online":
						this.setOnline();
						break;
					case "offline":
						this.setOffline();
						break;
					default:
						this.turnOff();
				}
			};

			return jabyOrb;
		}() );

		var socket = io();

		jaby.initialize();

		socket.on( "connect", function () {
			jaby.turnOn();
		} );
	};
} ).call( this );