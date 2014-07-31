'use strict';

/* App Module */

var resistanceApp = angular.module('resistanceApp', [
    'ngRoute',
	'infinite-scroll', 
	'angularMoment', 
	'ui.bootstrap',
	'ngSanitize',
    'dialogs.main',
    'pascalprecht.translate',
	'ui.validate',
	'resistanceDirectives',
	'resistanceFactories',
    'resistanceControllers'
]);

resistanceApp.config(['$routeProvider',
    function ($routeProvider) {
        $routeProvider.
            when('/posts', {
                templateUrl: '/partials/posts.html',
                controller: 'PostCtrl'
            }).
            when('/login', {
                templateUrl: '/partials/login.html',
                controller: 'LoginCtrl'
            }).
            when('/signup', {
                templateUrl: '/partials/signup.html',
                controller: 'SignupCtrl'
            });
    }
]);

/* controllers */
var resistanceControllers = angular.module('resistanceControllers', []);
  
resistanceControllers.controller('MainCtrl', function ($scope, Page) {
      $scope.Page = Page;
	  $scope.Page.goToMain();
});

resistanceControllers.controller('LoginStatusCtrl', function ($scope, Login) {
      $scope.Login = Login;
});
  