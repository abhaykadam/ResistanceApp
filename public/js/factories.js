'use strict';

angular.module('resistanceFactories', [])
	.factory('Page', function ($location) {
		var first = 'true';
		return {
			goToMain: function() {
				if(first) {
					$location.path('/posts');
					first = false;
				}
			}
		};
	}).factory('Login', function ($location, $http) {
		var status = false;
		var checked = false;
		return {
			getStatus: function() {
			  if(checked == true) {
			  	return status;
			  } else {
				  checked = true;
			  	  $http.get('/get_loggedin_soldier.json')
			  	  .success(function(data){
					  status = data.soldier != {} ? true : false;
			  		  return status;
			  	  })
				  .error(function(data){
					  status = false;
					  return status;
				  });
		  	  }
			},
			setStatus: function(_status) {
				status = _status;
			}
		};
	});;