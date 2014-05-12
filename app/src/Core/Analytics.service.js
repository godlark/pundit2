angular.module('Pundit2.Core')
.constant('ANALYTICSDEFAULTS', {
    trackingCode: 'UA-50437894-1',
    globalTracker: '__gaPndtTracker',
    maxHits: 20, //Each web property starts with 20 hits that are replenished at a rate of 2 hit per second.
    bufferDelay: 1000,
    doTracking: true,
    debug: false
})
.service('Analytics', function(BaseComponent, $window, $document, $interval, $timeout, ANALYTICSDEFAULTS) {
    
    var analytics = new BaseComponent('Analytics', ANALYTICSDEFAULTS);

    var cache = {
        events: []
    };
    var numSent = 0;
    var isSendRunning = false;
    var isTimeRunning = false;
    var updateHitsTimer;
    var currentHits = analytics.options.maxHits;

    (function(i, s, o, g, r, a, m) {
        i.GoogleAnalyticsObject = r;
        i[r] = i[r] || function() {
            (i[r].q = i[r].q || []).push(arguments);
        };
        i[r].l = 1 * new Date();
        a = s.createElement(o);
        m = s.getElementsByTagName(o)[0];
        a.async = 1;
        a.src = g;
        a.onload = function() {
            analytics.log('GA async script loaded');
            ga = $window[analytics.options.globalTracker];
        };
        m.parentNode.insertBefore(a, m);
    })($window, $document[0], 'script', 'http://www.google-analytics.com/analytics.js', analytics.options.globalTracker); //TODO: rimuovere http: per versione finale

    var ga = $window[analytics.options.globalTracker];
    ga('create', analytics.options.trackingCode, {
        'storage': 'none', // no cookies
        'cookieDomain': 'none' // no domain
        // 'clientId' : getClientID() // custom id
    });
    ga('set', 'checkProtocolTask', function() {}); //HACK

    var updateHits = function() {
        if (currentHits >= analytics.options.maxHits){
            isTimeRunning = false;
            analytics.log(analytics.options.maxHits+' hits available again');
            return;
        }

        updateHitsTimer = $timeout(function() {
            currentHits = Math.min(currentHits+2, analytics.options.maxHits);
            //analytics.log('Hits: '+currentHits);
            updateHits();
            sendHits();
        }, analytics.options.bufferDelay);
    };

    var sendHits = function() {
        if (cache.events.length === 0){
            isSendRunning = false;
            return;
        }

        if (currentHits > 0){
            numSent++;
            var currentEvent = cache.events.shift();

            ga('send', {
                'hitType': 'event',
                'eventCategory': currentEvent.eventCategory,
                'eventAction': currentEvent.eventAction,
                'eventLabel': currentEvent.eventLabel,
                'eventValue': currentEvent.eventValue
            });
            currentHits--;
            
            if (!isTimeRunning){
                isTimeRunning = true;
                updateHits();
            }
            analytics.log('Tracked ('+numSent+' sent / '+currentHits+' available) event '+currentEvent.eventCategory+' ('+ currentEvent.eventAction +': '+ currentEvent.eventLabel +')');
            
            sendHits();
        }
    };

    analytics.getHits = function() {
        return currentHits;
    };

    analytics.track = function(category, action, label, value) {
        if (!analytics.options.doTracking){
            return;
        }
        if (!angular.isDefined(category) || !angular.isDefined(action)){
            analytics.err('Category and Action are required');
            return;
        }

        cache.events.push({
          'eventCategory': category,
          'eventAction': action,
          'eventLabel': label,
          'eventValue': value
        });

        if (!isSendRunning){
            isSendRunning = true;
            sendHits();
        }
    };

    analytics.log('Component running');
    return analytics;
});