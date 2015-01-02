/* jshint browser:true, devel:true */
( function ( window, document, exportName ) {
	"use strict";

	var communiqué = ( function () {
		var MESSAGES_SELECTOR = ".communiqué .messages > section";

		//	Configurations defaults, can be overridden at initialization time
		var config = {

			width: "100%",
			height: "100%",

			//	Factor of the display size that should remain empty around the content
			margin: 0.1,

			//	Bounds for smallest/largest possible scale to apply to content
			minScale: 0.2,
			maxScale: 1.0,

			//	Enable keyboard shortcuts for navigation
			keyboard: true,

			//	Enables touch navigation on devices with touch input
			touch: true,

			//	Enable message navigation via mouse wheel
			mouseWheel: false,

			//	Hides the address bar on mobile devices
			hideAddressBar: true,

			//	Focuses body when page changes visibility to ensure keyboard shortcuts work
			focusBodyOnPageVisiblityChange: true

		};

		//	Flags if communiqué.js is loaded (has dispatched the "ready" event)
		var loaded = false;

		//	The currently active message
		var index;

		var currentMessage;

		//	Messages may hold a data-state attribute which we pick up and apply as a class to the body.
		//	This list contains the combined state of all current messages.
		var state = [];

		//	The current scale of the messages (see width/height config)
		var scale = 1;

		//	Cached references to DOM elements
		var dom = {};

		//	Features supported by the browser, see #checkCapabilities()
		var features = {};

		//	Client is a mobile device, see #checkCapabilities()
		var isMobileDevice;

		//	Throttles mouse wheel navigation
		var lastMouseWheelStep = 0;

		//	Flags if the interaction event listeners are bound
		var eventsAreBound = false;

		//	Holds information about the currently ongoing touch input
		var touch = {
			startX: 0,
			startY: 0,
			startSpan: 0,
			startCount: 0,
			captured: false,
			threshold: 40
		};

		/**
		 * Starts up the message-queue if the client is capable.
		 */
		function initialize( options ) {

			checkCapabilities();

			if ( !features.transforms2d && !features.transforms3d ) {
				document.body.setAttribute( "class", "no-transforms" );

				//	If the browser doesn't support core features we won't be using JavaScript to control the message-queue.
				//	However, this is the least of our worries, if that is the case.
				return;
			}

			//	Force a layout when the whole page, incl fonts, has loaded
			window.addEventListener( "load", layout, false );

			//	Copy options over to our config object
			extend( config, options );

			//	Hide the address bar in mobile browsers
			hideAddressBar();

			start();

		}

		/**
		 * Inspect the client to see what it's capable of, this should only happens once per runtime.
		 */
		function checkCapabilities() {

			features.transforms3d = "WebkitPerspective" in document.body.style ||
				"MozPerspective" in document.body.style ||
				"msPerspective" in document.body.style ||
				"OPerspective" in document.body.style ||
				"perspective" in document.body.style;

			features.transforms2d = "WebkitTransform" in document.body.style ||
				"MozTransform" in document.body.style ||
				"msTransform" in document.body.style ||
				"OTransform" in document.body.style ||
				"transform" in document.body.style;

			features.requestAnimationFrameMethod = window.requestAnimationFrame || window.webkitRequestAnimationFrame || window.mozRequestAnimationFrame;
			features.requestAnimationFrame = typeof features.requestAnimationFrameMethod === "function";

			features.canvas = !!document.createElement( "canvas" ).getContext;

			isMobileDevice = navigator.userAgent.match( /(iphone|ipod|android)/gi );

		}

		/**
		 * Starts up communiqué.js by binding input events and navigating to first message.
		 */
		function start() {

			//	Make sure we've got all the DOM elements we need
			setupDOM();

			//	Updates the message-queue to match the current configuration values
			configure();

			message();

			//	Notify listeners that the message-queue is ready but use a 1ms
			//	timeout to ensure it's not fired synchronously after #initialize()
			setTimeout( function () {
				//	Enable transitions now that we're loaded
				dom.messages.classList.remove( "no-transition" );

				loaded = true;

				dispatchEvent( "ready", {
					"currentMessage": currentMessage
				} );
			}, 1 );

		}

		/**
		 * Finds and stores references to DOM elements which are required by the message-queue.
		 * If a required element is not found, it is created.
		 */
		function setupDOM() {

			//	Cache references to key DOM elements
			dom.theme = document.querySelector( "#theme" );
			dom.wrapper = document.querySelector( ".communiqué" );
			dom.messages = document.querySelector( ".communiqué .messages" );

			//	Prevent transitions while we're loading
			dom.messages.classList.add( "no-transition" );

		}

		/**
		 * Applies the configuration settings from the config object.
		 * May be called multiple times.
		 */
		function configure( options ) {

			dom.wrapper.classList.remove( "default" );

			//	New config options may be passed when this method is invoked through the API after initialization
			if ( typeof options === "object" ) {
				extend( config, options );
			}

			dom.wrapper.classList.add( "default" );

			dom.wrapper.setAttribute( "data-transition-speed", "default" );

			dom.wrapper.classList.add( "center" );

			if ( config.mouseWheel ) {
				document.addEventListener( "DOMMouseScroll", onDocumentMouseScroll, false ); //	FF
				document.addEventListener( "mousewheel", onDocumentMouseScroll, false );
			}
			else {
				document.removeEventListener( "DOMMouseScroll", onDocumentMouseScroll, false ); //	FF
				document.removeEventListener( "mousewheel", onDocumentMouseScroll, false );
			}

			sync();

		}

		function addEventListeners() {

			eventsAreBound = true;

			window.addEventListener( "resize", onWindowResize, false );

			if ( config.touch ) {
				dom.wrapper.addEventListener( "touchstart", onTouchStart, false );
				dom.wrapper.addEventListener( "touchmove", onTouchMove, false );
				dom.wrapper.addEventListener( "touchend", onTouchEnd, false );

				//	Support pointer-style touch interaction as well
				if ( window.navigator.msPointerEnabled ) {
					dom.wrapper.addEventListener( "MSPointerDown", onPointerDown, false );
					dom.wrapper.addEventListener( "MSPointerMove", onPointerMove, false );
					dom.wrapper.addEventListener( "MSPointerUp", onPointerUp, false );
				}
			}

			if ( config.keyboard ) {
				document.addEventListener( "keydown", onDocumentKeyDown, false );
			}

			if ( config.focusBodyOnPageVisiblityChange ) {
				var visibilityChange;

				if ( "hidden" in document ) {
					visibilityChange = "visibilitychange";
				}
				else {
					if ( "msHidden" in document ) {
						visibilityChange = "msvisibilitychange";
					}
					else {
						if ( "webkitHidden" in document ) {
							visibilityChange = "webkitvisibilitychange";
						}
					}
				}

				if ( visibilityChange ) {
					document.addEventListener( visibilityChange, onPageVisibilityChange, false );
				}
			}

		}

		function removeEventListeners() {

			eventsAreBound = false;

			document.removeEventListener( "keydown", onDocumentKeyDown, false );
			window.removeEventListener( "resize", onWindowResize, false );

			dom.wrapper.removeEventListener( "touchstart", onTouchStart, false );
			dom.wrapper.removeEventListener( "touchmove", onTouchMove, false );
			dom.wrapper.removeEventListener( "touchend", onTouchEnd, false );

			if ( window.navigator.msPointerEnabled ) {
				dom.wrapper.removeEventListener( "MSPointerDown", onPointerDown, false );
				dom.wrapper.removeEventListener( "MSPointerMove", onPointerMove, false );
				dom.wrapper.removeEventListener( "MSPointerUp", onPointerUp, false );
			}

		}

		/**
		 * Extend object a with the properties of object b.
		 * If there's a conflict, object b takes precedence.
		 * Performs a recursive replacement of values; rather than a object replacement.
		 */
		function extend( a, b ) {

			var property;

			for ( property in b ) {
				if ( b.hasOwnProperty( property ) ) {
					try {
						//	Property in destination object set; update its value.
						if ( b[ property ].constructor === Object ) {
							a[ property ] = extend( a[ property ], b[ property ] );
						}
						else {
							a[ property ] = b[ property ];
						}

					}
					catch ( e ) {
						//	Property in destination object not set; create it and set its value.
						a[ property ] = b[ property ];
					}
				}
			}

			return a;

		}

		/**
		 * Converts the target object to an array.
		 */
		function toArray( o ) {

			return Array.prototype.slice.call( o );

		}

		/**
		 * Measures the distance in pixels between point a and point b.
		 *
		 * @param {Object} a point with x/y properties
		 * @param {Object} b point with x/y properties
		 */
		function distanceBetween( a, b ) {

			var dx = a.x - b.x;
			var dy = a.y - b.y;

			return Math.sqrt( ( dx * dx ) + ( dy * dy ) );

		}

		/**
		 * Applies a CSS transform to the target element.
		 */
		function transformElement( element, transform ) {

			element.style.WebkitTransform = transform;
			element.style.MozTransform = transform;
			element.style.msTransform = transform;
			element.style.OTransform = transform;
			element.style.transform = transform;

		}

		/**
		 * Retrieves the height of the given element by looking at the position and height of its immediate children.
		 */
		function getAbsoluteHeight( element ) {

			var height = 0;
			var absoluteChildren = 0;

			if ( element ) {

				toArray( element.childNodes ).forEach( function ( child ) {

					if ( typeof child.offsetTop === "number" && child.style ) {

						//	Count # of abs children
						if ( child.style.position === "absolute" ) {
							absoluteChildren += 1;
						}

						height = Math.max( height, child.offsetTop + child.offsetHeight );

					}

				} );

				//	If there are no absolute children, use offsetHeight
				if ( absoluteChildren === 0 ) {

					height = element.offsetHeight;

				}

			}

			return height;

		}

		/**
		 * Returns the remaining height within the parent of the target element
		 * after subtracting the height of all siblings.
		 *
		 * remaining height = [parent height] - [ siblings height]
		 */
		function getRemainingHeight( element, height ) {

			var parent, siblings;
			var elementStyles;
			var styles;
			var marginTop, marginBottom;

			height = height || 0;

			if ( element ) {

				parent = element.parentNode;
				siblings = parent.childNodes;

				//	Subtract the height of each sibling
				toArray( siblings ).forEach( function ( sibling ) {

					if ( typeof sibling.offsetHeight === "number" && sibling !== element ) {

						styles = window.getComputedStyle( sibling );
						marginTop = parseInt( styles.marginTop, 10 );
						marginBottom = parseInt( styles.marginBottom, 10 );

						height -= sibling.offsetHeight + marginTop + marginBottom;

					}

				} );

				elementStyles = window.getComputedStyle( element );

				//	Subtract the margins of the target element
				height -= parseInt( elementStyles.marginTop, 10 ) + parseInt( elementStyles.marginBottom, 10 );

			}

			return height;

		}

		/**
		 * Hides the address bar if we're on a mobile device.
		 */
		function hideAddressBar() {

			if ( config.hideAddressBar && isMobileDevice ) {

				//	Events that should trigger the address bar to hide
				window.addEventListener( "load", removeAddressBar, false );
				window.addEventListener( "orientationchange", removeAddressBar, false );

			}

		}

		/**
		 * Causes the address bar to hide on mobile devices, more vertical space ftw.
		 */
		function removeAddressBar() {

			setTimeout( function () {
				window.scrollTo( 0, 1 );
			}, 10 );

		}

		/**
		 * Dispatches an event of the specified type from the communiqué DOM element.
		 */
		function dispatchEvent( type, properties ) {

			var event = document.createEvent( "HTMLEvents", 1, 2 );

			event.initEvent( type, true, true );
			extend( event, properties );
			dom.wrapper.dispatchEvent( event );

		}

		/**
		 * Applies JavaScript-controlled layout rules to the message-queue.
		 */
		function layout() {

			if ( dom.wrapper ) {

				var messages, message;
				var i, len;

				//	Dimensions of the content
				var messageWidth = config.width;
				var messageHeight = config.height;
				var messagePadding = 20; //	TODO Dig this out of DOM

				//	Available space to scale within
				var availableWidth = dom.wrapper.offsetWidth;
				var availableHeight = dom.wrapper.offsetHeight;

				//	Reduce available space by margin
				availableWidth -= ( availableHeight * config.margin );
				availableHeight -= ( availableHeight * config.margin );

				//	Layout the contents of the messages
				layoutMessageContents( config.width, config.height, messagePadding );

				//	Message width may be a percentage of available width
				if ( typeof messageWidth === "string" && /%$/.test( messageWidth ) ) {
					messageWidth = parseInt( messageWidth, 10 ) / 100 * availableWidth;
				}

				//	Message height may be a percentage of available height
				if ( typeof messageHeight === "string" && /%$/.test( messageHeight ) ) {
					messageHeight = parseInt( messageHeight, 10 ) / 100 * availableHeight;
				}

				dom.messages.style.width = messageWidth + "px";
				dom.messages.style.height = messageHeight + "px";

				//	Determine scale of content to fit within available space
				scale = Math.min( availableWidth / messageWidth, availableHeight / messageHeight );

				//	Respect max/min scale settings
				scale = Math.max( scale, config.minScale );
				scale = Math.min( scale, config.maxScale );

				//	Prefer applying scale via zoom since Chrome blurs scaled content with nested transforms
				if ( typeof dom.messages.style.zoom !== "undefined" && !navigator.userAgent.match( /(iphone|ipod|ipad|android)/gi ) ) {
					dom.messages.style.zoom = scale;
				}
				//	Apply scale transform as a fallback
				else {
					transformElement( dom.messages, "translate(-50%, -50%) scale(" + scale + ") translate(50%, 50%)" );
				}

				//	Select all messages
				messages = toArray( document.querySelectorAll( MESSAGES_SELECTOR ) );
				len = messages.length;

				for ( i = 0; i < len; i++ ) {
					message = messages[ i ];

					//	Don't bother updating invisible messages
					if ( message.style.display === "none" ) {
						continue;
					}

					message.style.top = Math.max( -( getAbsoluteHeight( message ) / 2 ) - messagePadding, -messageHeight / 2 ) + "px";

				}

			}

		}

		/**
		 * Applies layout logic to the contents of all messages in the message-queue.
		 */
		function layoutMessageContents( width, height, padding ) {

			var remainingHeight;
			var nw, nh;
			var es;

			//	Handle sizing of elements with the "stretch" class
			toArray( dom.messages.querySelectorAll( "section > .stretch" ) ).forEach( function ( element ) {

				//	Determine how much vertical space we can use
				remainingHeight = getRemainingHeight( element, ( height - ( padding * 2 ) ) );

				//	Consider the aspect ratio of media elements
				if ( /(img|video)/gi.test( element.nodeName ) ) {
					nw = element.naturalWidth || element.videoWidth;
					nh = element.naturalHeight || element.videoHeight;
					es = Math.min( width / nw, remainingHeight / nh );

					element.style.width = ( nw * es ) + "px";
					element.style.height = ( nh * es ) + "px";

				}
				else {
					element.style.width = width + "px";
					element.style.height = remainingHeight + "px";
				}

			} );

		}

		function message() {

			var i = 0;
			var j, len, k;
			var messageChanged;

			//	Query all messages in the deck
			var messages = document.querySelectorAll( MESSAGES_SELECTOR );

			//	Remember the state before this message
			var stateBefore = state.concat();

			//	Remember where we were at before
			var previousMessage = currentMessage;

			var indexBefore = index || 0;

			//	Reset the state array
			state.length = 0;

			//	Activate and transition to the new message
			index = updateMessages( MESSAGES_SELECTOR, i === undefined ? index : i );

			layout();

			//	Apply the new state
			stateLoop:
				for ( j = 0, len = state.length; j < len; j++ ) {
					//	Check if this state existed on the previous message.
					//	If it did, we will avoid adding it repeatedly
					for ( k = 0; k < stateBefore.length; k++ ) {
						if ( stateBefore[ k ] === state[ j ] ) {
							stateBefore.splice( k, 1 );
							continue stateLoop;
						}
					}

					document.documentElement.classList.add( state[ j ] );

					//	Dispatch custom event matching the state's name
					dispatchEvent( state[ j ] );
				}

			//	Clean up the remains of the previous state
			while ( stateBefore.length ) {
				document.documentElement.classList.remove( stateBefore.pop() );
			}

			//	Store references to the previous and current messages
			currentMessage = messages[ index ];

			//	Dispatch an event if the message changed
			messageChanged = ( index !== indexBefore );
			if ( messageChanged ) {
				dispatchEvent( "messagechanged", {
					"index": index,
					"previousMessage": previousMessage,
					"currentMessage": currentMessage
				} );
			}
			else {
				//	Ensure that the previous message is never the same as the current
				previousMessage = null;
			}

		}

		/**
		 * Syncs the message-queue with the current DOM. Useful when new messages or control elements are added or when
		 * the configuration has changed.
		 */
		function sync() {

			//	Subscribe to input
			removeEventListeners();
			addEventListeners();

			//	Force a layout to make sure the current config is accounted for
			layout();

			message();
		}

		/**
		 * Updates one dimension of messages by showing the message with the specified index.
		 *
		 * @param {String} selector A CSS selector that will fetch
		 * the group of messages we are working with
		 * @param {Number} index The index of the message that should be
		 * shown
		 *
		 * @return {Number} The index of the message that is now shown,
		 * might differ from the passed in index if it was out of bounds.
		 */
		function updateMessages( selector, index ) {

			var i;
			var element;
			var futureFragments, futureFragment;
			var messageState;

			//	Select all messages and convert the NodeList result to an array
			var messages = toArray( document.querySelectorAll( selector ) );
			var messagesLength = messages.length;

			if ( messagesLength ) {

				//	Enforce max and minimum index bounds
				index = Math.max( Math.min( index, messagesLength - 1 ), 0 );

				for ( i = 0; i < messagesLength; i++ ) {
					element = messages[ i ];

					element.classList.remove( "past" );
					element.classList.remove( "present" );
					element.classList.remove( "future" );

					//	http://www.w3.org/html/wg/drafts/html/master/editing.html#the-hidden-attribute
					element.setAttribute( "hidden", "" );

					if ( i < index ) {
						//	Any element previous to index is given the "past" class
						element.classList.add( "past" );
					}
					else {
						if ( i > index ) {
							//	Any element subsequent to index is given the "future" class
							element.classList.add( "future" );

							futureFragments = toArray( element.querySelectorAll( ".fragment.visible" ) );

							//	No fragments in future messages should be visible ahead of time
							while ( futureFragments.length ) {
								futureFragment = futureFragments.pop();
								futureFragment.classList.remove( "visible" );
								futureFragment.classList.remove( "current-fragment" );
							}
						}
					}

				}

				//	Mark the current message as present
				messages[ index ].classList.add( "present" );
				messages[ index ].removeAttribute( "hidden" );

				//	If this message has a state associated with it, add it onto the current state of the deck
				messageState = messages[ index ].getAttribute( "data-state" );
				if ( messageState ) {
					state = state.concat( messageState.split( " " ) );
				}

			}
			else {
				//	Since there are no messages we can't be anywhere beyond the zeroth index
				index = 0;
			}

			return index;

		}

		function getIndex() {

			return index;

		}

		function pop() {

			removeMessage();

		}

		function onUserInput( /* event */) {}

		function onDocumentKeyDown( event ) {

			var triggered = false;
			var activeElement;
			var hasFocus;
			var key;
			var value;

			onUserInput( event );

			//	Check if there's a focused element that could be using the keyboard
			activeElement = document.activeElement;
			hasFocus = !!( activeElement && ( activeElement.type || activeElement.href || activeElement.contentEditable !== "inherit" ) );

			//	Disregard the event if there's a focused element or a keyboard modifier key is present
			if ( hasFocus || ( event.shiftKey || event.altKey || event.ctrlKey || event.metaKey ) ) {
				return;
			}

			//	User defined key bindings
			if ( typeof config.keyboard === "object" ) {

				for ( key in config.keyboard ) {

					//	Check if this binding matches the pressed key
					if ( parseInt( key, 10 ) === event.keyCode ) {

						value = config.keyboard[ key ];

						//	Callback function
						if ( typeof value === "function" ) {
							value.apply( null, [ event ] );
						}
						else {
							//	String shortcuts to communiqué.js API
							if ( typeof value === "string" && typeof communiqué[ value ] === "function" ) {
								communiqué[ value ].call();
							}
						}

						triggered = true;

					}

				}

			}

			//	If the input resulted in a triggered action we should prevent the browsers default behavior
			if ( triggered ) {
				event.preventDefault();
			}
			else {
				//	ESC or O key
				if ( ( event.keyCode === 27 || event.keyCode === 79 ) && features.transforms3d ) {
					event.preventDefault();
				}
			}

		}

		function onTouchStart( event ) {

			touch.startX = event.touches[ 0 ].clientX;
			touch.startY = event.touches[ 0 ].clientY;
			touch.startCount = event.touches.length;

			//	If there's two touches we need to memorize the distance
			//	between those two points to detect pinching
			if ( event.touches.length === 2 && config.overview ) {
				touch.startSpan = distanceBetween( {
					x: event.touches[ 1 ].clientX,
					y: event.touches[ 1 ].clientY
				}, {
					x: touch.startX,
					y: touch.startY
				} );
			}

		}

		function onTouchMove( event ) {

			var currentX, currentY;
			var currentSpan;
			var deltaX, deltaY;

			//	Each touch should only trigger one action
			if ( !touch.captured ) {
				onUserInput( event );

				currentX = event.touches[ 0 ].clientX;
				currentY = event.touches[ 0 ].clientY;

				//	If the touch started with two points and still has
				//	two active touches; test for the pinch gesture
				if ( event.touches.length === 2 && touch.startCount === 2 && config.overview ) {

					//	The current distance in pixels between the two touch points
					currentSpan = distanceBetween( {
						x: event.touches[ 1 ].clientX,
						y: event.touches[ 1 ].clientY
					}, {
						x: touch.startX,
						y: touch.startY
					} );

					//	If the span is larger than the desire amount we've got ourselves a pinch
					if ( Math.abs( touch.startSpan - currentSpan ) > touch.threshold ) {
						touch.captured = true;
					}

					event.preventDefault();

				}
				else {
					//	There was only one touch point, look for a swipe
					if ( event.touches.length === 1 && touch.startCount !== 2 ) {

						deltaX = currentX - touch.startX;
						deltaY = currentY - touch.startY;

						if ( deltaX > touch.threshold && Math.abs( deltaX ) > Math.abs( deltaY ) ) {
							touch.captured = true;
							// navigateLeft();
						}
						else {
							if ( deltaX < -touch.threshold && Math.abs( deltaX ) > Math.abs( deltaY ) ) {
								touch.captured = true;
								// navigateRight();
							}
							else {
								if ( deltaY > touch.threshold ) {
									touch.captured = true;
									//	navigateUp();
								}
								else {
									if ( deltaY < -touch.threshold ) {
										touch.captured = true;
										//	navigateDown();
									}
								}
							}
						}

						//	Block them all to avoid needless tossing around of the viewport in iOS
						event.preventDefault();
					}
				}
			}
			else {
				//	There's a bug with swiping on some Android devices unless the default action is always prevented
				if ( navigator.userAgent.match( /android/gi ) ) {
					event.preventDefault();
				}
			}

		}

		function onTouchEnd( /* event */) {

			touch.captured = false;

		}

		function onPointerDown( event ) {

			if ( event.pointerType === event.MSPOINTER_TYPE_TOUCH ) {
				event.touches = [ {
					clientX: event.clientX,
					clientY: event.clientY
				} ];
				onTouchStart( event );
			}

		}

		function onPointerMove( event ) {

			if ( event.pointerType === event.MSPOINTER_TYPE_TOUCH ) {
				event.touches = [ {
					clientX: event.clientX,
					clientY: event.clientY
				} ];
				onTouchMove( event );
			}

		}

		function onPointerUp( event ) {

			if ( event.pointerType === event.MSPOINTER_TYPE_TOUCH ) {
				event.touches = [ {
					clientX: event.clientX,
					clientY: event.clientY
				} ];
				onTouchEnd( event );
			}

		}

		function onDocumentMouseScroll( event ) {

			if ( Date.now() - lastMouseWheelStep > 600 ) {

				lastMouseWheelStep = Date.now();

				var delta = event.detail || -event.wheelDelta;
				if ( delta > 0 ) {
					// navigateNext();
				}
				else {
					// navigatePrev();
				}
				pop();

			}

		}

		function onWindowResize( /* event */) {

			layout();

		}

		function onPageVisibilityChange( /* event */) {

			var isHidden = document.webkitHidden || document.msHidden || document.hidden;

			//	If, after clicking a link or similar and we're coming back,
			//	focus the document.body to ensure we can use keyboard shortcuts
			if ( isHidden === false && document.activeElement !== document.body ) {
				document.activeElement.blur();
				document.body.focus();
			}

		}

		function addMessage( content, id, index ) {

			var newMessage = document.createElement( "section" );

			newMessage.classList.add( "future" );

			if ( id ) {
				newMessage.setAttribute( "id", id );
			}

			content = content || "";

			dom.messages = document.querySelector( ".communiqué .messages" );

			if ( !index ) {
				dom.messages.appendChild( newMessage );
			}
			else {
				dom.messages.insertBefore( newMessage, dom.messages.querySelectorAll( "section:nth-child(" + ( getIndex() + 1 ) + ")" )[ 0 ] );
			}

			if ( typeof content === "object" && content instanceof HTMLElement ) {
				newMessage.appendChild( content );
			}
			else {
				newMessage.innerHTML = content;
			}

			sync();

		}

		function removeMessage( id ) {

			var selector, element;

			dom.wrapper = document.querySelector( ".communiqué" );
			dom.messages = document.querySelector( ".communiqué > .messages" );

			if ( id !== null && id !== undefined ) {
				selector = ".messages > #" + id;
			}
			else {
				selector = ".messages > section:first-child";
			}

			element = dom.wrapper.querySelectorAll( selector )[ 0 ];
			if ( element ) {
				dom.messages.removeChild( element );
			}

			sync();

		}

		function isReady() {

			return loaded;

		}

		function addEventListener( type, listener, useCapture ) {

			if ( "addEventListener" in window ) {
				( dom.wrapper || document.querySelector( ".communiqué" ) ).addEventListener( type, listener, useCapture );
			}

		}

		function removeEventListener( type, listener, useCapture ) {

			if ( "addEventListener" in window ) {
				( dom.wrapper || document.querySelector( ".communiqué" ) ).removeEventListener( type, listener, useCapture );
			}

		}

		return {
			initialize: initialize,
			configure: configure,

			pop: pop,

			//	Adds or removes all internal event listeners (such as keyboard)
			addEventListeners: addEventListeners,
			removeEventListeners: removeEventListeners,

			add: addMessage,
			remove: removeMessage,

			isReady: isReady,

			addEventListener: addEventListener,
			removeEventListener: removeEventListener
		};
	} )();

	if ( typeof module !== "undefined" && module.exports ) {
		module.exports = communiqué;
	}
	if ( window ) {
		window[ exportName ] = communiqué;
	}

} )( window, document, "communiqué" );
