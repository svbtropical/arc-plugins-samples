
arc.run(['$rootScope', function ($rootScope) {

   $rootScope.plugin("arcSanityCheck", "TM1 REST API Sanity Check", "page", {
      menu: "tools",
      icon: "fa-adjust",
      description: "This plugin can be used as a starting point for building new page plugins",
      author: "Cubewise",
      url: "https://github.com/cubewise-code/arc-plugins",
      version: "1.0.0"
   });

}]);


arc.directive("arcSanityCheck", function () {
   return {
      restrict: "EA",
      replace: true,
      scope: {
         instance: "=tm1Instance"
      },
      templateUrl: "__/plugins/rest-api-sanity-check/template.html",
      link: function ($scope, element, attrs) {

      },
      controller: ["$scope", "$rootScope", "$http", "$tm1", "$translate", "$timeout", "ngDialog", function ($scope, $rootScope, $http, $tm1, $translate, $timeout, ngDialog) {

         //Variables area
         $scope.defaults = {};
         $scope.selections = {};
         $scope.lists = {
            columns : [
               {desc: "#", align:"center"},
               {desc: ""},
               {desc: "Method", align:"center"},
               {desc: "Status Expected", align:"center"},
               {desc: "Status Result", align:"center"},
               {desc: "Query", align:"left"},
               {desc: "See Details", align:"center"},
               {desc: "Runtime", align:"center"}, 
            ],
         };

         $scope.methodsBadgeType = {
            "GET": "btn btn-success",
            "POST": "btn btn-primary",
            "PATCH": "btn btn-warning",
            "DELETE": "btn btn-danger"
         };
         
         $scope.checkedRequests = [];
         $scope.values = {};
         $scope.goodHttpStatus = [200, 201, 204];
         $scope.successesResult = 0;
         $scope.warningsResult = 0;
         $scope.errorsResult = 0;
         $scope.totalResult = 0;
         $scope.statusFilter = null;
         $scope.checkActivated= true;
         $scope.blank = "";
         $scope.isProcessing = false;
         $scope.globalRuntime = 0;
         executeQueriesIndex = 0;
         checkedItemsCount = 0;
         executedItemsCount = 0;

         
         // querys execution
         // dependent queries must be placed sequencially before not-dependent ones in request.json
         $scope.executeQueries = function() {
               $scope.requestPending = 1;
               $scope.resetStatusAll();
               executeQueries();           
         };

         var executeQueries = function (){
            /*requestPending set to 0 to disable the execution button
            we set globalRuntime to 0 to reset the global runtime*/
            //  $scope.requestPending = 0;
            $scope.globalRuntime = 0;
            var firstItem = $scope.checkedRequests[0];
            if (firstItem.isDependent) {
               executeOneQuery(firstItem);
            };
            if(executeQueriesIndex >= 0) {
               _.each($scope.checkedRequests, function(item) {
                  if(!item.isDependent) {
                  executeOneQuery(item)
                  };           
               });
            };
         };


         //running next query waiting for the current one to end
         var tryItem = function(item) {
            // item = $scope.requests[executeQueriesIndex]; 
            executeOneQuery(item);
         };

         //for those which are async/not-dependent:
         var executeOneQuery = function (item) {
            var nextItem = $scope.requests[item.index+1]; 
            if (!item.checked && nextItem != undefined) {
               executeOneQuery(nextItem);
            } else if (item.checked) {
               console.log(item.index);
               var sendDate = (new Date()).getTime();           
               var restApiQuery = "/" + item.query;
               var sendDate = (new Date()).getTime();
               $tm1.async($scope.instance, item.method, restApiQuery, item.body).then(function (result) {
                  item.executing = true;
                  item.statusResult = result.status;
                  if ($scope.goodHttpStatus.includes(result.status)) {
                     item.resultQuery = result.data;
                     item.message = null;
                     if( item.statusResult == item.statusCodeExpected){
                        item.icon = "fa-check-circle"
                        item.queryStatus = 'success';
                        console.info(result.data);
                     } else {
                        item.icon = "fa-exclamation-triangle"
                        item.queryStatus = 'warning';   
                        console.warn("%o warning info:", result.data);  
                     }
                  } else {
                     item.icon = "fa-thin fa-times";
                     item.queryStatus = 'failed';
                     item.resultQuery = result.data.error;
                     item.message = result.data.error.message;
                     console.error("%o error info:r", result.data);            
                  };

                  var receiveDate = (new Date()).getTime();
                  item.responseTimeMs = receiveDate - sendDate;
                  $scope.globalRuntime = $scope.globalRuntime + item.responseTimeMs;
                  item.wasExecuted = true;
                  item.executing = false;           
                  setResultsCount(item);
                  updateProgressBar();
                  tryToEnableButton();
                  if(item.isDependent && nextItem != undefined && nextItem.isDependent) {
                     tryItem(nextItem);
                  };
               });
            }
         };
            
         var tryToEnableButton = function() {
            if($scope.stepsDone == 100) {
               $scope.requestPending = 0;
            };
         };

         var updateProgressBar = function () {
            nbStepsDone++;
            $scope.stepsDone = Math.round(nbStepsDone / $scope.checkedRequests.length * 100);
            $scope.stepsDoneFormatted = $scope.stepsDone +"%";
         };

         //Functions
         //Set the count of successes, warnings and errors
         var setResultsCount = function(item) {
            if(item.queryStatus == "success") {
               $scope.successesResult++;
            } else if (item.queryStatus == "warning") {
               $scope.warningsResult++;
            } else if (item.queryStatus == "failed") {
               $scope.errorsResult++;
            };
         };

         //Resets the query status to the initial one
         var resetStatus = function(item) {
            // if (["success", "warning", "failed"].includes(item.queryStatus)) {
               if (item.queryStatus == "success") {
                  $scope.successesResult--;
               } else if (item.queryStatus == "warning") {
                  $scope.warningsResult--;
               } else if (item.queryStatus == "failed") {
                  $scope.errorsResult--;
               };
               item.queryStatus = null;
               item.icon = null;
               item.statusResult = null;
               item.wasExecuted = false;
         };

         $scope.resetStatusAll = function() {
            _.each($scope.requests, function(item) {
               resetStatus(item);
            });
            nbStepsDone = 0;
            $scope.globalRuntime = 0;
            executeQueriesIndex = 0;
            $scope.stepsDone = 0;
            $scope.stepsDoneFormatted = 0;
            
         };

         $scope.setStatusFilter = function(text) { 
            if($scope.statusFilter == text) {
               $scope.statusFilter = null;
            } else {
               $scope.statusFilter = text;
            };
         };

         //check - uncheck query items
         $scope.checkItem = function(item) {
            item.checked = true;
            $scope.checkedRequests = $scope.requests.filter(item => item.checked);
         };

         var checkAllItems = function() {
            _.each($scope.requests, function(item) {
               $scope.checkItem(item);
            });
         };


         $scope.uncheckItem = function(item) {
            item.checked = false;
            $scope.checkedRequests = $scope.requests.filter(item => item.checked);
         };

         var uncheckAllItems = function() {
            _.each($scope.requests, function(item) {
               $scope.uncheckItem(item);
            });
         };

         $scope.checkUncheckAll = function() {
            var uncheckedItems = $scope.requests.filter(item => !item.checked);
               if(uncheckedItems.length > 0)  {
                  checkAllItems();
                  $scope.checkActivated = true;
               } else {
                  uncheckAllItems();
                  $scope.checkActivated = false;
               };
            };


         //See Details PopUp
         $scope.seeDetails = function (item) {
            var dialog = ngDialog.open({
               className: "ngdialog-theme-default large",
               template: "__/plugins/rest-api-sanity-check/m-request-body.html",
               name: "Instances",
               scope: $scope,
               controller: ['$rootScope', '$scope', function ($rootScope, $scope) {
                  if (item.method == "POST") {
                     var itemBody = item.body;
                     if (JSON.stringify(itemBody).includes("MDX")) {
                        stringifiedMDX = JSON.stringify(itemBody.MDX).replace(",", ", \n").replace("ROWS", "ROWS \n").replace("WHERE", "\n WHERE").slice(1,-1);
                        $scope.resultBody = stringifiedMDX;
                        $scope.showBodyTabAsMDX = true;
                        $scope.bodyTitle = "MDX";
                     } else {
                        $scope.resultBody = itemBody;
                        console.debug($scope.resultBody);
                        $scope.showBodyTabAsMDX = false;
                        $scope.bodyTitle = "Body";
                     };
                  } else if (item.method == "GET" || item.method == "PATCH") {
                     if(item.resultQuery.value) {
                        for (let index = 0; index < item.resultQuery.value.length; index++) {
                           const element = item.resultQuery.value[index];
                           if (element.Rules != null) {
                              var shortenedRule = element.Rules.substring(0, 100) + "...";
                              element.Rules = shortenedRule;
                           };
                        };
                     } else if (item.resultQuery.Rules != null) {
                           const element = item.resultQuery;
                           if (element.Rules != null) {
                              var shortenedRule = element.Rules.substring(0, 100) + "...";
                              element.Rules = shortenedRule;
                           };
                     }; 
                  };

                  $scope.queryData = item;      
                  console.debug($scope.queryData);
                  $scope.itemMethod = item.method;
               }],
            });
         };

         $scope.editorLoaded = function (_editor) {
            // Initialise the editor settings
            _editor.setTheme($rootScope.uiPrefs.editorTheme);
            _editor.getSession().setMode("ace/mode/mdx");
            _editor.getSession().setOptions({ tabSize: $rootScope.uiPrefs.editorTabSpaces, useSoftTabs: true });
            _editor.$blockScrolling = Infinity;
            _editor.setFontSize($rootScope.uiPrefs.fontSize);
            _editor.setShowPrintMargin(false);
            _editor.getSession().setUseWrapMode($rootScope.uiPrefs.editorWrapLongLines);
         };

         var methodBadgeType = function(item) {
            var method = item.method;
            var badgeType = $scope.methodsBadgeType[method];
            item.badgeType = "badge " + badgeType + " d-inline-flex align-items-center text-left";
         };

         //loads the requests
         var loadSettingsFile = function () {
            $scope.requests = [];
            $scope.values.settingsFileJSONError = false;
            $http.get("__/plugins/rest-api-sanity-check/requests.json").then(function (result) {
               if (result.status === 200) {
                  $scope.values.settingFilesFound = true;
                  $scope.requests = result.data;            
                  checkAllItems();
                  for (let index = 0; index < $scope.requests.length; index++) {
                     const item = $scope.requests[index];
                     methodBadgeType(item);
                     item.index = index;
                     $scope.totalResult ++;
                  }
               } else {
                  $scope.values.settingFilesFound = false;
                  $scope.values.settingsFileErrorMessage = result.data;
               }
            }, function (error) {
               $scope.values.settingsFileJSONError = true;
            }
            );     
         };
          
         var init = function () {
            loadSettingsFile();
         };

         //Initial executions:
         init();
     
          
         //Trigger an event after the login screen
         $scope.$on("login-reload", function (event, args) {

         });

         
         //Reloads the page, not using it at the moment
         $scope.reload = function() {
               console.log("loading...");
               location.reload(true);
           };


         //Close the tab
         $scope.$on("close-tab", function (event, args) {
            // Event to capture when a user has clicked close on the tab
            if (args.page == "arcSanityCheck" && args.instance == $scope.instance && args.name == null) {
               // The page matches this one so close it
               $rootScope.close(args.page, { instance: $scope.instance });
            }
         });

         //Trigger an event after the plugin closes
         $scope.$on("$destroy", function (event) {

         });
      }]
   };
});