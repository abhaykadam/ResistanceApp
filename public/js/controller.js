'use strict';

resistanceControllers.controller('PostCtrl', function($scope, $http, $filter, dialogs, Login, $location, Page) {
  Page.setPostsScope($scope);	
  $scope.posts = [];
  $scope.bookmark = undefined;
	
  $scope.getPosts = function () {
	  if($scope.posts.length > 0)
	  	$scope.last_post_id = $scope.posts[$scope.posts.length-1].id;
	  else
	  $scope.last_post_id = undefined;
	  
	  $http.post('/posts.json', {
		  'bookmark': angular.isDefined($scope.bookmark) ? true : undefined,
		  'last_post_id': angular.isDefined($scope.last_post_id) ? $scope.last_post_id : undefined
	  }).success(function(data) {
		  if(angular.isUndefined(data.posts))
		  	return;
		  
		  for (var i = 0; i < data.posts.length; i++) {
	          $scope.posts.push(
				  angular.extend({}, data.posts[i], {add_comment: false, comment_text: ''})
			  );
		  }
		  
		  if($scope.posts.length > 0)
		  	$scope.last_post_id = $scope.posts[$scope.posts.length-1].id;
	  });
  }
  
  $scope.showPublicMessages = function() {
	  $scope.posts = [];
	  $scope.bookmark = undefined;
	  $scope.getPosts();
	  $location.path('/posts');
  }
  
  $scope.showSavedMessages = function() {
	  $scope.posts = [];
	  $scope.bookmark = true;
	  $scope.getPosts();
  }
  
  $scope.approve = function(post_id) {
	  $http.post('/posts/' + post_id + '/approve.json', {})
	  .success(function(data){
	  	var post = $filter('filter')($scope.posts, {id: post_id}, true)[0];
		post.approved = data.count;
	  });
  };
  
  $scope.disapprove = function(post_id) {
	  $http.post('/posts/' + post_id + '/disapprove.json', {})
	  .success(function(data){
	  	var post = $filter('filter')($scope.posts, {id: post_id}, true)[0];
		post.disapproved = data.count;
	  });
  };
  
  $scope.showCommentBox = function (post_id) {
	  if(Login.getStatus() != true) {
		  dialogs.error('Error', 'Need to log in for posting comments');
		  return;
	  }
	  
	  $http.get('/get_loggedin_soldier.json')
	  .success(function(data){
		  $scope.soldier = data.soldier;
		  
		  var post = $filter('filter')($scope.posts, {id: post_id}, true)[0];
		  post.add_comment = true;
	  });
  }
  
  $scope.saveMessage = function (post_id) {
	if(Login.getStatus() != true) {
	  dialogs.error('Error', 'Need to log in for saving messages');
	  return;
	}

	var post = $filter('filter')($scope.posts, {id: post_id}, true)[0];  

	$http.post('/posts/' + post_id + '/bookmark.json', {})
		.success(function (response) {
			if (!response || response == "")
			    dialogs.error('Error', "Couldn't save message...");
			else if (response.status == "success") {
			    post.saved = true;
			} else
				dialogs.error('Error', response.status);
		})
		.error(function (data) {
			dialogs.error('Error', "Can't contact server...");
	});
  }
  
  $scope.addComment = function (post_id, _soldier_id) {
	var post = $filter('filter')($scope.posts, {id: post_id}, true)[0];  
	  
	$http.post('/posts/' + post_id + '/create_comment.json', {
	  message: post.comment_text,
	  soldier_id: _soldier_id
	})
	.success(function (response) {
	    if (!response || response == "")
	        dialogs.error('Error', "Couldn't post comment...");
	    else if (response.status == "success") {
	        post.comments.push({
				id: response.id,
				text: post.comment_text,
		  	  	created_on: Date.now(),
		  	  	soldier_id: _soldier_id,
		  	  	soldier_name: $scope.soldier.name});
	  	  	post.add_comment = false;
			post.comment_text = "";
		} else
	        dialogs.error('Error', response.status);
	})
	.error(function (data) {
	    dialogs.error('Error', "Can't contact server...");
	});
  }
  
  $scope.cancelComment = function (post_id) {
	  var post = $filter('filter')($scope.posts, {id: post_id}, true)[0];
	  post.add_comment = false;
	  
	  $scope.soldier = undefined;
  }
  
  $scope.broadcast = function() {
	  $scope.data = "";
	  var dlg = dialogs.create('/dialogs/custom.html','customDialogCtrl',$scope.data);
	        dlg.result.then(function(data){
	          $scope.data = data;
			  $scope.showPublicMessages();
	        });
  }
}).run(function($templateCache){
    $templateCache.put('/dialogs/custom.html','<div class="modal-header"><h4 class="modal-title">Broadcast Message</h4></div><div class="modal-body"><div><textarea class="form-control" rows=3 ng-model="message" maxlength="200"></textarea><span class="pull-right">Characters: {{message.length}}/200</span></div></div><div class="modal-footer"><button class="btn btn-primary" ng-click="done()">Done</button></div>');
  }); // end run;

resistanceControllers.controller('customDialogCtrl',function($log,$scope,$modalInstance,data, $http, dialogs, $location){
	$scope.message = "";
    
    //== Methods ==//
	$scope.postMessage = function(message) {
		$http.post('/posts/create.json', {
		  message: message
		})
		.success(function (response) {
		    if (!response || response == "")
		        dialogs.error('Error', "Couldn't broadcast message...");
		    else if (response.status == "success")
		        $location.path('/posts');
			else
		        dialogs.error('Error', response.status);
		})
		.error(function (data) {
		    dialogs.error('Error', "Can't contact server...");
		});
	};
	
    $scope.done = function(){
		$scope.postMessage(this.message);
		$modalInstance.close(this.message);
    }; // end done
  }) // end customDialogCtrl

resistanceControllers.controller('LoginCtrl', function($scope, $http, $location, $translate, dialogs, Login) {
    $scope.login = function login() {
		$scope.$broadcast("autofill:update");

        if ($scope.loginForm.$valid) {

            $http.post('/login.json', {
                'email': $scope.email,
                'password': $scope.password,
            })
			.success(function (response) {
			    if (!response || response == "")
			        dialogs.error('Error', 'Login failed...');
			    else if (response.status == "success") {
					Login.setStatus(true);
			        $location.path('/posts');
				} else if (response.status == "logged_in") {
					Login.setStatus(true);
					dialogs.notify('Notification', 'User already logged in');
					$location.path('/posts');
			    } else
			        dialogs.error('Error', response.status);
			})
        	.error(function (data) {
        	    dialogs.error('Error', "Can't contact server...");
        	});
        };
    };
	
	this.goLogin = function() {
		$location.path('/login');
	};
	
    this.logout = function logout() {

        $http.post('/logout.json', {})
		.success(function (response) {
		    if (response.status == "success") {
				Login.setStatus(false);
				dialogs.notify('Notify', 'Successfully logged out')
		    } else
		        dialogs.error('Error', "Can't logout...");
		})
    	.error(function (response) {
    	    dialogs.error('Error', "Can't logout...");
    	});
    };
});

resistanceControllers.controller('SignupCtrl', function($scope, $http, $location, $translate, dialogs) {
    $scope.signup = function () {

        if ($scope.signupForm.$valid) {

            $http.post('/signup.json', {
                'name': $scope.name,
				'email': $scope.email,
                'password': $scope.password,
				'rank': $scope.rank
            })
			.success(function (response) {
			    if (!response || response == "") {
			        dialogs.error('Error', 'Signing up failed...');
				} else if (response.status == "logged_in") {
			        dialogs.notify('Notify', 'You are already signed in');
					$location.path('/posts');
				} else if (response.status == "success") {
			        dialogs.notify('Notify', 'You are successfully signed up for the resistance');
					$location.path('/posts');
				} else {
			        dialogs.error('Error', response.status);
				}
			})
        	.error(function (data) {
        	    dialogs.error('Error', "Can't contact server...");
        	});
        };
    };
});
