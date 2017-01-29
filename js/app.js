'use strict';

angular.module('agilePollApp', ['ngRoute','firebase','ngMaterial'])

.config(['$routeProvider', function($routeProvider,$rootScope) {
  $routeProvider
  	.when('/vote', {
	    templateUrl: 'poll_view.html',
	    controller: 'pollCtrl'
	})
  	.when('/admin', {
	    templateUrl: 'admin_view.html',
	    controller: 'adminCtrl'
  	})
  	.when('/index', {
	    templateUrl: 'index_view.html',
	    controller: 'indexCtrl'
  	})
  	.otherwise({redirectTo: '/index'});
}])

.controller('indexCtrl', function($scope){
	
})

.controller('pollCtrl', function(DieALog,$scope,Sizing,Voters,Votes,$firebaseArray,$firebaseObject,VoteVersion,$log,$mdDialog,Alert,$timeout) {

	//our table of point values
	$scope.pointValues = Sizing;
	//the vote version
	$scope.version = VoteVersion.get();
	//list of voter's names
	$scope.voters = Voters;
	//set up this object so the watch doesn't error
	$scope.yourvote = {}
	$scope.yourvote.points = null;
	$scope.yourvote.id = null;
	$scope.youare = null;

	$scope.guessinggame = function(points,confidence){
		if($scope.youare == "new" || !$scope.youare){
			Alert('name');
		} else {
			//name is set, let's vote!
			$scope.yourvote.points = points;
			$scope.yourvote.confidence = confidence;
		}
	}

	$scope.addnewvoter = function(){
		$scope.voters.$add({name: $scope.newusername})
		.then(function(data){
			$scope.youare = $scope.newusername;
			$scope.newusername = "";
			Alert('newuser')
		})
		.catch(function(error){
			//$log.info(error);
		});
	}

	$scope.version.$loaded()
  		.then(function(data) {
  			//kick off the watch?
  			//am I doing this all wrong?
  			var initialversion = $scope.version.value;
			$scope.unwatchversion = $scope.version.$watch(function(){
				//just reset the yourvote object when a new version
				//is created by the admin
				if(initialversion == $scope.version.value){
					//just firing
				} else {
					$scope.yourvote.points = null;
					$scope.yourvote.id = null;
					Alert('newstory')
					$scope.stoploving();
				}
			})
  		})
  		.catch(function(error) {
    		//alert error
  		});

	$scope.$watchCollection('yourvote',function(newvote,oldvote){
		//watch for your vote
		var votes = Votes.voter();

		if($scope.yourvote.points == null){
			//don't do anything if votes are reset
			return false;
		}
		if (oldvote.points){
			if (oldvote.points!=newvote.points || oldvote.confidence!=newvote.confidence){
				//changed your vote, update firebase
				//get the previous id and new points with which to update firebase
				var id = oldvote.id,
					points = newvote.points,
					confidence = newvote.confidence;

				//get our previous vote
				votes.$loaded().then(function(data){
					var vote = votes.$getRecord(id);
					//update object
					vote.vote = points;
					vote.name = $scope.youare;
					vote.confidence = confidence;

					//update firebase
					votes.$save(vote).then(function(){
						//message to user "vote updated"
					}).catch(function(error){
						//send to alert service
					});
				}).catch(function(error){
					//send to alert service
				});
			}
		} else {
			if (newvote.points && $scope.youare){
				//fresh vote, add to firebase and save ref
				votes.$add({name: $scope.youare, vote: newvote.points, time: Firebase.ServerValue.TIMESTAMP, version: $scope.version.value, confidence: newvote.confidence, needsencouragement: "no"})
					.then(function(ref) {
						//message to user "vote saved"
	              		$scope.yourvote.id = ref.key();
	              		Alert('voted')

	              		//set up a watch on just that record so we can get love!
	              		//remember to unlove when voting is reset...
	              		$timeout(function(){
	              			var loveref = new Firebase("ADDURLHERE"+$scope.yourvote.id);
		              		$scope.lovedata = $firebaseObject(ref);
		              		$scope.stoploving = $scope.lovedata.$watch(function(){
		              			if($scope.lovedata.needsencouragement == "love"){
		              				//Alert("gotlove")
		              				DieALog($scope.lovedata.encourageurl,"love","You got some love!")
		              			}
		              			if($scope.lovedata.needsencouragement == "encouragement"){
		              				DieALog($scope.lovedata.encourageurl,"encouragement","You got some encouragement!")
		              			}
		              			if($scope.lovedata.needsencouragement == "shia"){
		              				DieALog($scope.lovedata.encourageurl,"shia","Just DO IT!")
		              			}
		              			//reset the field in Firebase
		              			if($scope.lovedata.needsencouragement){
		              				var votetoreset = $scope.lovedata;
									votetoreset.needsencouragement = '';
			              			$scope.lovedata.$save(votetoreset).then(function(){
			              				//$log.info("reset love marker")
			              			})
			              			.catch(function(){
			              				$log.info("failed to reset love marker")

			              			})
		              			}
		              		});
	              		}, 30);
	            	}).catch(function(error){
	            		//send to alert service
	            	});
			}
		}
	})

	$scope.$on('$destroy', function() {
      //deregister all watches
    });
})

.controller('adminCtrl', function(MarieKondo,RandomPic,Asdf,$scope,Sizing,VoteVersion,Votes,$firebaseArray,$log,$mdDialog,$animate,Alert,$timeout) {

	$scope.votesref = Votes.admin();
	$scope.version = VoteVersion.get();
	$scope.bigReveal = false;
	$scope.sizingTable = {  1:{hours: "8 or less", size: "S"},
                  		    2:{hours: "9-15", size: "S"},
                  			3:{hours: "16-22", size: "M"},
                  			4:{hours: "23-29", size: "M"},
                  			8:{hours: "30-35", size: "L"},
                  			13:{hours: "36-40", size: "L"},
                  			21:{hours: "41-60", size: "XL"},
                  			34:{hours: "61-80", size: "XL"}
              			};

	$scope.version.$loaded()
  		.then(function(data) {
  			//kick off the watch?
  			$scope.currentVotes = null;
  			$scope.showvotesandstuff.list()

  			$scope.unwatchversion = $scope.version.$watch(function() {
  					$scope.unwatchcurrentvotes()
  					$scope.currentVotes = "";
  					$scope.bigReveal = false;
  					$scope.leaderingly = "";
  					Alert('newstory')
  					$timeout(function(){
  						$scope.showvotesandstuff.list()
  						$scope.$apply()
  					}, 10);
  				//}
			});
  		})
  		.catch(function(error) {
    		//alert error
  	});

	$scope.resetVoting = function(){
		VoteVersion.new();
		//refetch vote version to retrigger $loaded above
		$timeout(function(){
			$scope.version = VoteVersion.get();
		}, 30);
	};
	
	$scope.showvotesandstuff = {
		list: function(){
			var ref = $scope.votesref;
			var query = ref.orderByChild("version").equalTo($scope.version.value);
			$scope.currentVotes = $firebaseArray(query);

			//set up watch to make the number appear above the thingamabob

			$scope.unwatchcurrentvotes = $scope.currentVotes.$watch(function(){
				var arraytodowhateverwith = [];

				for (var i = $scope.currentVotes.length - 1; i >= 0; i--) {
					arraytodowhateverwith.push($scope.currentVotes[i].vote)
				};
				//only send to this thing if there is 3 or more votes...or it barfs
				//if(arraytodowhateverwith.length>3){
					//var arrayedanddismayed = Asdf(arraytodowhateverwith);
					//$scope.leaderingly = Math.max.apply(Math, arraytodowhateverwith);
					$scope.leaderingly = MarieKondo(arraytodowhateverwith);
				//}
			})
		},
		encourage: function(id,kindof){
			var ref = $scope.votesref;
			var query = ref.orderByChild("version").equalTo($scope.version.value);
			var refref = $firebaseArray(query);

			refref.$loaded().then(function(data){
				var vote = refref.$getRecord(id);

				vote.needsencouragement = kindof;
				vote.encourageurl = RandomPic(kindof);

				refref.$save(vote).then(function(){
					//message to user "vote updated"
					Alert(kindof,vote.name,vote.encourageurl)
					//I think resetting these references helps?
					ref = '';
					query = '';
					refref = '';
				}).catch(function(error){
					//send to alert service
					$log.info("could not send encouragement")
				});
			})
			.catch(function(error) {
			//alert error
			});
		}
	};

	$scope.confstyle = function(input){
		if(input=="Low"){
			return "lowconf";
		}
		if(input=="Medium"){
			return "medconf";
		}
		if(input=="High"){
			return "highconf";
		}
	};

	$scope.$on('$destroy', function() {
      //deregister all watches
    });
})

.factory('Sizing', function(){
	var points = [{points: 1, hours: "8 or less", size: "S"},
                  {points: 2, hours: "9-15", size: "S"},
                  {points: 3, hours: "16-22", size: "M"},
                  {points: 4, hours: "23-29", size: "M"},
                  {points: 8, hours: "30-35", size: "L"},
                  {points: 13, hours: "36-40", size: "L"},
                  {points: 21, hours: "41-60", size: "XL"},
                  {points: 34, hours: "61-80", size: "XL"}];
    // return the array of points
	return points;
})

.factory('Voters', function($firebaseArray,$log){
	var ref = new Firebase("ADDURLHERE");

	return $firebaseArray(ref);
})

.factory('VoteVersion', function($firebaseObject,$log){

	var ref = new Firebase("ADDURLHERE");

	return {
		get: function(){
			//what is the current version
			return $firebaseObject(ref);
		},
		new: function(){
			//create a new version
			var timestamp = new Date().getTime(),
				current = $firebaseObject(ref);

			current.value = timestamp;

			current.$save().then(function(){
				//return the new version number
				return timestamp;
			}).catch(function(error){
				//display alert using our service, and loggly it
  				$log.info("New version error:", error);
			});
		}
	};
})

.factory('Votes', function($firebaseArray,$log){
	var ref = new Firebase("ADDURLHERE");
	return {
		voter: function(){
			var query = ref.orderByChild("time").limitToLast(10);
			return $firebaseArray(query) //query
		},
		admin: function(){
			//we will return the ref and then do the query at the controller
			return ref;
		}
	}
})

.factory('Alert', function($mdToast,$animate,$log){
	//make a loggly call if error
	//make a dialog if info
	return function(type,name,typeurl){

		var types = {
			'voted': 'Great job! Every vote counts.',
			'newstory': 'All votes have been reset.',
			'error': 'An error happened!',
			'name': 'Choose your name before voting. OK?',
			'love': 'You sent some love to '+ name +'!',
			'encouragement': 'You sent some encouragement to '+ name +'!',
			'shia': 'You sent some extreme motivation to '+name+'!',
			'gotlove': 'You got some love and encouragement!',
			'newuser': 'You added yourself. Oh my!',
			'gotbeer': 'You got some liquid encouragement!',
			'gotshia': 'You got some extreme encouragement!'
		};

		$mdToast.show($mdToast.simple()
		    .content(types[type])
		    .position('top right')
		    .hideDelay(3000)
		);

		//<md-toast><div layout="column"><div flex>You sent some love to '+ name +'!</div><div flex><img src="img/'+typeurl+'.jpg" width="150px"></div></div></md-toast>

		//controller: 'ToastCtrl',
		/*$mdToast.show({
      		template: types[type],
      		hideDelay: 3000,
      		position: 'top right'
    	});*/

		/*controller: function toastycontrol(name,typeurl){

		},*/

		//$log.info("encouragement sent")

	    /*_LTracker.push({
	      'app': 'AgilePoll',
	      'user': $rootScope.voterName || 'unknown',
	      'message': err,
	      'type': type,
	      'origin': orig
	    });*/
	};
})

.factory('Asdf', function(){
	//http://stackoverflow.com/questions/1053843/get-the-element-with-the-highest-occurrence-in-an-array
	return function(array){

		if (array.length == 0)
	        return null;
	    var modeMap = {},
	        maxCount = 1, 
	        //modes = [array[0]];
	        modes = [];

	    for(var i = 0; i < array.length; i++)
	    {
	        var el = array[i];

	        if (modeMap[el] == null)
	            modeMap[el] = 1;
	        else
	            modeMap[el]++;

	        if (modeMap[el] > maxCount)
	        {
	            modes = [el];
	            maxCount = modeMap[el];
	        }
	        else if (modeMap[el] == maxCount)
	        {
	            modes.push(el);
	            maxCount = modeMap[el];
	        }
	    }
	    return modes;
	};
})

.factory('DieALog', function($mdDialog,$window,$timeout,$log,$animate){
	return function(kindurl,kind,title){
		//var whichone = Math.floor((Math.random() * 7) + 1);

		var template = 	'<md-dialog aria-label="'+title+'">' +
           				'  <md-dialog-content>'+
           				'  <h3>'+title+'</h3>'+
           				'  <img src="img/'+ kindurl +'.jpg">'+
           				'  </md-dialog-content>' +
           				'  <div class="md-actions">' +
           				'    <md-button ng-click="closeDialog()" class="md-primary">' +
           				'      I feel better now...' +
           				'    </md-button>' +
           				'  </div>' +
           				'</md-dialog>';
		if (kind == "shia"){
			template = 	'<md-dialog aria-label="'+title+'"><md-dialog-content><h3>'+title+'</h3>'+
						'<video id="shiaviddiv" width="721" height="406" controls autoplay>'+
  						'<source src="img/shia_gray.mp4" type="video/mp4">'+
  						'<source src="img/shia_gray.webm" type="video/webm">'+
						'Your browser does not support the video tag. Bummer.'+
						'</video></md-dialog-content><div class="md-actions">'+
						'<md-button ng-click="closeDialog()" class="md-primary">'+
						'I am totally pumped now!</md-button></div></md-dialog>';
		}
		var alert = $mdDialog.alert({
			title: title,
			clickOutsideToClose: true,
			escapeToClose: true,
			template: template,
            controller: function DialogController($scope, $mdDialog) {
            	$scope.closeDialog = function() {
              		$mdDialog.hide();
            	}
          }
		});
		$mdDialog.show(alert)
		.then(function(){
			setTimeout(function() {
				var vidplayer = document.getElementById("shiaviddiv");
	            vidplayer.volume = 0.5;
			}, 30);
		})
		.finally(function() {
			alert = undefined;
        });
	}
})

.factory('RandomPic', function(){
	return function(type){
		var whichone = Math.floor((Math.random() * 7) + 1);

		return type+'_'+whichone;
	};
})

.factory('MarieKondo', function(){
	return function(array){
		//find the min,max and most frequent vote.
		//return as an object.
		//enjoy.
		var min = Math.min.apply(Math, array);
		var max = Math.max.apply(Math, array);
		var most;
		//var unique=array.filter(function(itm,i,a){
    	//	return i==a.indexOf(itm);
		//});

		//http://stackoverflow.com/questions/3783950/how-to-get-the-item-that-appear-the-most-time-in-an-array
		var frequency = {};  // array of frequency.
		var max = 0;  // holds the max frequency.
		for(var v in array) {
		        frequency[array[v]]=(frequency[array[v]] || 0)+1; // increment frequency.
		        if(frequency[array[v]] > max) { // is this frequency > max so far ?
		                max = frequency[array[v]];  // update max.
		                most = array[v];          // update result.
		        }
		}
		//Make this account for ties by using/storing max count per number
		
		var minmaxmost = {"min": min, "max": max, "most": most};

		return minmaxmost;
	};
})

.filter('confcolor',function(){
	return function(input){
		if(input=="low"){
			return "<span style='color: red;'>"+input+"</span>";
		}
		if(input=="medium"){
			return "<span style='color: yellow;'>"+input+"</span>";
		}
		if(input=="high"){
			return "<span style='color: green;'>"+input+"</span>";
		}
	}
});