jLiveTime
============

*jQuery plugin for live timestamps, countdowns, time-ago, and timers*

Features
----------------

- Support for dates, timestamps, countdowns, time-ago, or timers using the same mechanism
- Updates automatically, no performance-costly polling, content is updated only when needed
- Supports standard html5 format ```<time datetime="">```. A different attribute name can be used
- Specify multiple formats per-range to switch automatically between date, time, countdown, time-ago or any custom format using the same html
- Allows you to cache your html aggresively (it's completely independent of page generation time)
- Show time in local timezone
- Use different formatting for element html and tooltip
- Milliseconds accuracy
- To handles client clocks out of sync jLiveTime can perform an ajax request and use Date http response header. Server-to-Local offset is cached on sessionStorage (fallback to session cookie)
- jQuery event 'refreshComplete' allows you to add visual effects (check [DEMO](http://benjamine.github.com/jLiveTime/demo/demo.html))

-----
**[DEMO](http://benjamine.github.com/jLiveTime/demo/demo.html)**
-----
-----

Requirements
-----------------

- jQuery 1.8+

Supported Platforms
-----------------

Tested on IE8-9, Chrome, Firefox, Safari and Mobile Safari.

Unit testing is not implemented yet. You can try it on your browser visiting [DEMO](http://benjamine.github.com/jLiveTime/demo/demo.html)

Installation
-----------------

```
npm install jlivetime
```

Add a reference in your html to jlivetime.js (dev) or jlivetime.min.js (minified)

Usage
---------------

HTML

``` html

	<!-- standard html5 format -->
	<time datetime="2012-11-15T18:23:00.000Z" data-time-label data-time-tooltip>November 15, at 18:23 (GMT)</time>

	<!-- using div and timestamp in milliseconds -->
    <div datetime="1353003780000" data-time-label>November 15, at 18:23 (GMT)</time>

	<!-- using nested labels -->
    <time datetime="2012-11-15T18:23:00.000Z">
    	<span data-time-label="td_h"> hours <span data-time-label="d_m"> minutes
    </time>

```

JavaScript

``` javascript

    // activate jLiveTime in a container, will format and automatically update all datetimes inside
    $(document.body).livetime();

    // deactivate jLiveTime in a container (stop refreshing)
    $(document.body).livetime(false);

    // if new content is added (eg. ajax reload), to refresh immediately you can call .livetime() at any time
	$(document.body).livetime();

```

Formatting
----------------

### Timestamps

- Year: yyyy => 2012
- Month: M, MM, MMM, MMMM => 2, 02, Feb, February
- Day of Month: d, dd => 8, 08
- Weekday: e, ee, eee, eeee => 3, We, Wed, Wednesday
- Hours: h, hh, H, HH => 1, 01, 13, 13
- Minutes: m, mm => 9, 09
- Seconds: s, ss => 5, 05
- Milliseconds: f, ff, fff => 2, 02, 002
- am/pm: t, tt => p, pm

### Time Difference

To display time difference to current time (time elapsed, or time remaining) use ```d_``` prefix.

(Timestamp components and Time difference can be combined in one expression)

- d_s => seconds in difference (remaining or upcoming) from/to timestamp
- td_s => total seconds from/to timestamp
- d_fff => milliseconds in difference using 3 digits (add leading zeros)
- td_w => total months from/to timestamp

Years: y, Months: M, Weeks: w, Days: d, Hours: h, Minutes: m, Seconds: s, Milliseconds: f

This can be used to display countdowns, timers or time-ago labels.

Note: to escape words in a format expresion wrap it with brackes, eg. This [mm] is escaped, this mm is not => This mm is escaped, this 04 not

### Named formats

To avoid duplicating a format expression in all time elements you can create named formats.

``` javascript

	$.livetime.options.formats.shortDate = 'MMM d';
	$.livetime.options.formats.fullDate = 'eeee MMMM d yyyy';

```

Then you can use it like this:

``` html

	<time datetime="2012-11-15T18:23Z" data-time-label="#shortDate" data-time-tooltip="#fullDate"/>

```

When no format is specified _default and _default_tooltip formats are used.

### Per-range Named formats

Named formats can be specified using ranges, to switch format expression based on seconds from/to timestamp

``` javascript

    $.livetime.options.formats.humanized = [
        [-360*24*3600, '#fulldate'],
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
        ['#fulldate']
    ];

```

Events with Duration
----------------

You can add a duration to indicate an event has a duration, allowing you to use the end time (datetime + duration) in your format expression, example:

``` html

    <time datetime="2012-11-15T18:23:00.000Z" data-duration="600000" data-time-label="started td_s seconds ago, end_td_s seconds remaining" data-time-tooltip></time>

```

- data-duration attribute contains duration in milliseconds
- to use end time, add ```end_``` prefix to any format expression (end_ss, end_d_s, end_dt_s, etc.)

Format ranges can use the end time as reference to:

``` javascript

    $.livetime.options.formats.customwithduration = [
        [-20, '#fulldate'],
        [-5, 'will start in a few seconds'],
        [0, 'will start in less than 5 seconds'],
        ['end-5', 'playing (end_td_s seconds remaining)'],
        ['end', 'playing (about to finish)'],
        ['end+60', 'finished'],
        ['finished (end_td_m minutes ago)']
    ];

```

Sync with Server Time
----------------

Current time is calculated using client machine clock, if it's out of sync 
To prevent that you can use an ajax request to a non-cached url (eg. returning a 0 byte document) to sync with server time.
The offset will be cached using sessionStorage (fallback to a sesion cookie).

``` javascript

    $.livetime.options.serverTimeUrl = '/empty.txt';

```

Server time will be obtained from the http response Date header.

Minification
----------------

A minified version is provided as jlivetime.min.js
To regenerate that file run (npm i is required as uglifyjs is used):

```
	npm i
	npm run-script minify
```
