'use strict';

angular.module('resistanceDirectives', [])
    .directive("autofill", function () {
	    return {
	        require: "ngModel",
	        link: function (scope, element, attrs, ngModel) {
	            scope.$on("autofill:update", function() {
	                ngModel.$setViewValue(element.val());
	            });
	        }
	    }
	}).directive( 'goClick', function ( $location ) {
		return function ( scope, element, attrs ) {
	    	var path;

	    	attrs.$observe( 'goClick', function (val) {
				path = val;
	    	});

	    	element.bind( 'click', function () {
	      		scope.$apply( function () {
	      		  	$location.path( path );
	      		});
	    	});
	  	};
	});