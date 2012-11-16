'use strict';
/*
* jLiveTime
*   jQuery plugin for live timestamps, countdowns, time-ago, and timers.
*/
(function($){

    var lt = $.livetime = $.livetime || {};
    lt.version = '0.0.2';

    lt.localTimeOffset = null;
    var options = lt.options = lt.options || {};
    options.datetimeSelector = '[datetime]';
    options.datetimeAttribute = 'datetime';
    options.dateLabelSelector = '[data-time-label]';
    options.triggerRefreshComplete = true;
    options.serverTimeUrl = null; //'empty.txt';
    options.formats = options.formats || {};
    options.formats.default = options.formats.default || [
        [-24*3600*30*11, 'yyyy MMMM d at H:mm'],
        [-24*3600*30, 'in td_M months d_d days, MMMM d at H:mm'],
        [-24*3600*7, 'in td_d days, MMMM d at H:mm'],
        [-24*3600*2, 'next eeee, MMMM d at H:mm'],
        [-2*3600, 'in td_h hours d_m minutes, today at H:mm'],
        [-60*5, 'in td_m minutes, at H:mm:ss'],
        [-60, 'in td_m minutes d_s seconds, at H:mm:ss'],
        [0, 'in td_s seconds, at H:mm:ss'],
        [60, 'td_s seconds ago, at H:mm:ss'],
        [60*5, 'td_m minutes d_s seconds ago, at H:mm:ss'],
        [2*3600, 'td_m minutes ago, at H:mm:ss'],
        [24*3600*2 , 'td_h hours d_m minutes ago, today at H:mm'],
        [24*3600*7 , 'last eeee, MMMM d at H:mm'],
        [24*3600*30, 'MMMM d at H:mm'],
        ['yyyy MMMM d at H:mm']
    ];
    options.formats.seconds = options.formats.seconds || [
        [0, 'in td_hh:d_mm:d_ss'],
        ['td_hh:d_mm:d_ss ago']
    ];
    options.formats.milliseconds = options.formats.milliseconds || [
        [0, 'in td_hh:d_mm:d_ss.d_fff'],
        ['td_hh:d_mm:d_ss.d_fff ago']
    ];
    options.formats.humanized = options.formats.humanized || [
        [-360*24*3600, 'MMMM d, yyyy'],
        [-6*24*3600, 'MMMM d at h:mm tt'],
        [- 48*3600, 'eeee at h:mm tt'],
        [-24*3600, 'Tomorrow at h:mm tt'],
        [-7200, 'in td_h hours'],
        [-3600, 'in about an hour'],
        [-120, 'in td_m minutes'],
        [-60, 'in about a minute'],
        [0, 'in a few seconds'],
        [60, 'a few seconds ago'],
        [120, 'about a minute ago'],
        [3600, 'td_m minutes ago'],
        [7200, 'about an hour ago'],
        [24*3600, 'td_h hours ago'],
        [48*3600, 'Yesterday at h:mm tt'],
        [6*24*3600, 'eeee at h:mm tt'],
        [360*24*3600, 'MMMM d at h:mm tt'],
        ['MMMM d, yyyy']
    ];
    options.formats.fulldate = options.formats.fulldate || 'eee MMM d yyyy at h:mm:ss tt';
    options.formats.shortdate = options.formats.shortdate || 'MMM d yyyy';
    options.formats.default_tooltip = options.formats.fulldate;
    options.formats.in = options.formats.in || [[0,'in'],['']];
    options.formats.remaining = options.formats.remaining || [[0,'remaining'],['']];
    options.formats.ago = options.formats.ago || [[0,''],['ago']];
    options.formats.elapsed = options.formats.elapsed || [[0,''],['elapsed']];

    var padLeft = function(num, digits) {
        if (digits < 2) {
            return num;
        }
        var str = num+'';
        while (str.length < digits) {
            str = '0' + str;
        }
        return str;
    };

    var timeUnits = {
        // years
        y: 1000 * 3600 * 24 * 365.25,
        // months
        M: 1000 * 3600 * 24 * 30,
        // weeks
        w: 1000 * 3600 * 24 * 7,
        // days (from month)
        d: 1000 * 3600 * 24,
        // days (from week)
        e: 1000 * 3600 * 24,
        // hours
        h: 1000 * 3600,
        // minutes
        m: 1000 * 60,
        // seconds
        s: 1000,
        // milliseconds
        f: 1,
    };

    var parentTimeUnits = {
        M: 'y',
        w: 'M',
        d: 'M',
        e: 'w',
        h: 'd',
        m: 'h',
        s: 'm',
        f: 's',
    };

    var unitNames = {
        M: ['January','February','March','April','May','June','July','August','September','October','November','December'],
        e: ['Sunday','Monday','Tuesday','Wednesday','Thursday','Friday','Saturday'],
    };

    var log = (window.console && typeof window.console.log == 'function') ?
            function(){ console.log.call(console, arguments); } :
            function(){};

    lt.now = function(){
        if (lt.localTimeOffset === null){
            // local time offset unknown yet
            lt.getLocalTimeOffset();
        }
        var localTimeOffset = lt.localTimeOffset || 0;
        var now = new Date();
        var nowUTC = now.getTime() - now.getTimezoneOffset()*60*1000 + localTimeOffset;
        return nowUTC;
    };

    lt.getLocalTimeOffset = function(){
        var cookieOffset, now, dateHeader, match, serverTime;

        if (!options.serverTimeUrl) {
            lt.localTimeOffset = 0;
            return;
        }

        if (!lt.localTimeOffsetRequested && (typeof lt.localTimeOffset == 'undefined' || lt.localTimeOffset === null)) {
            // get milliseconds of time diff between server and client. positive means client ahead
            lt.localTimeOffsetRequested = true;
            lt.localTimeOffset = 0;
            
            var storedOffset = null;
            if (window.sessionStorage) {
                storedOffset = window.sessionStorage.getItem('jlivetime-localtimeoffset');
            } else {
                storedOffset = /localtimeoffset=([0-9]+)[^0-9]?/i.exec(document.cookie)[1];
            }

            if (typeof storedOffset !='undefined' && storedOffset !== null) {
                lt.localTimeOffset = parseInt(storedOffset, 10);
            } else {
                // offset not obtained yet, calculate with an ajax request
                $.ajax({
                    url: options.serverTimeUrl,
                    method: 'jsonp',
                    cache: false,
                    success: function (data, status, req) {
                        // local time
                        now = new Date();
                        // try to get server time from response Date header
                        dateHeader = req.getResponseHeader('Date');
                        var serverTime = new Date(dateHeader);
                        // milliseconds of time diff between server and client.  positive means client ahead
                        lt.localTimeOffset = now.getTime() - serverTime.getTime();
                        // save offset for this browser session
                        if (window.sessionStorage) {
                            window.sessionStorage.setItem('jlivetime-localtimeoffset', lt.localTimeOffset);
                        } else {
                            document.cookie = 'localtimeoffset='+lt.localTimeOffset;
                        }
                        if (lt.localTimeOffset > 10000) {
                            log('WARNING: local time offset is ' + Math.round(lt.localTimeOffset  / 1000) + 's');
                        }
                    }
                });
            }
        }
    };

    lt.millisecondsFromNow = function(date){
        var ts = date;
        if (date instanceof Date){
            ts = (date.getTime() + date.getTimezoneOffset()*60*1000);
        }
        return lt.now() - ts;
    };

    lt.refresh = function(element) {

        var start = new Date().getTime();

        var root = $(element);
        root.addClass('jlivetime-active');

        // if there's a pending refresh, cancel it
        var timerTimeout = root.data('jlivetime-timeout');
        if (typeof timerTimeout !== 'undefined'){
            clearTimeout(timerTimeout);
        }

        var nextRefreshMs = 60000;
        var timestamps = root.find(options.datetimeSelector);
        if (root.is(options.datetimeSelector)) {
            timestamps = timestamps.add(root);
        }
        timestamps.each(function(){
            var tsNextRefreshMs = 60000;
            var tsElem = $(this);
            var tsString = tsElem.attr(options.datetimeAttribute);
            if (tsString) {
                var ts;
                try {
                    if (tsString.indexOf('-') > 0) {
                        var date = new Date(tsString);
                        ts = date.getTime() - date.getTimezoneOffset() * 60000;
                    } else {
                        ts = parseInt(tsString, 10);
                    }
                } catch (err) {
                    // error parsing timestamp
                    log('error parsing timestamp: '+err);
                    ts = 0;
                }
                if (ts > 0) {
                    var timeDiff = lt.millisecondsFromNow(ts);
                    tsElem.data('time-diff', timeDiff);
                    var labels = tsElem.find(options.dateLabelSelector);
                    if (tsElem.is(options.dateLabelSelector)) {
                        labels = labels.add(tsElem);
                    }
                    labels.each(function() {
                        var label = $(this);
                        var htmlChanged = false;
                        var tooltipChanged = false;
                        var formatResult = lt.format(ts, timeDiff, label.data('time-label') || '#default');
                        if (formatResult.value !== null && typeof formatResult.value !== 'undefined') {
                            if (label.html()!==formatResult.value) {
                                label.html(formatResult.value);
                                htmlChanged = true;
                            }
                        }
                        if (formatResult.nextRefreshMs) {
                            // next refresh detected when formatting (eg. when format rule will change)
                            tsNextRefreshMs = Math.min(tsNextRefreshMs, formatResult.nextRefreshMs);
                        }
                        if (typeof label.data('time-tooltip') !== 'undefined') {
                            formatResult = lt.format(ts, timeDiff, label.data('time-tooltip') || '#default_tooltip');
                            if (formatResult.value !== null && typeof formatResult.value !== 'undefined') {
                                if (label.attr('title') !== formatResult.value) {
                                    label.attr('title', formatResult.value);
                                    if (typeof label.attr('data-original-title') != 'undefined') {
                                        label.attr('data-original-title', formatResult.value);
                                    }
                                    tooltipChanged = true;
                                }
                            }
                            if (formatResult.nextRefreshMs) {
                                // next refresh detected when formatting (eg. when format rule will change)
                                tsNextRefreshMs = Math.min(tsNextRefreshMs, formatResult.nextRefreshMs);
                            }
                        }

                        if ((htmlChanged || tooltipChanged) && options.triggerRefreshComplete) {
                            label.trigger('refreshComplete', {
                                nextRefreshMs: tsNextRefreshMs,
                                htmlChanged: htmlChanged,
                                tooltipChanged: tooltipChanged,
                                refreshElapsedTime: new Date().getTime() - start
                            });
                        }
                    });
                    if (timeDiff < 0){
                        // refresh when time comes
                        tsNextRefreshMs = Math.min(tsNextRefreshMs, -timeDiff);
                    }
                    nextRefreshMs = Math.min(nextRefreshMs, tsNextRefreshMs);
                }
            }
            tsElem.data('jlivetime-nextrefresh',new Date().getTime()+nextRefreshMs);
        });
        nextRefreshMs = Math.max(nextRefreshMs, 65);

        // schedule the next refresh
        root.data('jlivetime-timeout', setTimeout(function(){
            lt.refresh(element);
        }, nextRefreshMs));
    };

    lt.disable = function(element) {
        var root = $(element);

        // if there's a pending refresh, cancel it
        var timerTimeout = root.data('jlivetime-timeout');
        if (typeof timerTimeout !== 'undefined'){
            clearTimeout(timerTimeout);
        }
        root.removeClass('jlivetime-active');
    };

    lt.formatPart = function(ts, timeDiff, format){
        if (format==='[]'){
            return {value: ''};
        }
        var match = /^(t?d_)?(([yMdewHhmsft])\3*)$/.exec(format);
        if (match) {
            if (!match[1]) {
                // regular date format
                var date = new Date(ts + new Date().getTimezoneOffset()*60*1000);
                switch (match[3]) {
                    case 'y':
                        return {
                            value: padLeft(date.getYear() + 1900, match[2].length)
                        };
                    case 'M':
                        // use name if length > 2
                        var month =  match[2].length > 2 ? unitNames.M[date.getMonth()] : padLeft(date.getMonth() + 1, match[2].length);
                        if (match[2].length === 3) {
                            month = month.slice(0,3);
                        }
                        return {
                            value: month
                        };
                    case 'w':
                        return {
                            value: padLeft(Math.floor(date.getDate() / 7) + 1, match[2].length)
                        };
                    case 'd':
                        return {
                            value: padLeft(date.getDate(), match[2].length)
                        };
                    case 'e':
                        // use name if length > 1
                        var weekday =  match[2].length > 1 ? unitNames.e[date.getDay()] : date.getDay() + 1;
                        if (match[2].length > 1 && match[2].length <= 3) {
                            weekday = weekday.slice(0,match[2].length);
                        }
                        return {
                            value: weekday
                        };
                    case 'h':
                        return {
                            value: padLeft(date.getHours() > 12 ? date.getHours() - 12 : date.getHours(), match[2].length)
                        };
                    case 'H':
                        return {
                            value: padLeft(date.getHours(), match[2].length)
                        };
                    case 'm':
                        return {
                            value: padLeft(date.getMinutes(), match[2].length)
                        };
                    case 's':
                        return {
                            value: padLeft(date.getSeconds(), match[2].length)
                        };
                    case 'f':
                        return {
                            value: padLeft(date.getMilliseconds(), match[2].length)
                        };
                    case 't':
                        var ampm = date.getHours() >= 12 ? 'pm' : 'am';
                        return {
                            value: match[2].length > 1 ? ampm : ampm.slice(0,1)
                        };
                }
            } else {
                var timeUnit = timeUnits[match[3]];
                if (timeUnit) {
                    var nextRefreshMs;
                    // time difference format
                    nextRefreshMs = Math.max(65, timeDiff > 0 ? timeUnit - timeDiff % timeUnit : -timeDiff % timeUnit);
                    if (match[1] == 'td_') {
                        // total in unit
                        return {
                            value: padLeft(Math.floor(Math.abs(timeDiff / timeUnit)), match[2].length),
                            nextRefreshMs: nextRefreshMs
                        };
                    } else if (match[1] == 'd_') {
                        var parentTimeUnit = timeUnits[parentTimeUnits[match[3]]];
                        return {
                            value: padLeft(Math.floor(Math.abs(parentTimeUnit ? timeDiff % parentTimeUnit : timeDiff) / timeUnit), match[2].length),
                            nextRefreshMs: nextRefreshMs
                        };
                    }
                }
            }
        }
        return {
            value: format
        };
    };

    lt.format = function(ts, timeDiff, format){
        var partRegex = /\[?([a-z_]+)\]?/gim;
        var value = [];
        var nextRefreshMs = 60000;
        var lastindex = 0;
        var fmt = format;

        if (format === null || format === 'null') {
            return {};
        }

        if (typeof format == 'string' && format.slice(0,1) === '#') {
            fmt = options.formats[format.slice(1)];
            if (typeof fmt == 'undefined') {
                throw new Error('time format not found: ' + format);
            }
        }
        if (fmt instanceof Array) {
            var fmtLength = fmt.length;
            for (var i=0; i< fmtLength; i++) {
                if (fmt[i].length === 1) {
                    fmt = fmt[i][0];
                    break;
                } else if (fmt[i][0]*1000 >= timeDiff) {
                    // refresh when format range changes
                    nextRefreshMs = Math.min(nextRefreshMs, fmt[i][0]*1000 - timeDiff);
                    fmt = fmt[i][1];
                    break;
                }
            }
            if (fmt instanceof Array) {
                fmt = '<unknown>';
            }
        }

        if (fmt === null || fmt === 'null') {
            return { nextRefreshMs: nextRefreshMs };
        }

        var match = partRegex.exec(fmt);
        while(match) {
            value.push(fmt.slice(lastindex, match.index));
            if (match[0].length != match[1].length){
                value.push(match[1]);
            }else{
                var formatPartResult = lt.formatPart(ts, timeDiff, match[0]);
                value.push(formatPartResult.value);
                if (formatPartResult.nextRefreshMs){
                    nextRefreshMs = Math.min(nextRefreshMs, formatPartResult.nextRefreshMs);
                }
            }
            lastindex = match.index + match[0].length;
            match = partRegex.exec(fmt);
        }
        value.push(fmt.slice(lastindex));

        return {
            value: value.join(''),
            nextRefreshMs: nextRefreshMs
        };
    };

    $.fn.livetime = function(enable){
        this.each(function(){
            if (enable === false) {
                lt.disable(this);
            } else {
                lt.refresh(this);
            }
        });
    };

})(jQuery);